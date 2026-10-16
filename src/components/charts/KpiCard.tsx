import { Card } from '../ui/Card';

export type KpiTone = 'neutral' | 'good' | 'warn' | 'danger';

interface KpiCardProps {
  label: string;
  value: string;
  helper?: string;
  tone?: KpiTone;
  onClick?: () => void;
}

const VALUE_TONE_CLASSES: Record<KpiTone, string> = {
  neutral: 'text-gray-900 dark:text-gray-100',
  good: 'text-emerald-600 dark:text-emerald-400',
  warn: 'text-amber-600 dark:text-amber-400',
  danger: 'text-red-600 dark:text-red-400',
};

const BORDER_TONE_CLASSES: Record<KpiTone, string> = {
  neutral: '',
  good: 'border-emerald-500/20 dark:border-emerald-500/30',
  warn: 'border-amber-500/20 dark:border-amber-500/30',
  danger: 'border-red-500/20 dark:border-red-500/30',
};

export function KpiCard({ label, value, helper, tone = 'neutral', onClick }: KpiCardProps) {
  return (
    <Card onClick={onClick} className={`p-3.5 ${BORDER_TONE_CLASSES[tone]}`}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 truncate">
        {label}
      </p>
      <p className={`mt-0.5 text-xl sm:text-2xl font-bold tracking-tight truncate ${VALUE_TONE_CLASSES[tone]}`}>
        {value}
      </p>
      {helper ? (
        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">{helper}</p>
      ) : null}
    </Card>
  );
}
