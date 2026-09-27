-- Run analytics revamp: full per-run record (loadout, timeline, battles, item stats) on "Runs",
-- flattened read views, and aggregate RPCs for the dashboard.
-- Existing RLS on "Runs" (public insert, authenticated select) is kept; views and functions are
-- security invoker so they inherit it.

-- ---------------------------------------------------------------- columns

alter table public."Runs"
  add column if not exists run_uuid text,
  add column if not exists game_version text,
  add column if not exists outcome text,
  add column if not exists seed bigint,
  add column if not exists character_key text,
  add column if not exists final_floor integer,
  add column if not exists death_floor integer,
  add column if not exists death_enemies text,
  add column if not exists loadout jsonb,
  add column if not exists timeline jsonb,
  add column if not exists battles jsonb,
  add column if not exists item_stats jsonb;

-- One row per run: a run that died and was later "abandoned" from a stale save is rejected.
create unique index if not exists runs_run_uuid_key on public."Runs" (run_uuid) where run_uuid is not null;
create index if not exists runs_outcome_idx on public."Runs" (outcome);
create index if not exists runs_character_key_idx on public."Runs" (character_key);
create index if not exists runs_game_version_idx on public."Runs" (game_version);
create index if not exists runs_created_at_idx on public."Runs" (created_at);

update public."Runs"
set outcome = case when run_won then 'won' else 'died' end
where outcome is null and run_won is not null;

-- ---------------------------------------------------------------- views

create or replace view public.run_treasures with (security_invoker = true) as
select
  r.run_uuid, r.created_at, r.game_version, r.outcome, r.character_key, r.final_floor,
  t->>'key' as treasure_key,
  coalesce(t->>'source', 'unknown') as source,
  (t->>'floor')::numeric::int as acquired_floor,
  (t->>'node')::numeric::int as acquired_node,
  coalesce((t->>'triggers')::numeric::int, 0) as triggers
from public."Runs" r
cross join lateral jsonb_array_elements(coalesce(r.loadout->'treasures', '[]'::jsonb)) t
where r.run_uuid is not null;

create or replace view public.run_pieces with (security_invoker = true) as
select
  r.run_uuid, r.created_at, r.game_version, r.outcome, r.character_key, r.final_floor,
  p.piece_key, p.copies, p.avg_weight, p.min_weight, p.max_weight,
  coalesce((r.item_stats->'pieces'->p.piece_key->>'matched')::numeric::int, 0) as times_matched,
  coalesce((r.item_stats->'pieces'->p.piece_key->>'count_total')::numeric::int, 0) as pieces_matched
from public."Runs" r
cross join lateral (
  select
    e->>'key' as piece_key,
    count(*)::int as copies,
    round(avg((e->>'weight')::numeric), 2) as avg_weight,
    min((e->>'weight')::numeric) as min_weight,
    max((e->>'weight')::numeric) as max_weight
  from jsonb_array_elements(coalesce(r.loadout->'pieces', '[]'::jsonb)) e
  group by e->>'key'
) p
where r.run_uuid is not null;

create or replace view public.run_potions with (security_invoker = true) as
select
  r.run_uuid, r.created_at, r.game_version, r.outcome, r.character_key, r.final_floor,
  k.key as potion_key,
  coalesce((k.value->>'gained')::numeric::int, 0) as gained,
  coalesce((k.value->>'used')::numeric::int, 0) as used,
  coalesce((k.value->>'sold')::numeric::int, 0) as sold,
  coalesce((k.value->>'discarded')::numeric::int, 0) as discarded,
  (select count(*)::int
     from jsonb_array_elements_text(coalesce(r.loadout->'potions', '[]'::jsonb)) h
     where h = k.key) as held_at_end
from public."Runs" r
cross join lateral jsonb_each(coalesce(r.item_stats->'potions', '{}'::jsonb)) k
where r.run_uuid is not null;

