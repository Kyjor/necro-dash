import type { DateRangeKey } from '../../types/analytics';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';

interface DateRangeFilterProps {
  value: DateRangeKey;
  onChange: (value: DateRangeKey) => void;
  options: Array<{ value: DateRangeKey; label: string }>;
  from?: string;
  to?: string;
  onFromChange?: (value: string) => void;
  onToChange?: (value: string) => void;
}

export function DateRangeFilter({
  value,
  onChange,
  options,
  from,
  to,
  onFromChange,
  onToChange,
}: DateRangeFilterProps) {
  return (
    <div className="w-full flex flex-col sm:flex-row gap-2 sm:items-end">
      <div className="w-full sm:w-64">
        <Select
          label="Date range"
          value={value}
          onChange={event => onChange(event.target.value as DateRangeKey)}
          options={options}
        />
      </div>
      {value === 'custom' ? (
        <>
          <div className="w-full sm:w-44">
            <Input label="From" type="date" value={from ?? ''} onChange={e => onFromChange?.(e.target.value)} />
          </div>
          <div className="w-full sm:w-44">
            <Input label="To" type="date" value={to ?? ''} onChange={e => onToChange?.(e.target.value)} />
          </div>
        </>
      ) : null}
    </div>
  );
}
