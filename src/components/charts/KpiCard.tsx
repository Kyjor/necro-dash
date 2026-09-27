import { Card } from '../ui/Card';

interface KpiCardProps {
  label: string;
  value: string;
  helper?: string;
}

export function KpiCard({ label, value, helper }: KpiCardProps) {
  return (
    <Card>
      <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{value}</p>
      {helper ? <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{helper}</p> : null}
    </Card>
  );
}
