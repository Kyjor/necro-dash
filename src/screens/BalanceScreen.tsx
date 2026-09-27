import { useState } from 'react';
import { CharacterStatsSection } from '../components/balance/CharacterStatsSection';
import { DeathStatsSection } from '../components/balance/DeathStatsSection';
import { EconomySection } from '../components/balance/EconomySection';
import { PieceStatsSection } from '../components/balance/PieceStatsSection';
import { PotionAbilitySection } from '../components/balance/PotionAbilitySection';
import { TreasureStatsSection } from '../components/balance/TreasureStatsSection';
import { DateRangeFilter } from '../components/charts/DateRangeFilter';
import { Select } from '../components/ui/Select';
import { useDashboardDateRange } from '../hooks/useDashboardDateRange';
import { useRunFilterOptions } from '../hooks/useRunAnalytics';
import type { StatsScope } from '../types/analytics';

export function BalanceScreen() {
  const { range, setRange, from, to, setFrom, setTo, rangeValue, options } = useDashboardDateRange('30d');
  const [version, setVersion] = useState('');
  const filterOptions = useRunFilterOptions();
  const scope: StatsScope = { range: rangeValue, version: version || undefined };

  return (
    <div className="h-full overflow-y-auto p-4 space-y-6 pb-safe-bottom">
      <header className="space-y-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Balance</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Aggregates across recorded runs. Legacy runs (before full run analytics) are excluded.
          </p>
        </div>
        <DateRangeFilter
          value={range}
          onChange={setRange}
          options={options}
          from={from}
          to={to}
          onFromChange={setFrom}
          onToChange={setTo}
        />
        <Select
          label="Version"
          value={version}
          onChange={e => setVersion(e.target.value)}
          options={[
            { value: '', label: 'All versions' },
            ...(filterOptions.data?.versions ?? []).map(v => ({ value: v, label: v })),
          ]}
        />
      </header>

      <CharacterStatsSection {...scope} />
      <TreasureStatsSection {...scope} />
      <PieceStatsSection {...scope} />
      <PotionAbilitySection {...scope} />
      <DeathStatsSection {...scope} />
      <EconomySection {...scope} />
      <div className="h-20" />
    </div>
  );
}
