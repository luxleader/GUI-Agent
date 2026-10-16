import assert from 'node:assert/strict';
import test from 'node:test';
import { aggregateRuns } from '../src/evaluate.ts';
import type { RunResult } from '../src/contracts.ts';

function result(status: RunResult['status'], failedId = 'amount'): RunResult {
  return { schemaVersion: '1.0', runId: 'r', caseId: 'c', status, reason: 'Recorded observation', mode: 'simulation', steps: [],
    assertions: status === 'PRODUCT_FAIL' ? [{ id: failedId, outcome: 'failed', evidenceRef: 'order.json' }] : [],
    incidents: [], metrics: { actions: 0, policyCalls: 0, elapsedMs: 0 } };
}
const scheduled = [1, 2, 3].map(n => ({ id: `mutant-${n}`, cohort: 'mutant' as const, expectedAssertionId: 'amount' }));

test('one detection across three attempts counts as one third, including missing results', () => {
  const report = aggregateRuns(scheduled, [{ attemptId: 'mutant-1', result: result('PRODUCT_FAIL') }, { attemptId: 'mutant-2', result: result('INFRA_ERROR') }]);
  assert.equal(report.scheduled, 3);
  assert.equal(report.missing, 1);
  assert.equal(report.defectRecall, 1 / 3);
});

test('does not count unrelated defects or agent blocks as the target defect', () => {
  const report = aggregateRuns(scheduled, [{ attemptId: 'mutant-1', result: result('PRODUCT_FAIL', 'unrelated') }, { attemptId: 'mutant-2', result: result('AGENT_BLOCKED') }]);
  assert.equal(report.defectRecall, 0);
});

test('rejects duplicate attempts rather than inflating the evaluation', () => {
  const completed = [{ attemptId: 'mutant-1', result: result('PRODUCT_FAIL') }];
  assert.throws(() => aggregateRuns(scheduled, [...completed, ...completed]), /duplicate/i);
});
