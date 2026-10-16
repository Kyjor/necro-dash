import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Input } from '../ui/Input';
import { useSurveyStats } from '../../hooks/useSurveyStats';
import type { DateRangeFilterValue } from '../../types/analytics';
import { num } from '../../utils/runFormat';
import { ChartWidget } from './ChartWidget';
import { KpiCard } from './KpiCard';

function CommentsViewer({
  comments,
}: {
  comments: Array<{ id: number; created_at: string; comments: string }>;
}) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'asc' | 'desc'>('desc');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = comments.filter(c => c.comments.toLowerCase().includes(q));
    return list.sort((a, b) => {
      const left = new Date(a.created_at).getTime();
      const right = new Date(b.created_at).getTime();
      return sort === 'asc' ? left - right : right - left;
    });
  }, [comments, search, sort]);

  return (
    <div className="space-y-2">
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search player feedback..."
          className="sm:flex-1"
        />
        <select
          className="rounded-xl border px-3 py-2 text-xs bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
          value={sort}
          onChange={e => setSort(e.target.value as 'asc' | 'desc')}
        >
          <option value="desc">Newest first</option>
          <option value="asc">Oldest first</option>
        </select>
      </div>
      <div className="h-56 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-xl p-3 space-y-2">
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-500">No comments match this filter.</p>
        ) : (
          filtered.map(item => (
            <article key={item.id} className="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800">
              <p className="text-[11px] text-gray-400 mb-1">{new Date(item.created_at).toLocaleString()}</p>
              <p className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">{item.comments}</p>
            </article>
          ))
        )}
      </div>
    </div>
  );
}

export function SurveySentimentSection({ range }: { range: DateRangeFilterValue }) {
  const { data, isLoading, error } = useSurveyStats(range);
  const hasData = !!data && data.trends.length > 0;

  const averages = useMemo(() => {
    const trends = data?.trends ?? [];
    const avg = (key: 'pacing' | 'variety' | 'wouldPlayAgain' | 'wouldRecommend') => {
      const vals = trends.map(t => t[key]).filter(v => v > 0);
      return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    };
    return {
      pacing: avg('pacing'),
      variety: avg('variety'),
      playAgain: avg('wouldPlayAgain'),
      recommend: avg('wouldRecommend'),
    };
  }, [data?.trends]);

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Avg Pacing" value={isLoading ? '--' : num(averages.pacing, 2)} />
        <KpiCard label="Avg Variety" value={isLoading ? '--' : num(averages.variety, 2)} />
        <KpiCard label="Would Play Again" value={isLoading ? '--' : num(averages.playAgain, 2)} />
        <KpiCard
          label="Would Recommend"
          value={isLoading ? '--' : num(averages.recommend, 2)}
          tone={averages.recommend && averages.recommend >= 3.5 ? 'good' : 'neutral'}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartWidget
          title={`Player Comments (${data?.comments.length ?? 0})`}
          isLoading={isLoading}
          error={error ?? null}
          isEmpty={!data || data.comments.length === 0}
        >
          <CommentsViewer comments={data?.comments ?? []} />
        </ChartWidget>

        <ChartWidget title="Sentiment Trends Over Time" isLoading={isLoading} error={error ?? null} isEmpty={!hasData}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="pacing" name="Pacing" stroke="#f97316" dot={false} />
                <Line type="monotone" dataKey="variety" name="Variety" stroke="#0ea5e9" dot={false} />
                <Line type="monotone" dataKey="wouldPlayAgain" name="Play Again" stroke="#22c55e" dot={false} />
                <Line type="monotone" dataKey="wouldRecommend" name="Recommend" stroke="#a855f7" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartWidget>
      </div>
    </section>
  );
}