create or replace view public.run_battles with (security_invoker = true) as
select
  r.run_uuid, r.created_at, r.game_version, r.outcome, r.character_key,
  (b->>'index')::numeric::int as battle_index,
  (b->>'floor')::numeric::int as floor,
  (b->>'node')::numeric::int as node,
  b->>'category' as category,
  b->>'name' as encounter_name,
  (select string_agg(x, ',') from jsonb_array_elements_text(coalesce(b->'enemies', '[]'::jsonb)) x) as enemies,
  b->>'result' as result,
  (b->>'hp_start')::numeric::int as hp_start,
  (b->>'hp_end')::numeric::int as hp_end,
  (b->>'max_hp_start')::numeric::int as max_hp_start,
  (b->>'turns')::numeric::int as turns,
  (b->>'damage_dealt')::numeric::int as damage_dealt,
  (b->>'damage_taken')::numeric::int as damage_taken,
  (b->>'max_hit')::numeric::int as max_hit,
  (b->>'max_combo')::numeric::int as max_combo,
  (b->>'swaps')::numeric::int as swaps,
  (b->>'queue_placements')::numeric::int as queue_placements,
  (b->>'rerolls')::numeric::int as rerolls,
  (b->>'kills')::numeric::int as kills,
  (b->>'death_prevented')::numeric::int as death_prevented,
  (b->>'duration')::numeric as duration,
  b->'matches' as matches,
  b->'abilities' as abilities,
  b->'potions' as potions
from public."Runs" r
cross join lateral jsonb_array_elements(coalesce(r.battles, '[]'::jsonb)) b
where r.run_uuid is not null;

create or replace view public.run_events with (security_invoker = true) as
select
  r.run_uuid, r.created_at, r.game_version, r.outcome, r.character_key,
  e.seq::int as seq,
  e.ev->>'type' as event_type,
  (e.ev->>'t')::numeric as t,
  (e.ev->>'floor')::numeric::int as floor,
  (e.ev->>'node')::numeric::int as node,
  e.ev->>'key' as item_key,
  e.ev->>'source' as source,
  e.ev as data
from public."Runs" r
cross join lateral jsonb_array_elements(coalesce(r.timeline, '[]'::jsonb)) with ordinality e(ev, seq)
where r.run_uuid is not null;

-- ---------------------------------------------------------------- RPC helpers

create or replace function public.runs_filtered(
  p_from timestamptz default null, p_to timestamptz default null, p_version text default null
) returns setof public."Runs"
language sql stable security invoker set search_path = '' as $$
  select * from public."Runs" r
  where r.run_uuid is not null
    and (p_from is null or r.created_at >= p_from)
    and (p_to is null or r.created_at < p_to)
    and (p_version is null or r.game_version = p_version)
$$;

-- Offered (reward screens), chosen (reward screens) and bought (shops) counts per item.
create or replace function public.item_offer_counts(
  p_from timestamptz default null, p_to timestamptz default null, p_version text default null
) returns table (item_kind text, item_key text, offered bigint, chosen bigint, bought bigint, buy_gold bigint)
language sql stable security invoker set search_path = '' as $$
  with ev as (
    select e
    from public.runs_filtered(p_from, p_to, p_version) r
    cross join lateral jsonb_array_elements(coalesce(r.timeline, '[]'::jsonb)) e
    where e->>'type' in ('reward_offered', 'reward_chosen', 'shop_buy')
  ),
  x as (
    select o->>'kind' as kind, o->>'key' as key, 1 as offered, 0 as chosen, 0 as bought, 0 as gold
    from ev cross join lateral jsonb_array_elements(coalesce(ev.e->'options', '[]'::jsonb)) o
    where ev.e->>'type' = 'reward_offered'
    union all
    select ev.e->'option'->>'kind', ev.e->'option'->>'key', 0, 1, 0, 0
    from ev where ev.e->>'type' = 'reward_chosen'
    union all
    select ev.e->>'kind', ev.e->>'key', 0, 0, 1, coalesce((ev.e->>'price')::numeric::int, 0)
    from ev where ev.e->>'type' = 'shop_buy'
  )
  select
    case when kind in ('new_piece', 'owned_weight', 'mystery_weight') then 'piece' else kind end,
    key, sum(offered), sum(chosen), sum(bought), sum(gold)
  from x
  where coalesce(key, '') <> ''
  group by 1, 2
$$;

-- ---------------------------------------------------------------- RPCs

