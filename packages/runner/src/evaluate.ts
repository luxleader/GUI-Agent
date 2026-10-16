import type { RunResult } from './contracts.ts';
export interface ScheduledAttempt { id: string; runId: string; caseId: string; cohort: 'healthy' | 'mutant'; expectedAssertionId?: string; }
export interface CompletedAttempt { attemptId: string; result: RunResult; }
export function aggregateRuns(scheduled: ScheduledAttempt[], completed: CompletedAttempt[]) {
  const ids = new Set(scheduled.map(item => item.id));
  if (ids.size !== scheduled.length) throw new Error('Duplicate scheduled attempt');
  if (new Set(scheduled.map(item => item.runId)).size !== scheduled.length) throw new Error('Duplicate scheduled run identity');
  if (scheduled.some(item => !item.id || !item.runId || !item.caseId || (item.cohort === 'mutant' && !item.expectedAssertionId))) {
    throw new Error('Invalid attempt definition');
  }
  const results = new Map<string, RunResult>();
  for (const item of completed) {
    if (results.has(item.attemptId)) throw new Error('Duplicate completed attempt');
    if (!ids.has(item.attemptId)) throw new Error('Completed attempt was not scheduled');
    const attempt = scheduled.find(attempt => attempt.id === item.attemptId)!;
    if (item.result.runId !== attempt.runId || item.result.caseId !== attempt.caseId) {
      throw new Error('Run or case identity does not match scheduled attempt');
    }
    results.set(item.attemptId, item.result);
  }
  let missing = 0, mutants = 0, healthy = 0, detections = 0, falsePositives = 0, passes = 0;
  const statuses: Record<RunResult['status'], number> = { PASS: 0, PRODUCT_FAIL: 0, AGENT_BLOCKED: 0, INFRA_ERROR: 0, INCONCLUSIVE: 0 };
  for (const attempt of scheduled) {
    const result = results.get(attempt.id);
    if (!result) missing++;
    statuses[result?.status ?? 'INCONCLUSIVE']++;
    if (attempt.cohort === 'mutant') {
      mutants++;
      if (result?.status === 'PRODUCT_FAIL' && result.assertions.some(check => check.id === attempt.expectedAssertionId
          && check.outcome === 'failed' && check.evidenceRef)) detections++;
    } else {
      healthy++;
      if (result?.status === 'PRODUCT_FAIL') falsePositives++;
      if (result?.status === 'PASS') passes++;
    }
  }
  return { scheduled: scheduled.length, missing, statuses, detections, mutants, healthy,
    defectRecall: mutants ? detections / mutants : null,
    falsePositiveRate: healthy ? falsePositives / healthy : null,
    healthyPassRate: healthy ? passes / healthy : null };
}
