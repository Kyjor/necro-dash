import type { RunTimelineEvent } from '../types/analytics';
import { formatDuration, prettyKey } from './runFormat';

export type NodeCategory = 'battle' | 'elite' | 'boss' | 'shop' | 'rest' | 'treasure' | 'event' | 'node';

export interface TimelineFact {
  label: string;
  value: string;
}

export interface TimelineGroup {
  title: string;
  items: string[];
}

export interface TimelineAction {
  time: string;
  title: string;
  lines: string[];
  facts: TimelineFact[];
  groups: TimelineGroup[];
  tone: 'neutral' | 'good' | 'bad';
}

export interface MapNodeVisit {
  id: string;
  floor: number;
  node: number;
  order: number;
  category: NodeCategory;
  typeLabel: string;
  title: string;
  summary: string;
  outcome: 'won' | 'lost' | null;
  timeLabel: string;
  spanLabel: string;
  actions: TimelineAction[];
}

export interface TimelineFloor {
  floor: number;
  timeLabel: string;
  nodes: MapNodeVisit[];
}

export interface TimelinePath {
  character: string | null;
  startChoices: string[];
  floors: TimelineFloor[];
  nodes: MapNodeVisit[];
}

const CATEGORY_LABEL: Record<NodeCategory, string> = {
  battle: 'Battle',
  elite: 'Elite',
  boss: 'Boss',
  shop: 'Shop',
  rest: 'Rest',
  treasure: 'Treasure',
  event: 'Event',
  node: 'Node',
};

const SKIP_FIELDS = new Set(['type', 't', 'floor', 'node', 'character', 'character_key']);

interface BuiltAction extends TimelineAction {
  digest: string | null;
  priceNote: string | null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function asString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isEmpty(value: unknown): boolean {
  if (value == null || value === '') return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value as object).length === 0;
  return false;
}

function prettyCountKey(key: string): string {
  return prettyKey(key.replace(/^ABILITY_/, ''));
}

function displayString(value: string): string {
  if (/^-?\d+(\.\d+)?$/.test(value)) return value;
  if (value.includes(' ')) return value;
  return prettyKey(value);
}

function labelOf(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? displayString(trimmed) : null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const named =
    asString(record.key) ??
    asString(record.name) ??
    asString(record.id) ??
    asString(record.choice) ??
    asString(record.label) ??
    asString(record.text);
  if (named) return displayString(named);
  const typed = asString(record.node_type) ?? asString(record.type) ?? asString(record.kind);
  return typed ? prettyKey(typed) : null;
}

function labelsOf(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(labelOf).filter((label): label is string => !!label);
  }
  if (value && typeof value === 'object') {
    const direct = labelOf(value);
    if (direct && asString((value as Record<string, unknown>).key)) return [direct];
    if (direct && (asString((value as Record<string, unknown>).name) || asString((value as Record<string, unknown>).label))) {
      return [direct];
    }
    return Object.entries(value as Record<string, unknown>).flatMap(([key, inner]) => {
      const label = labelOf(inner);
      return label ? [`${prettyKey(key)}: ${label}`] : [];
    });
  }
  const single = labelOf(value);
  return single ? [single] : [];
}

function countGroup(title: string, value: unknown): TimelineGroup | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const items = Object.entries(value as Record<string, unknown>).flatMap(([key, inner]) => {
    if (typeof inner === 'number') return [`${prettyCountKey(key)} ×${inner}`];
    if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
      const record = inner as Record<string, unknown>;
      if (typeof record.times === 'number') {
        const pieces = typeof record.count === 'number' ? `, ${record.count} pieces` : '';
        return [`${prettyCountKey(key)} ×${record.times}${pieces}`];
      }
    }
    return [];
  });
  return items.length > 0 ? { title, items } : null;
}

function battleKind(category: string | null): string | null {
  if (!category) return null;
  const fought = nodeCategory(category);
  if (fought === 'elite' || fought === 'boss') return category;
  if (fought === 'battle' || ['normal', 'regular', 'standard', 'basic'].includes(category.toLowerCase())) return 'battle';
  return null;
}

export function nodeCategory(raw: string): NodeCategory {
  const type = raw.toLowerCase();
  if (type.includes('boss')) return 'boss';
  if (type.includes('elite')) return 'elite';
  if (/(battle|combat|fight|enemy|monster)/.test(type)) return 'battle';
  if (/(shop|store|merchant)/.test(type)) return 'shop';
  if (/(rest|camp|bonfire|heal)/.test(type)) return 'rest';
  if (/(treasure|relic|chest|reward)/.test(type)) return 'treasure';
  if (/(event|mystery|happening)/.test(type)) return 'event';
  return 'node';
}

