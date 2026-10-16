interface SegmentOption<T extends string> {
  value: T;
  label: string;
  count?: number | string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  className?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  className = '',
}: SegmentedControlProps<T>) {
  const isSm = size === 'sm';

  return (
    <div
      role="tablist"
      className={[
        'inline-flex items-center gap-1 rounded-xl bg-gray-100 dark:bg-gray-800/90 p-1 overflow-x-auto max-w-full no-scrollbar',
        className,
      ].join(' ')}
    >
      {options.map(option => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={[
              'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-medium transition-all',
              isSm ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-xs sm:text-sm',
              active
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200',
            ].join(' ')}
          >
            <span>{option.label}</span>
            {option.count !== undefined ? (
              <span
                className={[
                  'rounded-full px-1.5 py-0.2 text-[10px] font-semibold',
                  active
                    ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400'
                    : 'bg-gray-200/70 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
                ].join(' ')}
              >
                {option.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
