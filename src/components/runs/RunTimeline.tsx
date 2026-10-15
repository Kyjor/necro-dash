import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, SectionHeader } from '../ui/Card';
import type { RunTimelineEvent } from '../../types/analytics';
import {
  buildTimelinePath,
  type MapNodeVisit,
  type NodeCategory,
  type TimelineAction,
  type TimelineGroup,
} from '../../utils/timelineNodes';

const CATEGORY_STYLE: Record<NodeCategory, { dot: string; text: string; chip: string }> = {
  battle: { dot: 'bg-red-500', text: 'text-red-600 dark:text-red-400', chip: 'bg-red-500/10 text-red-700 dark:text-red-300' },
  elite: { dot: 'bg-purple-500', text: 'text-purple-600 dark:text-purple-400', chip: 'bg-purple-500/10 text-purple-700 dark:text-purple-300' },
  boss: { dot: 'bg-rose-600', text: 'text-rose-600 dark:text-rose-400', chip: 'bg-rose-500/10 text-rose-700 dark:text-rose-300' },
  shop: { dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', chip: 'bg-amber-500/10 text-amber-800 dark:text-amber-300' },
  rest: { dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', chip: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
  treasure: { dot: 'bg-yellow-500', text: 'text-yellow-700 dark:text-yellow-300', chip: 'bg-yellow-500/10 text-yellow-800 dark:text-yellow-200' },
  event: { dot: 'bg-sky-500', text: 'text-sky-600 dark:text-sky-400', chip: 'bg-sky-500/10 text-sky-700 dark:text-sky-300' },
  node: { dot: 'bg-gray-400', text: 'text-gray-500 dark:text-gray-400', chip: 'bg-gray-500/10 text-gray-600 dark:text-gray-300' },
};

function actionCount(count: number): string {
  return `${count} ${count === 1 ? 'action' : 'actions'}`;
}

function GroupBlock({ group }: { group: TimelineGroup }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{group.title}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {group.items.map((item, index) => (
          <span
            key={`${item}-${index}`}
            className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-800 dark:bg-gray-700 dark:text-gray-100"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function ActionCard({ action }: { action: TimelineAction }) {
  const titleClass =
    action.tone === 'good'
      ? 'text-green-700 dark:text-green-400'
      : action.tone === 'bad'
        ? 'text-red-600 dark:text-red-400'
        : 'text-gray-900 dark:text-gray-100';
  return (
    <li className="rounded-2xl border border-gray-100 bg-white p-3.5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className={`text-sm font-semibold ${titleClass}`}>{action.title}</h3>
        <time className="shrink-0 font-mono text-[11px] text-gray-400">{action.time}</time>
      </div>
      {action.lines.map(line => (
        <p key={line} className="mt-1 text-sm text-gray-600 dark:text-gray-300">
          {line}
        </p>
      ))}
      {action.facts.length > 0 ? (
        <dl className="mt-2 grid grid-cols-2 gap-2">
          {action.facts.map(item => (
            <div key={item.label} className="rounded-xl bg-gray-50 px-2.5 py-1.5 dark:bg-gray-900/50">
              <dt className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">{item.label}</dt>
              <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {action.groups.length > 0 ? (
        <div className="mt-2 space-y-2">
          {action.groups.map(group => (
            <GroupBlock key={group.title} group={group} />
          ))}
        </div>
      ) : null}
    </li>
  );
}

function NodeScreen({ node, onBack }: { node: MapNodeVisit; onBack: () => void }) {
  const style = CATEGORY_STYLE[node.category];
  const sameName = node.title.toLowerCase() === node.typeLabel.toLowerCase();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onBack();
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onBack]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-gray-50 dark:bg-gray-900 animate-slide-up"
      role="dialog"
      aria-modal="true"
      aria-label={node.title}
    >
      <header className="flex-shrink-0 border-b border-gray-200 bg-gray-50/95 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur dark:border-gray-700 dark:bg-gray-900/95">
        <button
          type="button"
          onClick={onBack}
          className="py-3 text-sm font-medium text-primary-600 dark:text-primary-400"
        >
          ← Path
        </button>
      </header>
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="space-y-2">
          {!sameName || node.outcome ? (
            <div className="flex flex-wrap items-center gap-2">
              {sameName ? null : (
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${style.chip}`}>
                  {node.typeLabel}
                </span>
              )}
              {node.outcome ? (
                <span
                  className={[
                    'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                    node.outcome === 'won'
                      ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                      : 'bg-red-500/10 text-red-600 dark:text-red-400',
                  ].join(' ')}
                >
                  {node.outcome === 'won' ? 'Won' : 'Lost'}
                </span>
              ) : null}
            </div>
          ) : null}
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{node.title}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Floor {node.floor} · Node {node.node} · {node.spanLabel}
          </p>
          {node.summary ? <p className="text-sm text-gray-700 dark:text-gray-200">{node.summary}</p> : null}
        </div>

        {node.actions.length === 0 ? (
          <Card>
            <p className="text-sm text-gray-500 dark:text-gray-400">No actions were recorded at this node.</p>
          </Card>
        ) : (
          <section className="space-y-2">
            <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {actionCount(node.actions.length)}
            </h3>
            <ol className="space-y-2">
              {node.actions.map((action, index) => (
                <ActionCard key={`${action.time}-${action.title}-${index}`} action={action} />
              ))}
            </ol>
          </section>
        )}
      </div>
    </div>
  );
}

function NodeCard({ node, onOpen }: { node: MapNodeVisit; onOpen: () => void }) {
  const style = CATEGORY_STYLE[node.category];
  const sameName = node.title.toLowerCase() === node.typeLabel.toLowerCase();
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-start gap-3 rounded-2xl border border-gray-100 bg-white p-3.5 text-left shadow-sm transition-transform active:scale-[0.99] dark:border-gray-700 dark:bg-gray-800"
      aria-label={`Floor ${node.floor}, node ${node.node}, ${node.typeLabel}, ${node.title}`}
    >
      <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          {sameName ? (
            <span className={`text-sm font-semibold ${style.text}`}>{node.typeLabel}</span>
          ) : (
            <span className={`text-[10px] font-semibold uppercase tracking-wide ${style.text}`}>{node.typeLabel}</span>
          )}
          {node.outcome ? (
            <span
              className={[
                'rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                node.outcome === 'won'
                  ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                  : 'bg-red-500/10 text-red-600 dark:text-red-400',
              ].join(' ')}
            >
              {node.outcome === 'won' ? 'Won' : 'Lost'}
            </span>
          ) : null}
          <span className="ml-auto font-mono text-[11px] text-gray-400">{node.timeLabel}</span>
        </span>
        {sameName ? null : (
          <span className="mt-0.5 block text-sm font-semibold leading-snug text-gray-900 dark:text-gray-100">{node.title}</span>
        )}
        {node.summary ? (
          <span className="mt-1 block text-xs leading-relaxed text-gray-600 dark:text-gray-300">{node.summary}</span>
        ) : null}
        <span className="mt-1.5 block text-[11px] text-gray-400">
          Node {node.node} · {actionCount(node.actions.length)}
        </span>
      </span>
      <span className="self-center text-lg leading-none text-gray-300 dark:text-gray-600" aria-hidden>
        ›
      </span>
    </button>
  );
}

export function RunTimeline({ events, dropped }: { events: RunTimelineEvent[]; dropped: number }) {
  const path = useMemo(() => buildTimelinePath(events), [events]);
  const [filter, setFilter] = useState<NodeCategory | 'all'>('all');
  const [openId, setOpenId] = useState<string | null>(null);

  const categories = useMemo(() => {
    const counts = new Map<NodeCategory, number>();
    for (const node of path.nodes) counts.set(node.category, (counts.get(node.category) ?? 0) + 1);
    return [...counts.entries()];
  }, [path.nodes]);

  const floors = useMemo(
    () =>
      path.floors
        .map(floor => ({
          ...floor,
          nodes: floor.nodes.filter(node => filter === 'all' || node.category === filter),
        }))
        .filter(floor => floor.nodes.length > 0),
    [path.floors, filter],
  );

  const open = path.nodes.find(node => node.id === openId) ?? null;
  const close = useCallback(() => setOpenId(null), []);

  return (
    <section className="space-y-3">
      <div className="space-y-1 px-1">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          Path
          <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
            {path.nodes.length} {path.nodes.length === 1 ? 'node' : 'nodes'}
          </span>
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">Each map node you visited. Open one to read what happened there.</p>
      </div>

      {dropped > 0 ? (
        <p className="rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          {dropped} later events were dropped because the timeline hit its cap.
        </p>
      ) : null}

      {path.character ? (
        <p className="px-1 text-sm text-gray-700 dark:text-gray-200">
          Started as <span className="font-semibold">{path.character}</span>
        </p>
      ) : null}
      {path.startChoices.length > 0 ? (
        <p className="px-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
          Also offered: {path.startChoices.join(' · ')}
        </p>
      ) : null}

      {categories.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilter('all')}
            aria-pressed={filter === 'all'}
            className={[
              'rounded-full border px-3 py-1 text-xs font-medium',
              filter === 'all'
                ? 'border-gray-900 bg-gray-900 text-white dark:border-gray-100 dark:bg-gray-100 dark:text-gray-900'
                : 'border-gray-200 bg-white text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300',
            ].join(' ')}
          >
            All {path.nodes.length}
          </button>
          {categories.map(([category, count]) => (
            <button
              key={category}
              type="button"
              onClick={() => setFilter(category)}
              aria-pressed={filter === category}
              className={[
                'rounded-full border px-3 py-1 text-xs font-medium',
                filter === category
                  ? 'border-gray-900 bg-gray-900 text-white dark:border-gray-100 dark:bg-gray-100 dark:text-gray-900'
                  : 'border-gray-200 bg-white text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300',
              ].join(' ')}
            >
              {categoryLabel(category)} {count}
            </button>
          ))}
        </div>
      ) : null}

      {floors.length === 0 ? (
        <p className="px-1 text-sm text-gray-500 dark:text-gray-400">No {categoryLabel(filter).toLowerCase()} nodes on this run.</p>
      ) : (
        floors.map(floor => (
          <div key={floor.floor} className="space-y-2">
            <SectionHeader
              title={`Floor ${floor.floor}`}
              action={<span className="font-mono text-xs normal-case tracking-normal text-gray-400">{floor.timeLabel}</span>}
            />
            {floor.nodes.map(node => (
              <NodeCard key={node.id} node={node} onOpen={() => setOpenId(node.id)} />
            ))}
          </div>
        ))
      )}

      {open ? <NodeScreen node={open} onBack={close} /> : null}
    </section>
  );
}

function categoryLabel(category: NodeCategory | 'all'): string {
  if (category === 'all') return 'matching';
  return CATEGORY_STYLE[category] ? category.charAt(0).toUpperCase() + category.slice(1) : category;
}
