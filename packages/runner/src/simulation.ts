import type { Observation, OracleEvidence, TestCase } from './contracts.ts';
import type { Driver, Oracle, Policy } from './runner.ts';
import { requireObservation } from './geometry.ts';

// A deterministic business fixture. It deliberately does not emulate a real GUI.
export function createCheckoutSimulation(runId: string, faulty: boolean): { testCase: TestCase; driver: Driver; policy: Policy; oracle: Oracle } {
  let sequence = 0;
  let submitted = false;
  let closed = false;
  const testCase: TestCase = {
    id: 'coupon-checkout', goal: 'Apply the 30 yuan coupon to a 299 yuan item and submit the order',
    assertions: [
      { id: 'payable-amount', requiredGuiCheckpoints: ['submit-order'] },
      { id: 'order-status', requiredGuiCheckpoints: ['submit-order'] },
    ], requiredGuiCheckpoints: ['submit-order'],
  };
  const observe = (): Observation => {
    if (closed) throw new Error('Simulation session closed');
    return { id: `observation-${sequence}`, runId, width: 1080, height: 2400,
      screenshotRef: `simulation:checkout/${sequence}`, mode: 'simulation' };
  };
  const driver: Driver = {
    mode: 'simulation',
    async observe() { return observe(); },
    async execute(action, observationId) {
      requireObservation(observationId, observe().id);
      if (action.type === 'tap' && action.x >= 0.5 && action.y >= 0.7) submitted = true;
      sequence++;
      return observe();
    },
    async close() { closed = true; },
  };
  const policy: Policy = { async next() { return { type: 'tap', x: 0.75, y: 0.9 }; } };
  const oracle: Oracle = async (): Promise<OracleEvidence> => ({
    runId, completedGuiCheckpoints: submitted ? ['submit-order'] : [],
    checks: submitted ? [
      { assertionId: 'payable-amount', runId, caseId: testCase.id, expected: 26900,
        observed: faulty ? 29900 : 26900, preconditionsMet: true, evidenceRef: 'simulation:order-record' },
      { assertionId: 'order-status', runId, caseId: testCase.id, expected: 'submitted',
        observed: 'submitted', preconditionsMet: true, evidenceRef: 'simulation:order-record' },
    ] : [],
  });
  return { testCase, driver, policy, oracle };
}