create or replace function public.treasure_stats(
  p_from timestamptz default null, p_to timestamptz default null, p_version text default null
) returns table (
  treasure_key text, runs bigint, wins bigint, finished bigint, win_rate numeric,
  avg_final_floor numeric, avg_acquired_floor numeric, avg_triggers numeric,
  offered bigint, chosen bigint, bought bigint, pick_rate numeric, sources jsonb
)
language sql stable security invoker set search_path = '' as $$
  with r as (select * from public.runs_filtered(p_from, p_to, p_version)),
  held as (
    select
      r.run_uuid, r.outcome, r.final_floor,
      t->>'key' as key,
      (t->>'floor')::numeric as acquired_floor,
      coalesce((t->>'triggers')::numeric, 0) as triggers,
      coalesce(t->>'source', 'unknown') as source
    from r cross join lateral jsonb_array_elements(coalesce(r.loadout->'treasures', '[]'::jsonb)) t
  ),
  agg as (
    select key,
      count(distinct run_uuid) as runs,
      count(distinct run_uuid) filter (where outcome = 'won') as wins,
      count(distinct run_uuid) filter (where outcome in ('won', 'died')) as finished,
      avg(final_floor) as avg_final_floor,
      avg(acquired_floor) as avg_acquired_floor,
      avg(triggers) as avg_triggers
    from held group by key
  ),
  src as (
    select key, jsonb_object_agg(source, n) as sources
    from (select key, source, count(*) as n from held group by 1, 2) s
    group by key
  ),
  offers as (select * from public.item_offer_counts(p_from, p_to, p_version) where item_kind = 'treasure'),
  keys as (select key from agg union select item_key from offers)
  select
    k.key,
    coalesce(a.runs, 0), coalesce(a.wins, 0), coalesce(a.finished, 0),
    round(a.wins::numeric / nullif(a.finished, 0), 4),
    round(a.avg_final_floor, 2), round(a.avg_acquired_floor, 2), round(a.avg_triggers, 2),
    coalesce(o.offered, 0), coalesce(o.chosen, 0), coalesce(o.bought, 0),
    round(o.chosen::numeric / nullif(o.offered, 0), 4),
    coalesce(s.sources, '{}'::jsonb)
  from keys k
  left join agg a on a.key = k.key
  left join offers o on o.item_key = k.key
  left join src s on s.key = k.key
  order by coalesce(a.runs, 0) desc, k.key
$$;

create or replace function public.piece_stats(
  p_from timestamptz default null, p_to timestamptz default null, p_version text default null
) returns table (
  piece_key text, runs bigint, wins bigint, finished bigint, win_rate numeric,
  avg_copies numeric, avg_weight numeric, times_matched numeric, pieces_matched numeric,
  offered bigint, chosen bigint, bought bigint, pick_rate numeric
)
language sql stable security invoker set search_path = '' as $$
  with r as (select * from public.runs_filtered(p_from, p_to, p_version)),
  held as (
    select r.run_uuid, r.outcome, e->>'key' as key, count(*) as copies, avg((e->>'weight')::numeric) as avg_weight
    from r cross join lateral jsonb_array_elements(coalesce(r.loadout->'pieces', '[]'::jsonb)) e
    group by 1, 2, 3
  ),
  agg as (
    select key,
      count(*) as runs,
      count(*) filter (where outcome = 'won') as wins,
      count(*) filter (where outcome in ('won', 'died')) as finished,
      avg(copies) as avg_copies,
      avg(avg_weight) as avg_weight
    from held group by key
  ),
  matched as (
    select k.key,
      sum(coalesce((k.value->>'matched')::numeric, 0)) as times_matched,
      sum(coalesce((k.value->>'count_total')::numeric, 0)) as pieces_matched
    from r cross join lateral jsonb_each(coalesce(r.item_stats->'pieces', '{}'::jsonb)) k
    group by k.key
  ),
  offers as (select * from public.item_offer_counts(p_from, p_to, p_version) where item_kind = 'piece'),
  keys as (select key from agg union select key from matched union select item_key from offers)
  select
    k.key,
    coalesce(a.runs, 0), coalesce(a.wins, 0), coalesce(a.finished, 0),
    round(a.wins::numeric / nullif(a.finished, 0), 4),
    round(a.avg_copies, 2), round(a.avg_weight, 2),
    coalesce(m.times_matched, 0), coalesce(m.pieces_matched, 0),
    coalesce(o.offered, 0), coalesce(o.chosen, 0), coalesce(o.bought, 0),
    round(o.chosen::numeric / nullif(o.offered, 0), 4)
  from keys k
  left join agg a on a.key = k.key
  left join matched m on m.key = k.key
  left join offers o on o.item_key = k.key
  order by coalesce(a.runs, 0) desc, k.key
$$;