function fact(label: string, value: string | number | null | undefined): TimelineFact | null {
  if (value === null || value === undefined || value === '') return null;
  return { label, value: String(value) };
}

function nonzero(value: unknown): number | null {
  const n = asNumber(value);
  return n ? n : null;
}

function battleOutcome(result: string): { title: string; tone: TimelineAction['tone']; outcome: 'won' | 'lost' | null } {
  const normalized = result.toLowerCase();
  if (['win', 'won', 'victory'].includes(normalized)) return { title: 'Won', tone: 'good', outcome: 'won' };
  if (['loss', 'lost', 'dead', 'died', 'defeat'].includes(normalized)) return { title: 'Lost', tone: 'bad', outcome: 'lost' };
  if (!result) return { title: 'Battle ended', tone: 'neutral', outcome: null };
  return { title: prettyKey(result), tone: 'neutral', outcome: null };
}

function chosenName(event: RunTimelineEvent): string | null {
  return labelOf(event.option) ?? labelOf(event.key) ?? labelOf(event.item) ?? labelOf(event.choice);
}

function priceOf(event: RunTimelineEvent): number | null {
  return asNumber(event.price) ?? asNumber(event.cost);
}

function kindLabel(kind: string | null): string | null {
  if (!kind) return null;
  const pretty = prettyKey(kind);
  if (pretty === 'New Piece' || pretty === 'Owned Weight' || pretty === 'Mystery Weight') return 'Piece';
  return pretty;
}

function offerTitle(kind: string | null): string {
  const label = kindLabel(kind);
  if (!label || label === 'Gold') return label === 'Gold' ? 'Gold offered' : 'Reward offered';
  if (label.endsWith('s')) return `${label} offered`;
  return `${label}s offered`;
}

function optionKind(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return asString((value as Record<string, unknown>).kind);
}

function presentEnter(event: RunTimelineEvent): BuiltAction | null {
  const choices = labelsOf(event.options ?? event.choices ?? event.paths);
  if (choices.length === 0) return null;
  return {
    time: formatDuration(asNumber(event.t)),
    title: 'Map choices',
    lines: [],
    facts: [],
    groups: [{ title: 'Available', items: choices }],
    tone: 'neutral',
    digest: null,
    priceNote: null,
  };
}

function presentBattleEnd(event: RunTimelineEvent): BuiltAction {
  const outcome = battleOutcome(asString(event.result) ?? '');
  const hpStart = asNumber(event.hp_start);
  const hpEnd = asNumber(event.hp_end);
  const hp = hpStart !== null ? `${hpStart} → ${hpEnd ?? '?'}` : null;
  const maxStart = asNumber(event.max_hp_start);
  const maxEnd = asNumber(event.max_hp_end);
  const maxHp = maxStart !== null && maxEnd !== null && maxStart !== maxEnd ? `${maxStart} → ${maxEnd}` : null;
  const turns = asNumber(event.turns);
  const shield = asNumber(event.shield_start);
  const duration = asNumber(event.duration);
  const facts = [
    fact('HP', hp),
    fact('Max HP', maxHp),
    fact('Turns', turns),
    fact('Length', duration !== null ? formatDuration(duration) : null),
    fact('Dealt', asNumber(event.damage_dealt)),
    fact('Taken', asNumber(event.damage_taken)),
    fact('Max hit', nonzero(event.max_hit)),
    fact('Max combo', nonzero(event.max_combo)),
    fact('Swaps', nonzero(event.swaps)),
    fact('Queued', nonzero(event.queue_placements)),
    fact('Rerolls', nonzero(event.rerolls)),
    fact('Kills', nonzero(event.kills)),
    fact('Deaths prevented', nonzero(event.death_prevented)),
    fact('Shield', shield && shield > 0 ? shield : null),
  ].filter((item): item is TimelineFact => item !== null);
  const groups = [
    countGroup('Matches', event.matches),
    countGroup('Abilities', event.abilities),
    countGroup('Potions', event.potions),
  ].filter((item): item is TimelineGroup => item !== null);
  const digestParts = [outcome.title];
  if (hp) digestParts.push(`HP ${hp}`);
  if (turns !== null) digestParts.push(`${turns} turns`);
  return {
    time: formatDuration(asNumber(event.t)),
    title: outcome.title,
    lines: [],
    facts,
    groups,
    tone: outcome.tone,
    digest: digestParts.join(' · '),
    priceNote: null,
  };
}

