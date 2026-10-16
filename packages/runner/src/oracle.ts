import type { Assessment, EvaluatedAssertion, OracleEvidence, TestCase } from './contracts.ts';

export function payableCents(total: number, discount: number): number {
  if (![total, discount].every(n => Number.isSafeInteger(n) && n >= 0) || discount > total) {
    throw new Error('Invalid cent amounts');
  }
  return total - discount;
}

export function assessCase(testCase: TestCase, evidence: OracleEvidence): Assessment {
  const ids = new Set(testCase.assertions.map(item => item.id));
  if (ids.size === 0 || ids.size !== testCase.assertions.length || [...ids].some(id => !id.trim())) {
    throw new Error('Required assertions must be nonempty and unique');
  }
  const seen = new Set<string>();
  for (const check of evidence.checks) {
    if (!ids.has(check.assertionId) || seen.has(check.assertionId)
        || check.runId !== evidence.runId || check.caseId !== testCase.id
        || !check.evidenceRef.trim() || !evidence.runId.trim()
        || [check.expected, check.observed].some(value => typeof value === 'number' && !Number.isFinite(value))) {
      throw new Error('Invalid assertion evidence or run binding');
    }
    seen.add(check.assertionId);
  }
  const checkpoints = new Set(evidence.completedGuiCheckpoints);
  const assertions: EvaluatedAssertion[] = testCase.assertions.map(requirement => {
    const check = evidence.checks.find(item => item.assertionId === requirement.id);
    const activated = check?.preconditionsMet && requirement.requiredGuiCheckpoints.every(id => checkpoints.has(id));
    if (!check || !activated) return { id: requirement.id, outcome: 'not_evaluated' };
    return { id: requirement.id, outcome: Object.is(check.expected, check.observed) ? 'passed' : 'failed',
      expected: check.expected, observed: check.observed, evidenceRef: check.evidenceRef };
  });
  if (assertions.some(item => item.outcome === 'failed')) {
    for (const item of assertions) if (item.outcome === 'not_evaluated') item.outcome = 'blocked_by_product_defect';
    return { status: 'PRODUCT_FAIL', reason: 'Independent assertion proves a product defect', assertions };
  }
  if (assertions.every(item => item.outcome === 'passed') && testCase.requiredGuiCheckpoints.every(id => checkpoints.has(id))) {
    return { status: 'PASS', reason: 'All required assertions and GUI checkpoints verified', assertions };
  }
  if (evidence.executionFailure?.evidenceRef.trim()) {
    return { status: 'AGENT_BLOCKED', reason: evidence.executionFailure.reason, assertions };
  }
  return { status: 'INCONCLUSIVE', reason: 'Required evidence or GUI checkpoint missing', assertions };
}