create or replace function public.potion_stats(
  p_from timestamptz default null, p_to timestamptz default null, p_version text default null
) returns table (
  potion_key text, runs bigint, gained numeric, used numeric, sold numeric, discarded numeric,
  use_rate numeric, runs_used bigint, win_rate_when_used numeric,
  offered bigint, chosen bigint, bought bigint
)
language sql stable security invoker set search_path = '' as $$
  with r as (select * from public.runs_filtered(p_from, p_to, p_version)),
  per_run as (
    select r.run_uuid, r.outcome, k.key,
      coalesce((k.value->>'gained')::numeric, 0) as gained,
      coalesce((k.value->>'used')::numeric, 0) as used,
      coalesce((k.value->>'sold')::numeric, 0) as sold,
      coalesce((k.value->>'discarded')::numeric, 0) as discarded
    from r cross join lateral jsonb_each(coalesce(r.item_stats->'potions', '{}'::jsonb)) k
  ),
  agg as (
    select key,
      count(*) as runs,
      sum(gained) as gained, sum(used) as used, sum(sold) as sold, sum(discarded) as discarded,
      count(*) filter (where used > 0) as runs_used,
      count(*) filter (where used > 0 and outcome = 'won') as wins_used,
      count(*) filter (where used > 0 and outcome in ('won', 'died')) as finished_used
    from per_run group by key
  ),
  offers as (select * from public.item_offer_counts(p_from, p_to, p_version) where item_kind = 'potion'),
  keys as (select key from agg union select item_key from offers)
  select
    k.key,
    coalesce(a.runs, 0),
    coalesce(a.gained, 0), coalesce(a.used, 0), coalesce(a.sold, 0), coalesce(a.discarded, 0),
    round(a.used / nullif(a.gained, 0), 4),
    coalesce(a.runs_used, 0),
    round(a.wins_used::numeric / nullif(a.finished_used, 0), 4),
    coalesce(o.offered, 0), coalesce(o.chosen, 0), coalesce(o.bought, 0)
  from keys k
  left join agg a on a.key = k.key
  left join offers o on o.item_key = k.key
  order by coalesce(a.runs, 0) desc, k.key
$$;

create or replace function public.ability_stats(
  p_from timestamptz default null, p_to timestamptz default null, p_version text default null
) returns table (
  ability_key text, runs_held bigint, runs_used bigint, usage_rate numeric,
  total_uses numeric, avg_uses_per_run numeric, win_rate_when_used numeric
)
language sql stable security invoker set search_path = '' as $$
  with r as (select * from public.runs_filtered(p_from, p_to, p_version)),
  used as (
    select r.run_uuid, r.outcome, k.key, coalesce((k.value->>'used')::numeric, 0) as uses
    from r cross join lateral jsonb_each(coalesce(r.item_stats->'abilities', '{}'::jsonb)) k
  ),
  held as (
    select distinct r.run_uuid, t->>'key' as key
    from r cross join lateral jsonb_array_elements(coalesce(r.loadout->'treasures', '[]'::jsonb)) t
    where t->>'key' in (select key from used)
  ),
  agg as (
    select key,
      count(*) filter (where uses > 0) as runs_used,
      sum(uses) as total_uses,
      count(*) filter (where uses > 0 and outcome = 'won') as wins,
      count(*) filter (where uses > 0 and outcome in ('won', 'died')) as finished
    from used group by key
  ),
  held_agg as (select key, count(*) as runs_held from held group by key)
  select
    a.key,
    coalesce(h.runs_held, 0),
    a.runs_used,
    round(a.runs_used::numeric / nullif(h.runs_held, 0), 4),
    a.total_uses,
    round(a.total_uses / nullif(a.runs_used, 0), 2),
    round(a.wins::numeric / nullif(a.finished, 0), 4)
  from agg a
  left join held_agg h on h.key = a.key
  order by a.total_uses desc, a.key
$$;

