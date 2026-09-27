import type { ReactNode } from 'react';
import { Card } from '../ui/Card';
import { Spinner } from '../ui/Spinner';
import { EmptyState } from '../ui/EmptyState';

interface ChartWidgetProps {
  title: string;
  isLoading: boolean;
  error: Error | null;
  isEmpty: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  children: ReactNode;
}

export function ChartWidget({
  title,
  isLoading,
  error,
  isEmpty,
  emptyTitle = 'No data available',
  emptyDescription = 'Try a wider date range.',
  children,
}: ChartWidgetProps) {
  return (
    <Card className="h-full">
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">{title}</h3>
      {isLoading ? (
        <div className="h-56 flex items-center justify-center">
          <Spinner className="text-primary-500" />
        </div>
      ) : error ? (
        <div className="h-56 flex items-center justify-center text-sm text-red-500 text-center px-3">
          {error.message}
        </div>
      ) : isEmpty ? (
        <EmptyState emoji="📉" title={emptyTitle} description={emptyDescription} />
      ) : (
        children
      )}
    </Card>
  );
}
