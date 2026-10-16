import assert from 'node:assert/strict';
import test from 'node:test';
import type { OracleEvidence, TestCase } from '../src/contracts.ts';
import { assessCase, payableCents } from '../src/oracle.ts';

const testCase: TestCase = {
  id: 'checkout', goal: 'Use coupon and submit an order',
  assertions: [
    { id: 'amount', requiredGuiCheckpoints: ['submit-order'] },
    { id: 'order-state', requiredGuiCheckpoints: ['submit-order'] },
  ], requiredGuiCheckpoints: ['submit-order'],
};
function evidence(observed = 26900): OracleEvidence {
  return { runId: 'run-1', completedGuiCheckpoints: ['submit-order'], checks: [
    { assertionId: 'amount', runId: 'run-1', caseId: 'checkout', expected: 26900, observed, preconditionsMet: true, evidenceRef: 'order.json' },
    { assertionId: 'order-state', runId: 'run-1', caseId: 'checkout', expected: 'submitted', observed: 'submitted', preconditionsMet: true, evidenceRef: 'order.json' },
  ] };
}

test('requires every assertion and GUI checkpoint before reporting pass', () => {
  assert.equal(assessCase(testCase, evidence()).status, 'PASS');
  const missing = evidence(); missing.checks.pop();
  assert.equal(assessCase(testCase, missing).status, 'INCONCLUSIVE');
  assert.equal(assessCase(testCase, { ...evidence(), completedGuiCheckpoints: [] }).status, 'INCONCLUSIVE');
});

test('detects backend amount mismatch even when the interface looks correct', () => {
  assert.equal(assessCase(testCase, evidence(29900)).status, 'PRODUCT_FAIL');
});

test('keeps proven product failure when it blocks later assertions', () => {
  const partial = evidence(29900); partial.checks.pop();
  const result = assessCase(testCase, partial);
  assert.equal(result.status, 'PRODUCT_FAIL');
  assert.equal(result.assertions[1].outcome, 'blocked_by_product_defect');
});

test('does not call an unmet precondition or wrong GUI path a product defect', () => {
  const invalid = evidence(29900); invalid.checks[0].preconditionsMet = false;
  invalid.executionFailure = { reason: 'Selected wrong SKU', evidenceRef: 'wrong-sku.png' };
  assert.equal(assessCase(testCase, invalid).status, 'AGENT_BLOCKED');
  assert.equal(assessCase(testCase, { ...evidence(29900), completedGuiCheckpoints: [] }).status, 'INCONCLUSIVE');
});

test('rejects empty assertions and evidence belonging to a different run', () => {
  assert.throws(() => assessCase({ ...testCase, assertions: [] }, evidence()), /assertion/i);
  const foreign = evidence(); foreign.checks[0].runId = 'run-2';
  assert.throws(() => assessCase(testCase, foreign), /evidence/i);
});

test('uses integer cents and rejects impossible discounts', () => {
  assert.equal(payableCents(29900, 3000), 26900);
  assert.throws(() => payableCents(29900.5, 3000), /cent/i);
  assert.throws(() => payableCents(100, 101), /cent/i);
});
