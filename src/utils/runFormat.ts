import type { RunOutcome } from '../types/analytics';

const KEY_PREFIX = /^(CHARACTER|TREASURE|POTION|PIECE|ENEMY)_/;

/** "TREASURE_ANCIENT_SHIELD" -> "Ancient Shield". */
export function prettyKey(key: string | null | undefined): string {
  if (!key) return 'Unknown';
  return key
    .replace(KEY_PREFIX, '')
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return '—';
  const total = Math.max(0, Math.round(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function pct(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : `${(value * 100).toFixed(1)}%`;
}

export function num(value: number | null | undefined, digits = 0): string {
  return value === null || value === undefined ? '—' : Number(value).toFixed(digits);
}

export const OUTCOME_COLORS: Record<RunOutcome | 'legacy', string> = {
  won: '#16a34a',
  died: '#dc2626',
  abandoned: '#6b7280',
  legacy: '#a16207',
};
