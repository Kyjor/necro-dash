import { usePieceStats } from '../../hooks/useRunAnalytics';
import type { StatsScope } from '../../types/analytics';
import { num, pct, prettyKey } from '../../utils/runFormat';
import { ChartWidget } from '../charts/ChartWidget';
import { KpiCard } from '../charts/KpiCard';
import { StatsTable } from '../charts/StatsTable';

export function PieceStatsSection({ range, version }: StatsScope) {
  const { data = [], isLoading, error } = usePieceStats(range, version);
  const bestWin = [...data].filter(p => p.finished >= 2).sort((a, b) => (b.win_rate ?? 0) - (a.win_rate ?? 0))[0];
  const mostPicked = [...data].filter(p => p.offered >= 2).sort((a, b) => (b.pick_rate ?? 0) - (a.pick_rate ?? 0))[0];
  const mostMatched = [...data].sort((a, b) => b.times_matched - a.times_matched)[0];

  return (
    <section className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard
          label="Highest Win Rate Piece"
          value={isLoading || !bestWin ? '--' : prettyKey(bestWin.piece_key)}
          helper={bestWin ? `${pct(bestWin.win_rate)} (${bestWin.runs} runs)` : undefined}
          tone="good"
        />
        <KpiCard
          label="Most Picked on Rewards"
          value={isLoading || !mostPicked ? '--' : prettyKey(mostPicked.piece_key)}
          helper={mostPicked ? `${pct(mostPicked.pick_rate)} pick rate` : undefined}
        />
        <KpiCard
          label="Most Matched Piece"
          value={isLoading || !mostMatched ? '--' : prettyKey(mostMatched.piece_key)}
          helper={mostMatched ? `${mostMatched.times_matched} matches` : undefined}
        />
      </div>

      <ChartWidget title="Piece Performance" isLoading={isLoading} error={error ?? null} isEmpty={data.length === 0}>
        <StatsTable
          rows={data}
          rowKey={p => p.piece_key}
          initialSort="runs"
          columns={[
            { key: 'piece_key', label: 'Piece', render: p => prettyKey(p.piece_key) },
            { key: 'runs', label: 'Runs' },
            { key: 'win_rate', label: 'Win %', render: p => pct(p.win_rate) },
            { key: 'pick_rate', label: 'Pick %', render: p => pct(p.pick_rate) },
            { key: 'times_matched', label: 'Matches' },
            { key: 'avg_copies', label: 'Avg copies', render: p => num(p.avg_copies, 1), secondary: true },
            { key: 'avg_weight', label: 'Avg weight', render: p => num(p.avg_weight, 1), secondary: true },
            { key: 'pieces_matched', label: 'Cleared', secondary: true },
            { key: 'offered', label: 'Offered', secondary: true },
            { key: 'chosen', label: 'Chosen', secondary: true },
            { key: 'bought', label: 'Bought', secondary: true },
          ]}
        />
      </ChartWidget>
    </section>
  );
}