function presentShop(event: RunTimelineEvent, verb: string): BuiltAction {
  const name = labelOf(event.key) ?? labelOf(event.item) ?? labelOf(event.option);
  const price = priceOf(event);
  const kind = kindLabel(asString(event.kind));
  const detail = [kind, price !== null ? `${price} gold` : null].filter((part): part is string => !!part);
  const title = name ? `${verb} ${name}` : verb;
  const digest = name && price !== null ? `${verb} ${name} for ${price} gold` : title;
  return {
    time: formatDuration(asNumber(event.t)),
    title,
    lines: detail.length > 0 ? [detail.join(' · ')] : [],
    facts: [],
    groups: [],
    tone: 'neutral',
    digest,
    priceNote: price !== null ? `${price} gold` : null,
  };
}

function presentFallback(event: RunTimelineEvent): BuiltAction {
  const title = prettyKey(event.type || 'event');
  const facts: TimelineFact[] = [];
  const groups: TimelineGroup[] = [];
  for (const [key, value] of Object.entries(event)) {
    if (SKIP_FIELDS.has(key) || isEmpty(value)) continue;
    if (typeof value === 'boolean') {
      if (value) facts.push({ label: prettyKey(key), value: 'Yes' });
      continue;
    }
    if (typeof value === 'string' || typeof value === 'number') {
      facts.push({ label: prettyKey(key), value: displayString(String(value)) });
      continue;
    }
    const counted = countGroup(prettyKey(key), value);
    if (counted) {
      groups.push(counted);
      continue;
    }
    const names = labelsOf(value);
    if (names.length > 1) groups.push({ title: prettyKey(key), items: names });
    else if (names.length === 1) facts.push({ label: prettyKey(key), value: names[0] });
  }
  return {
    time: formatDuration(asNumber(event.t)),
    title,
    lines: [],
    facts,
    groups,
    tone: 'neutral',
    digest: title,
    priceNote: null,
  };
}

function presentEvent(event: RunTimelineEvent): BuiltAction | null {
  switch (event.type) {
    case 'node_enter':
      return presentEnter(event);
    case 'reward_offered': {
      const names = labelsOf(event.options ?? event.choices);
      const kind = asString(event.kind);
      const listed = names.slice(0, 3).join(', ');
      return {
        time: formatDuration(asNumber(event.t)),
        title: offerTitle(kind),
        lines: [],
        facts: [],
        groups: names.length > 0 ? [{ title: 'Choices', items: names }] : [],
        tone: 'neutral',
        digest: listed ? `Offered ${listed}` : null,
        priceNote: null,
      };
    }
    case 'reward_chosen':
    case 'event_choice':
    case 'event_chosen': {
      const name = chosenName(event);
      const title = name ? `Chose ${name}` : 'Made a choice';
      const kind = kindLabel(asString(event.kind) ?? optionKind(event.option));
      return {
        time: formatDuration(asNumber(event.t)),
        title,
        lines: kind ? [kind] : [],
        facts: [],
        groups: [],
        tone: 'neutral',
        digest: title,
        priceNote: null,
      };
    }
    case 'reward_gold':
    case 'gold_gained': {
      const amount = asNumber(event.amount) ?? asNumber(event.gold);
      const title = amount !== null ? `Gained ${amount} gold` : 'Gained gold';
      return {
        time: formatDuration(asNumber(event.t)),
        title,
        lines: [],
        facts: [],
        groups: [],
        tone: 'neutral',
        digest: title,
        priceNote: null,
      };
    }
    case 'battle_start': {
      const enemies = labelsOf(event.enemies);
      const category = asString(event.category);
      const showCategory = category && !['normal', 'regular', 'standard', 'battle'].includes(category.toLowerCase());
      return {
        time: formatDuration(asNumber(event.t)),
        title: 'Fight started',
        lines: showCategory ? [prettyKey(category)] : [],
        facts: [],
        groups: enemies.length > 0 ? [{ title: 'Enemies', items: enemies }] : [],
        tone: 'neutral',
        digest: null,
        priceNote: null,
      };
    }
    case 'battle_end':
      return presentBattleEnd(event);
    case 'shop_buy':
      return presentShop(event, 'Bought');
    case 'shop_upgrade':
      return presentShop(event, 'Upgraded');
    case 'shop_trash':
      return presentShop(event, 'Removed');
    case 'shop_reroll': {
      const price = priceOf(event) ?? asNumber(event.amount);
      return {
        time: formatDuration(asNumber(event.t)),
        title: 'Rerolled the shop',
        lines: price !== null ? [`${price} gold`] : [],
        facts: [],
        groups: [],
        tone: 'neutral',
        digest: price !== null ? `Rerolled for ${price} gold` : 'Rerolled',
        priceNote: price !== null ? `${price} gold` : null,
      };
    }
    case 'potion_used':
    case 'ability_used': {
      const name = labelOf(event.key) ?? labelOf(event.potion) ?? labelOf(event.ability);
      const verb = event.type === 'potion_used' ? 'Used' : 'Cast';
      const title = name ? `${verb} ${name}` : prettyKey(event.type);
      return {
        time: formatDuration(asNumber(event.t)),
        title,
        lines: [],
        facts: [],
        groups: [],
        tone: 'neutral',
        digest: title,
        priceNote: null,
      };
    }
    default:
      return presentFallback(event);
  }
}

