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

/** Formats large cumulative durations (e.g. total player runtime) as "12h 34m" or "45m 10s". */
export function formatTotalRuntime(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds) || seconds <= 0) return '0m';
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function pct(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : `${(value * 100).toFixed(1)}%`;
}

export function num(value: number | null | undefined, digits = 0): string {
  return value === null || value === undefined ? '—' : Number(value).toFixed(digits);
}

/** Shortens a long user_id_hash for compact display while preserving uniqueness. */
export function shortUserId(userId: string | number | null | undefined): string {
  if (userId === null || userId === undefined) return 'Anonymous';
  const raw = String(userId).trim();
  if (!raw) return 'Anonymous';
  if (raw.length <= 10) return raw;
  return `${raw.slice(0, 6)}…${raw.slice(-4)}`;
}

export const OUTCOME_COLORS: Record<RunOutcome | 'legacy', string> = {
  won: '#16a34a',
  died: '#dc2626',
  abandoned: '#6b7280',
  legacy: '#a16207',
};
