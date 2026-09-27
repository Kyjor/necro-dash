import { usePieceStats } from '../../hooks/useRunAnalytics';
import type { StatsScope } from '../../types/analytics';
import { num, pct, prettyKey } from '../../utils/runFormat';
import { ChartWidget } from '../charts/ChartWidget';
import { StatsTable } from '../charts/StatsTable';

export function PieceStatsSection({ range, version }: StatsScope) {
  const { data = [], isLoading, error } = usePieceStats(range, version);

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Pieces</h2>
      <ChartWidget title="Piece performance" isLoading={isLoading} error={error ?? null} isEmpty={data.length === 0}>
        <StatsTable
          rows={data}
          rowKey={p => p.piece_key}
          initialSort="runs"
          columns={[
            { key: 'piece_key', label: 'Piece', render: p => prettyKey(p.piece_key) },
            { key: 'runs', label: 'Runs' },
            { key: 'win_rate', label: 'Win %', render: p => pct(p.win_rate) },
            { key: 'avg_copies', label: 'Avg copies', render: p => num(p.avg_copies, 1) },
            { key: 'avg_weight', label: 'Avg weight', render: p => num(p.avg_weight, 1) },
            { key: 'times_matched', label: 'Matches' },
            { key: 'pieces_matched', label: 'Cleared' },
            { key: 'pick_rate', label: 'Pick %', render: p => pct(p.pick_rate) },
            { key: 'offered', label: 'Offered' },
            { key: 'chosen', label: 'Chosen' },
            { key: 'bought', label: 'Bought' },
          ]}
        />
      </ChartWidget>
    </section>
  );
}