create or replace function public.character_stats(
  p_from timestamptz default null, p_to timestamptz default null, p_version text default null
) returns table (
  character_key text, runs bigint, wins bigint, deaths bigint, abandoned bigint, win_rate numeric,
  avg_final_floor numeric, avg_play_time_seconds numeric, avg_battles numeric, avg_treasures numeric
)
language sql stable security invoker set search_path = '' as $$
  select
    coalesce(nullif(r.character_key, ''), 'unknown'),
    count(*),
    count(*) filter (where r.outcome = 'won'),
    count(*) filter (where r.outcome = 'died'),
    count(*) filter (where r.outcome = 'abandoned'),
    round(count(*) filter (where r.outcome = 'won')::numeric
      / nullif(count(*) filter (where r.outcome in ('won', 'died')), 0), 4),
    round(avg(r.final_floor), 2),
    round(avg(r.play_time_seconds), 0),
    round(avg(jsonb_array_length(coalesce(r.battles, '[]'::jsonb))), 2),
    round(avg(jsonb_array_length(coalesce(r.loadout->'treasures', '[]'::jsonb))), 2)
  from public.runs_filtered(p_from, p_to, p_version) r
  group by 1
  order by 2 desc
$$;

create or replace function public.death_stats(
  p_from timestamptz default null, p_to timestamptz default null, p_version text default null
) returns table (
  death_floor integer, death_enemies text, deaths bigint,
  avg_turns numeric, avg_damage_taken numeric, avg_hp_start numeric, avg_max_hp numeric
)
language sql stable security invoker set search_path = '' as $$
  select
    r.death_floor,
    coalesce(nullif(r.death_enemies, ''), 'unknown'),
    count(*),
    round(avg(((r.battles -> -1)->>'turns')::numeric), 2),
    round(avg(((r.battles -> -1)->>'damage_taken')::numeric), 2),
    round(avg(((r.battles -> -1)->>'hp_start')::numeric), 2),
    round(avg(((r.battles -> -1)->>'max_hp_start')::numeric), 2)
  from public.runs_filtered(p_from, p_to, p_version) r
  where r.outcome = 'died'
  group by 1, 2
  order by 3 desc
$$;

-- category: shop_buy / shop_reroll / shop_trash / shop_upgrade / reward_gold (value = gold),
-- or "total" with item_kind = RunRecorder totals key (value = per-run total).
create or replace function public.economy_stats(
  p_from timestamptz default null, p_to timestamptz default null, p_version text default null
) returns table (category text, item_kind text, events bigint, runs bigint, total_value numeric, avg_value numeric)
language sql stable security invoker set search_path = '' as $$
  with r as (select * from public.runs_filtered(p_from, p_to, p_version)),
  x as (
    select e->>'type' as category, coalesce(e->>'kind', '') as item_kind, r.run_uuid,
      coalesce((e->>'price')::numeric, (e->>'amount')::numeric, 0) as value
    from r cross join lateral jsonb_array_elements(coalesce(r.timeline, '[]'::jsonb)) e
    where e->>'type' in ('shop_buy', 'shop_reroll', 'shop_trash', 'shop_upgrade', 'reward_gold')
    union all
    select 'total', t.key, r.run_uuid, t.value::numeric
    from r cross join lateral jsonb_each_text(coalesce(r.item_stats->'totals', '{}'::jsonb)) t
  )
  select category, item_kind, count(*), count(distinct run_uuid), round(sum(value), 0), round(avg(value), 2)
  from x
  group by 1, 2
  order by 1, 2
$$;

-- ---------------------------------------------------------------- grants

revoke all on public.run_treasures, public.run_pieces, public.run_potions, public.run_battles, public.run_events from anon;
grant select on public.run_treasures, public.run_pieces, public.run_potions, public.run_battles, public.run_events to authenticated;

revoke execute on function
  public.runs_filtered(timestamptz, timestamptz, text),
  public.item_offer_counts(timestamptz, timestamptz, text),
  public.treasure_stats(timestamptz, timestamptz, text),
  public.piece_stats(timestamptz, timestamptz, text),
  public.potion_stats(timestamptz, timestamptz, text),
  public.ability_stats(timestamptz, timestamptz, text),
  public.character_stats(timestamptz, timestamptz, text),
  public.death_stats(timestamptz, timestamptz, text),
  public.economy_stats(timestamptz, timestamptz, text)
from public, anon;

grant execute on function
  public.runs_filtered(timestamptz, timestamptz, text),
  public.item_offer_counts(timestamptz, timestamptz, text),
  public.treasure_stats(timestamptz, timestamptz, text),
  public.piece_stats(timestamptz, timestamptz, text),
  public.potion_stats(timestamptz, timestamptz, text),
  public.ability_stats(timestamptz, timestamptz, text),
  public.character_stats(timestamptz, timestamptz, text),
  public.death_stats(timestamptz, timestamptz, text),
  public.economy_stats(timestamptz, timestamptz, text)
to authenticated;
