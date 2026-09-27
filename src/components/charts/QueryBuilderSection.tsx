import { useMemo, useRef, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { useCustomQuery } from '../../hooks/useCustomQuery';
import type { DateRangeFilterValue, QueryAggregate, QueryBuilderRequest, QueryOperator, QueryableAnalyticsTable } from '../../types/analytics';

const TABLE_OPTIONS: Array<{ value: QueryableAnalyticsTable; label: string }> = [
  { value: 'Crashes', label: 'Crashes' },
  { value: 'Runs', label: 'Runs' },
  { value: 'Startups', label: 'Startups' },
  { value: 'Surveys', label: 'Surveys' },
  { value: 'FeatureGates', label: 'FeatureGates' },
  { value: 'run_treasures', label: 'run_treasures (final loadout treasures)' },
  { value: 'run_pieces', label: 'run_pieces (final loadout pieces)' },
  { value: 'run_potions', label: 'run_potions (per-run potion usage)' },
  { value: 'run_battles', label: 'run_battles (one row per battle)' },
  { value: 'run_events', label: 'run_events (full timeline)' },
];

const OPERATOR_OPTIONS: Array<{ value: QueryOperator; label: string }> = [
  { value: 'eq', label: '=' },
  { value: 'neq', label: '!=' },
  { value: 'gt', label: '>' },
  { value: 'gte', label: '>=' },
  { value: 'lt', label: '<' },
  { value: 'lte', label: '<=' },
  { value: 'like', label: 'contains' },
];

const AGG_OPTIONS: Array<{ value: QueryAggregate; label: string }> = [
  { value: 'none', label: 'None (raw rows)' },
  { value: 'count', label: 'Count' },
  { value: 'sum', label: 'Sum' },
  { value: 'avg', label: 'Average' },
];

type DisplayType = 'table' | 'bar' | 'line' | 'area' | 'pie' | 'scatter';
type BarMode = 'grouped' | 'stacked';

const DISPLAY_OPTIONS: Array<{ value: DisplayType; label: string }> = [
  { value: 'table', label: 'Table only' },
  { value: 'bar', label: 'Bar chart' },
  { value: 'line', label: 'Line chart' },
  { value: 'area', label: 'Area chart' },
  { value: 'pie', label: 'Pie chart' },
  { value: 'scatter', label: 'Scatter plot' },
];

interface QueryBuilderSectionProps {
  dateRange: DateRangeFilterValue;
}

export function QueryBuilderSection({ dateRange }: QueryBuilderSectionProps) {
  const [table, setTable] = useState<QueryableAnalyticsTable>('Runs');
  const [columns, setColumns] = useState<string>('id,created_at,user_id_hash');
  const [whereColumn, setWhereColumn] = useState<string>('');
  const [whereOperator, setWhereOperator] = useState<QueryOperator>('eq');
  const [whereValue, setWhereValue] = useState<string>('');
  const [aggregate, setAggregate] = useState<QueryAggregate>('none');
  const [groupBy, setGroupBy] = useState<string>('');
  const [aggregateColumn, setAggregateColumn] = useState<string>('id');
  const [limit, setLimit] = useState<string>('100');
  const [displayType, setDisplayType] = useState<DisplayType>('table');
  const [xAxisKey, setXAxisKey] = useState<string>('created_at');
  const [yAxisKeysInput, setYAxisKeysInput] = useState<string>('value');
  const [nameKey, setNameKey] = useState<string>('group');
  const [valueKey, setValueKey] = useState<string>('value');
  const [barMode, setBarMode] = useState<BarMode>('grouped');
  const chartWrapperRef = useRef<HTMLDivElement | null>(null);

  const queryMutation = useCustomQuery();
  const parsedColumns = useMemo(
    () => columns.split(',').map(col => col.trim()).filter(Boolean),
    [columns],
  );
  const resultColumns = queryMutation.data?.columns ?? [];
  const columnOptions = resultColumns.map(col => ({ value: col, label: col }));

  const chartRows = useMemo(() => {
    const rows = queryMutation.data?.rows ?? [];
    const yKeys = yAxisKeysInput.split(',').map(key => key.trim()).filter(Boolean);
    return rows.map(row => {
      const next: Record<string, unknown> = { ...row };
      const x = Number(row[xAxisKey]);
      const pieValue = Number(row[valueKey]);
      for (const yKey of yKeys) {
        const y = Number(row[yKey]);
        if (Number.isFinite(y)) next[yKey] = y;
      }
      if (Number.isFinite(x)) next[xAxisKey] = x;
      if (Number.isFinite(pieValue)) next[valueKey] = pieValue;
      return next;
    });
  }, [queryMutation.data?.rows, xAxisKey, yAxisKeysInput, valueKey]);

  const yAxisKeys = useMemo(
    () => yAxisKeysInput.split(',').map(key => key.trim()).filter(Boolean),
    [yAxisKeysInput],
  );

  const chartElement = useMemo(() => {
    if (displayType === 'bar') {
      return (
        <BarChart data={chartRows}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xAxisKey} />
          <YAxis />
          <Tooltip />
          {yAxisKeys.map((key, index) => (
            <Bar
              key={key}
              dataKey={key}
              stackId={barMode === 'stacked' ? 'stack' : undefined}
              fill={['#3b82f6', '#10b981', '#f97316', '#8b5cf6', '#0ea5e9'][index % 5]}
            />
          ))}
        </BarChart>
      );
    }
    if (displayType === 'line') {
      return (
        <LineChart data={chartRows}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xAxisKey} />
          <YAxis />
          <Tooltip />
          {yAxisKeys.map((key, index) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={['#16a34a', '#2563eb', '#f97316', '#8b5cf6', '#0ea5e9'][index % 5]}
              dot={false}
            />
          ))}
        </LineChart>
      );
    }
    if (displayType === 'area') {
      return (
        <AreaChart data={chartRows}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xAxisKey} />
          <YAxis />
          <Tooltip />
          {yAxisKeys.map((key, index) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              stroke={['#8b5cf6', '#3b82f6', '#14b8a6', '#f97316', '#16a34a'][index % 5]}
              fill={['#ddd6fe', '#bfdbfe', '#99f6e4', '#fed7aa', '#bbf7d0'][index % 5]}
              fillOpacity={0.5}
            />
          ))}
        </AreaChart>
      );
    }
    if (displayType === 'pie') {
      return (
        <PieChart>
          <Pie data={chartRows} dataKey={valueKey} nameKey={nameKey} outerRadius={120} fill="#f97316" />
          <Tooltip />
        </PieChart>
      );
    }
    if (displayType === 'scatter') {
      return (
        <ScatterChart>
          <CartesianGrid />
          <XAxis dataKey={xAxisKey} />
          <YAxis dataKey={yAxisKeys[0] ?? 'value'} />
          <Tooltip />
          <Scatter data={chartRows} fill="#0ea5e9" />
        </ScatterChart>
      );
    }
    return null;
  }, [barMode, chartRows, displayType, nameKey, valueKey, xAxisKey, yAxisKeys]);

  function exportCsv() {
    if (!queryMutation.data) return;
    const { columns: cols, rows } = queryMutation.data;
    const escapeCsv = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const csv = [cols.join(','), ...rows.map(row => cols.map(col => escapeCsv(row[col])).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `query-results-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function exportPng() {
    const svg = chartWrapperRef.current?.querySelector('svg');
    if (!svg) return;
    const svgString = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width || 1200;
      canvas.height = img.height || 600;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const pngUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = pngUrl;
      link.download = `query-chart-${Date.now()}.png`;
      link.click();
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  async function onRun() {
    const request: QueryBuilderRequest = {
      table,
      columns: parsedColumns,
      dateRange,
      whereColumn: whereColumn.trim() || undefined,
      whereOperator,
      whereValue: whereValue.trim() || undefined,
      aggregate,
      groupBy: groupBy.trim() || undefined,
      aggregateColumn: aggregateColumn.trim() || undefined,
      limit: Number(limit) || 100,
    };
    await queryMutation.mutateAsync(request);
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Query Builder</h2>
      <Card className="space-y-3">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Build ad-hoc queries quickly. Uses current global date range automatically.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <Select label="Table" value={table} onChange={e => setTable(e.target.value as QueryableAnalyticsTable)} options={TABLE_OPTIONS} />
          <Input label="Columns (comma-separated)" value={columns} onChange={e => setColumns(e.target.value)} />
          <Input label="Where column" value={whereColumn} onChange={e => setWhereColumn(e.target.value)} placeholder="user_id_hash" />
          <Select label="Operator" value={whereOperator} onChange={e => setWhereOperator(e.target.value as QueryOperator)} options={OPERATOR_OPTIONS} />
          <Input label="Where value" value={whereValue} onChange={e => setWhereValue(e.target.value)} placeholder="abc123" />
          <Select label="Aggregate" value={aggregate} onChange={e => setAggregate(e.target.value as QueryAggregate)} options={AGG_OPTIONS} />
          <Input label="Group by" value={groupBy} onChange={e => setGroupBy(e.target.value)} placeholder="os_name" />
          <Input label="Aggregate column" value={aggregateColumn} onChange={e => setAggregateColumn(e.target.value)} placeholder="floors_climbed" />
          <Input label="Limit" type="number" min={1} max={500} value={limit} onChange={e => setLimit(e.target.value)} />
        </div>

        <div className="flex gap-2">
          <Button onClick={onRun} isLoading={queryMutation.isPending}>Run Query</Button>
        </div>

        {queryMutation.error ? (
          <p className="text-sm text-red-500">{queryMutation.error.message}</p>
        ) : null}

        {queryMutation.data ? (
          <>
            <Card className="space-y-3 bg-gray-50 dark:bg-gray-900/30">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Display Options</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
                <Select
                  label="Display type"
                  value={displayType}
                  onChange={e => setDisplayType(e.target.value as DisplayType)}
                  options={DISPLAY_OPTIONS}
                />
                <Select
                  label="X axis"
                  value={xAxisKey}
                  onChange={e => setXAxisKey(e.target.value)}
                  options={columnOptions}
                />
                <Select
                  label="Y axis"
                  value={yAxisKeysInput}
                  onChange={e => setYAxisKeysInput(e.target.value)}
                  options={columnOptions}
                />
                <Input
                  label="Y series (comma-separated)"
                  value={yAxisKeysInput}
                  onChange={e => setYAxisKeysInput(e.target.value)}
                  placeholder="value,floors_climbed,current_health"
                />
                <Select
                  label="Bar mode"
                  value={barMode}
                  onChange={e => setBarMode(e.target.value as BarMode)}
                  options={[
                    { value: 'grouped', label: 'Grouped' },
                    { value: 'stacked', label: 'Stacked' },
                  ]}
                />
                <Select
                  label="Quick Y preset"
                  value={yAxisKeys[0] ?? ''}
                  onChange={e => setYAxisKeysInput(e.target.value)}
                  options={columnOptions}
                />
                <Select
                  label="Name key (pie)"
                  value={nameKey}
                  onChange={e => setNameKey(e.target.value)}
                  options={columnOptions}
                />
                <Select
                  label="Value key (pie)"
                  value={valueKey}
                  onChange={e => setValueKey(e.target.value)}
                  options={columnOptions}
                />
              </div>

              {displayType !== 'table' ? (
                <div ref={chartWrapperRef} className="h-80 border border-gray-200 dark:border-gray-700 rounded-xl p-2 bg-white dark:bg-gray-800">
                  <ResponsiveContainer width="100%" height="100%">
                    {chartElement ?? <div />}
                  </ResponsiveContainer>
                </div>
              ) : null}

              <div className="flex gap-2">
                <Button variant="secondary" onClick={exportCsv}>Export CSV</Button>
                {displayType !== 'table' ? (
                  <Button variant="secondary" onClick={exportPng}>Export PNG</Button>
                ) : null}
              </div>
            </Card>

          <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  {queryMutation.data.columns.map(col => (
                    <th key={col} className="text-left p-2 font-medium text-gray-600 dark:text-gray-300">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {queryMutation.data.rows.map((row, index) => (
                  <tr key={index} className="border-t border-gray-100 dark:border-gray-700">
                    {queryMutation.data.columns.map(col => (
                      <td key={`${index}-${col}`} className="p-2 text-gray-800 dark:text-gray-200 align-top">
                        {String(row[col] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        ) : null}
      </Card>
    </section>
  );
}