function explicitType(events: RunTimelineEvent[]): string | null {
  const enter = events.find(event => event.type === 'node_enter');
  const fromEnter = asString(enter?.node_type) ?? asString(enter?.kind) ?? asString(enter?.room_type);
  const battle = events.find(event => event.type === 'battle_start');
  const category = asString(battle?.category);
  const fought = battleKind(category);
  if (fromEnter && fought && nodeCategory(fromEnter) === 'battle' && (nodeCategory(fought) === 'elite' || nodeCategory(fought) === 'boss')) {
    return fought;
  }
  if (fromEnter) return fromEnter;
  if (events.some(event => event.type.startsWith('shop_'))) return 'shop';
  if (fought) return fought;
  if (events.some(event => event.type === 'battle_start' || event.type === 'battle_end')) return 'battle';
  if (events.some(event => event.type.startsWith('reward_'))) return 'treasure';
  if (events.some(event => /rest|campfire|bonfire/.test(event.type))) return 'rest';
  if (events.some(event => event.type.startsWith('event'))) return 'event';
  return null;
}

function typeLabelFor(raw: string | null, category: NodeCategory): string {
  if (!raw) return CATEGORY_LABEL[category];
  const pretty = prettyKey(raw);
  if (['Normal', 'Regular', 'Standard', 'Basic'].includes(pretty)) return CATEGORY_LABEL[category];
  return pretty;
}

function visitTitle(events: RunTimelineEvent[], typeLabel: string): string {
  const battle = events.find(event => event.type === 'battle_start');
  const battleName = asString(battle?.name);
  if (battleName) return prettyKey(battleName);
  const chosen = events.filter(event => event.type === 'reward_chosen' || event.type === 'event_choice' || event.type === 'event_chosen');
  if (chosen.length === 1) {
    const name = chosenName(chosen[0]);
    if (name) return name;
  }
  return typeLabel;
}

function repeatsTitle(digest: string, title: string): boolean {
  return digest === title || digest === `Bought ${title}` || digest === `Chose ${title}` || digest === `Upgraded ${title}` || digest === `Removed ${title}`;
}

function summarize(actions: BuiltAction[], title: string): string {
  let battleDetail: string | null = null;
  const bits: string[] = [];
  for (const action of actions) {
    if (!action.digest || repeatsTitle(action.digest, title)) continue;
    if (action.title === 'Won' || action.title === 'Lost' || action.tone === 'good' || action.tone === 'bad') {
      const stripped = action.digest.replace(/^(Won|Lost)\s·\s/, '').replace(/^(Won|Lost)$/, '');
      battleDetail = stripped || null;
      continue;
    }
    bits.push(action.digest);
  }
  const rest = bits.filter(bit => !bit.startsWith('Offered '));
  const offered = bits.filter(bit => bit.startsWith('Offered '));
  const chosen = rest.length > 0 ? rest : offered;
  if (battleDetail) chosen.push(battleDetail);
  if (chosen.length > 0) return chosen.slice(0, 3).join(' · ');
  return actions.find(action => action.priceNote)?.priceNote ?? '';
}

