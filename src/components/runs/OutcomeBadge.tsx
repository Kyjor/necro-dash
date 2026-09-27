import { Badge } from '../ui/Badge';
import { OUTCOME_COLORS } from '../../utils/runFormat';
import type { RunListRow } from '../../types/analytics';

export function OutcomeBadge({ run }: { run: Pick<RunListRow, 'outcome' | 'run_uuid'> }) {
  const outcome = run.outcome ?? 'abandoned';
  return (
    <span className="inline-flex gap-1">
      <Badge label={outcome} color={OUTCOME_COLORS[outcome]} />
      {run.run_uuid ? null : <Badge label="legacy" color={OUTCOME_COLORS.legacy} />}
    </span>
  );
}
