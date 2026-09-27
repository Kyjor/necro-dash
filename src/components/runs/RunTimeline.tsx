import { useMemo, useState } from 'react';
import { Card } from '../ui/Card';
import { Select } from '../ui/Select';
import type { RunTimelineEvent } from '../../types/analytics';
import { formatDuration, prettyKey } from '../../utils/runFormat';

const BASE_FIELDS = new Set(['type', 't', 'floor', 'node']);

function describe(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map(v => (typeof v === 'object' && v !== null ? describe(v) : String(v))).join(', ');
  }
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    if (typeof obj.key === 'string' && obj.key.length > 0) return `${obj.kind ?? ''} ${prettyKey(obj.key)}`.trim();
    return JSON.stringify(value);
  }
  return String(value);
}

function summary(event: RunTimelineEvent): string {
  return Object.entries(event)
    .filter(([k]) => !BASE_FIELDS.has(k))
    .map(([k, v]) => `${k}: ${k === 'key' && typeof v === 'string' ? prettyKey(v) : describe(v)}`)
    .join(' · ');
}

export function RunTimeline({ events, dropped }: { events: RunTimelineEvent[]; dropped: number }) {
  const [type, setType] = useState('');
  const types = useMemo(() => [...new Set(events.map(e => e.type))].sort(), [events]);
  const visible = useMemo(() => (type ? events.filter(e => e.type === type) : events), [events, type]);

  return (
    <Card className="space-y-3">
      <div className="flex items-end justify-between gap-2">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Timeline ({visible.length})</h2>
        <div className="w-44">
          <Select
            value={type}
            onChange={e => setType(e.target.value)}
            options={[{ value: '', label: 'All events' }, ...types.map(t => ({ value: t, label: t }))]}
          />
        </div>
      </div>
      {dropped > 0 ? (
        <p className="text-xs text-amber-600">{dropped} later events were dropped (timeline cap reached).</p>
      ) : null}
      <ol className="space-y-1 max-h-[32rem] overflow-y-auto">
        {visible.map((e, i) => (
          <li key={i} className="text-xs border-b border-gray-100 dark:border-gray-700 pb-1">
            <span className="font-mono text-gray-400">{formatDuration(e.t)}</span>{' '}
            <span className="text-gray-500 dark:text-gray-400">
              F{e.floor}·N{e.node}
            </span>{' '}
            <span className="font-semibold text-gray-900 dark:text-gray-100">{e.type}</span>
            <p className="text-gray-600 dark:text-gray-300 break-words">{summary(e)}</p>
          </li>
        ))}
      </ol>
    </Card>
  );
}
