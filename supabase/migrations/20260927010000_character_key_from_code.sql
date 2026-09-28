-- Map the legacy "Runs".character_used codes to character keys.
-- Current builds send 1/2/3 (Analytics._character_used_code); older builds sent Julia's hash() of the key.

create or replace function public.character_key_from_code(p_code text)
returns text
language sql immutable set search_path = '' as $$
  select case p_code
    when '1' then 'CHARACTER_MAGICIAN'
    when '17481338408904680378' then 'CHARACTER_MAGICIAN'
    when '2' then 'CHARACTER_DEMOLITIONIST'
    when '3810549805878297332' then 'CHARACTER_DEMOLITIONIST'
    when '3' then 'CHARACTER_KNIGHT'
    when '7518026746827318042' then 'CHARACTER_KNIGHT'
  end
$$;

update public."Runs"
set character_key = public.character_key_from_code(character_used)
where character_key is null and character_used is not null;

-- Rows sent without the run recorder payload still get a readable character.
create or replace function public.runs_fill_character_key()
returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.character_key is null or new.character_key = '' then
    new.character_key := public.character_key_from_code(new.character_used);
  end if;
  return new;
end
$$;

drop trigger if exists runs_fill_character_key on public."Runs";
create trigger runs_fill_character_key
  before insert on public."Runs"
  for each row execute function public.runs_fill_character_key();

revoke execute on function public.runs_fill_character_key() from public, anon, authenticated;