function visitOutcome(actions: BuiltAction[]): 'won' | 'lost' | null {
  const end = [...actions].reverse().find(action => action.title === 'Won' || action.title === 'Lost');
  if (!end) return null;
  return end.title === 'Won' ? 'won' : 'lost';
}

interface RawVisit {
  floor: number;
  node: number;
  events: RunTimelineEvent[];
}

function isBoundary(event: RunTimelineEvent): boolean {
  return event.type === 'run_start' || event.type === 'run_end' || event.type === 'floor_start' || event.type === 'floor_end' || event.type === 'floor_complete';
}

function groupVisits(events: RunTimelineEvent[]): {
  character: string | null;
  startChoices: string[];
  floorStarts: Map<number, number>;
  visits: RawVisit[];
} {
  const visits: RawVisit[] = [];
  let character: string | null = null;
  let startChoices: string[] = [];
  const floorStarts = new Map<number, number>();
  let index = 0;

  while (index < events.length) {
    const event = events[index];
    if (event.type === 'run_start') {
      character = asString(event.character) ?? asString(event.character_key) ?? character;
      const choices = labelsOf(event.options ?? event.choices);
      if (choices.length > 0) startChoices = choices;
      index += 1;
      continue;
    }
    if (event.type === 'floor_start') {
      const floor = asNumber(event.floor);
      const time = asNumber(event.t);
      if (floor !== null && time !== null && !floorStarts.has(floor)) floorStarts.set(floor, time);
      index += 1;
      continue;
    }
    if (isBoundary(event)) {
      index += 1;
      continue;
    }

    const floor = asNumber(event.floor) ?? 0;
    const node = asNumber(event.node) ?? 0;
    const bucket: RawVisit = { floor, node, events: [] };
    while (index < events.length) {
      const next = events[index];
      if (isBoundary(next)) break;
      const nextFloor = asNumber(next.floor) ?? 0;
      const nextNode = asNumber(next.node) ?? 0;
      // A node_enter always opens a visit, even when the coordinates match the previous one.
      if (bucket.events.length > 0 && (next.type === 'node_enter' || nextFloor !== floor || nextNode !== node)) break;
      bucket.events.push(next);
      index += 1;
    }
    visits.push(bucket);
  }

  return { character, startChoices, floorStarts, visits };
}

function toVisit(raw: RawVisit, order: number): MapNodeVisit {
  const built = raw.events.map(presentEvent).filter((action): action is BuiltAction => action !== null);
  const rawType = explicitType(raw.events);
  const category = rawType ? nodeCategory(rawType) : 'node';
  const typeLabel = typeLabelFor(rawType, category);
  const title = visitTitle(raw.events, typeLabel);
  const first = asNumber(raw.events[0]?.t);
  const last = asNumber(raw.events[raw.events.length - 1]?.t);
  const timeLabel = formatDuration(first);
  const spanLabel =
    first !== null && last !== null && Math.round(last) !== Math.round(first)
      ? `${formatDuration(first)}–${formatDuration(last)}`
      : timeLabel;
  return {
    id: `visit-${order}`,
    floor: raw.floor,
    node: raw.node,
    order,
    category,
    typeLabel,
    title,
    summary: summarize(built, title),
    outcome: visitOutcome(built),
    timeLabel,
    spanLabel,
    actions: built.map(action => ({
      time: action.time,
      title: action.title,
      lines: action.lines,
      facts: action.facts,
      groups: action.groups,
      tone: action.tone,
    })),
  };
}

export function buildTimelinePath(events: RunTimelineEvent[]): TimelinePath {
  const grouped = groupVisits(events);
  const nodes = grouped.visits.map((visit, index) => toVisit(visit, index + 1));
  const floors: TimelineFloor[] = [];
  for (const node of nodes) {
    const existing = floors[floors.length - 1];
    if (!existing || existing.floor !== node.floor) {
      const started = grouped.floorStarts.get(node.floor);
      floors.push({
        floor: node.floor,
        timeLabel: formatDuration(started ?? asNumber(grouped.visits[node.order - 1]?.events[0]?.t)),
        nodes: [node],
      });
    } else {
      existing.nodes.push(node);
    }
  }
  return {
    character: grouped.character ? prettyKey(grouped.character) : null,
    startChoices: grouped.startChoices.filter(choice => choice !== (grouped.character ? prettyKey(grouped.character) : null)),
    floors,
    nodes,
  };
}
