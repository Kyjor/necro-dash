import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
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
import { ChartWidget } from './ChartWidget';

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
          placeholder="Search comments..."
          className="sm:flex-1"
        />
        <select
          className="rounded-xl border px-3.5 py-2.5 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
          value={sort}
          onChange={e => setSort(e.target.value as 'asc' | 'desc')}
        >
          <option value="desc">Newest</option>
          <option value="asc">Oldest</option>
        </select>
      </div>
      <div className="h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-xl p-3 space-y-2">
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-500">No comments match this filter.</p>
        ) : (
          filtered.map(item => (
            <article key={item.id} className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
              <p className="text-xs text-gray-500 mb-1">{item.created_at}</p>
              <p className="text-sm text-gray-800 dark:text-gray-200">{item.comments}</p>
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

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Survey Sentiment</h2>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartWidget title="Rating Distributions" isLoading={isLoading} error={error ?? null} isEmpty={!hasData}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={
                  data
                    ? [
                        { name: 'Pacing', value: data.ratingDistributions.pacing.reduce((acc, item) => acc + item.value, 0) },
                        { name: 'Variety', value: data.ratingDistributions.variety.reduce((acc, item) => acc + item.value, 0) },
                        {
                          name: 'Play Again',
                          value: data.ratingDistributions.wouldPlayAgain.reduce((acc, item) => acc + item.value, 0),
                        },
                        {
                          name: 'Recommend',
                          value: data.ratingDistributions.wouldRecommend.reduce((acc, item) => acc + item.value, 0),
                        },
                      ]
                    : []
                }
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#14b8a6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartWidget>
        <ChartWidget title="Survey Trends Over Time" isLoading={isLoading} error={error ?? null} isEmpty={!hasData}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="pacing" stroke="#f97316" dot={false} />
                <Line type="monotone" dataKey="variety" stroke="#0ea5e9" dot={false} />
                <Line type="monotone" dataKey="wouldPlayAgain" stroke="#22c55e" dot={false} />
                <Line type="monotone" dataKey="wouldRecommend" stroke="#a855f7" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartWidget>
        <ChartWidget
          title="Comments Viewer"
          isLoading={isLoading}
          error={error ?? null}
          isEmpty={!data || data.comments.length === 0}
        >
          <CommentsViewer comments={data?.comments ?? []} />
        </ChartWidget>
      </div>
    </section>
  );
}
