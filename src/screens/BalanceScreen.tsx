import { useState } from 'react';
import { CharacterStatsSection } from '../components/balance/CharacterStatsSection';
import { DeathStatsSection } from '../components/balance/DeathStatsSection';
import { EconomySection } from '../components/balance/EconomySection';
import { PieceStatsSection } from '../components/balance/PieceStatsSection';
import { PotionAbilitySection } from '../components/balance/PotionAbilitySection';
import { TreasureStatsSection } from '../components/balance/TreasureStatsSection';
import { DateRangeFilter } from '../components/charts/DateRangeFilter';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { useDashboardDateRange } from '../hooks/useDashboardDateRange';
import { useRunFilterOptions } from '../hooks/useRunAnalytics';
import type { StatsScope } from '../types/analytics';

type BalanceTab = 'characters' | 'items' | 'deaths' | 'economy';
type ItemSubTab = 'treasures' | 'pieces' | 'potions';

export function BalanceScreen() {
  const { range, setRange, from, to, setFrom, setTo, rangeValue, options } = useDashboardDateRange('30d');
  const [version, setVersion] = useState('');
  const [tab, setTab] = useState<BalanceTab>('characters');
  const [itemTab, setItemTab] = useState<ItemSubTab>('treasures');
  const filterOptions = useRunFilterOptions();
  const scope: StatsScope = { range: rangeValue, version: version || undefined };

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4 pb-safe-bottom">
      <header className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Balance</h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              Win rates, pick rates, and combat lethality across recorded runs.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DateRangeFilter
              value={range}
              onChange={setRange}
              options={options}
              from={from}
              to={to}
              onFromChange={setFrom}
              onToChange={setTo}
            />
            <select
              aria-label="Game version"
              value={version}
              onChange={e => setVersion(e.target.value)}
              className="rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-900 dark:text-gray-100"
            >
              <option value="">All versions</option>
              {(filterOptions.data?.versions ?? []).map(v => (
                <option key={v} value={v}>
                  v{v}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <SegmentedControl
            value={tab}
            onChange={setTab}
            options={[
              { value: 'characters', label: 'Characters' },
              { value: 'items', label: 'Items & Builds' },
              { value: 'deaths', label: 'Deaths' },
              { value: 'economy', label: 'Economy' },
            ]}
          />

          {tab === 'items' ? (
            <SegmentedControl
              size="sm"
              value={itemTab}
              onChange={setItemTab}
              options={[
                { value: 'treasures', label: 'Treasures' },
                { value: 'pieces', label: 'Pieces' },
                { value: 'potions', label: 'Potions & Abilities' },
              ]}
            />
          ) : null}
        </div>
      </header>

      {tab === 'characters' ? <CharacterStatsSection {...scope} /> : null}
      {tab === 'items' && itemTab === 'treasures' ? <TreasureStatsSection {...scope} /> : null}
      {tab === 'items' && itemTab === 'pieces' ? <PieceStatsSection {...scope} /> : null}
      {tab === 'items' && itemTab === 'potions' ? <PotionAbilitySection {...scope} /> : null}
      {tab === 'deaths' ? <DeathStatsSection {...scope} /> : null}
      {tab === 'economy' ? <EconomySection {...scope} /> : null}

      <div className="h-20" />
    </div>
  );
}
