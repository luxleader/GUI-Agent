import assert from 'node:assert/strict';
import test from 'node:test';
import type { Action, Observation, OracleEvidence, TestCase, TraceStep } from '../src/contracts.ts';
import { runCase } from '../src/runner.ts';
import type { Driver, Policy } from '../src/runner.ts';

const checkout: TestCase = {
  id: 'checkout', goal: 'Submit coupon order',
  assertions: [{ id: 'amount', requiredGuiCheckpoints: ['submit'] }],
  requiredGuiCheckpoints: ['submit'],
};
function rig(options: { neverComplete?: boolean; faulty?: boolean; disconnect?: boolean; cleanupFails?: boolean } = {}) {
  let count = 0;
  let closed = false;
  const observation = (): Observation => ({ id: `frame-${count}`, runId: 'run-1', width: 1080, height: 2400, screenshotRef: 'simulation:checkout', mode: 'simulation' });
  const driver: Driver = {
    mode: 'simulation',
    async observe() { return observation(); },
    async execute(_action, id) {
      assert.equal(id, `frame-${count}`);
      if (options.disconnect) throw new Error('Device disconnected');
      count++; return observation();
    },
    async close() { closed = true; if (options.cleanupFails) throw new Error('Reset failed'); },
  };
  const oracle = async (_testCase: TestCase, _steps: TraceStep[]): Promise<OracleEvidence> => ({
    runId: 'run-1', completedGuiCheckpoints: count > 0 && !options.neverComplete ? ['submit'] : [],
    checks: count > 0 && !options.neverComplete ? [{ assertionId: 'amount', caseId: 'checkout', runId: 'run-1',
      expected: 26900, observed: options.faulty ? 29900 : 26900, preconditionsMet: true, evidenceRef: 'simulation:order' }] : [],
  });
  return { driver, oracle, get count() { return count; }, get closed() { return closed; } };
}
const tapping: Policy = { async next() { return { type: 'tap', x: 0.5, y: 0.5 }; } };

test('executes a valid policy and returns independently verified pass', async () => {
  const setup = rig();
  const result = await runCase(checkout, tapping, setup.driver, setup.oracle, { runId: 'run-1' });
  assert.equal(result.status, 'PASS');
  assert.equal(result.steps.length, 1);
  assert.equal(result.steps[0].before.id, 'frame-0');
  assert.equal(result.steps[0].after.id, 'frame-1');
  assert.equal(setup.closed, true);
});

test('never executes an action beyond the configured budget', async () => {
  const setup = rig({ neverComplete: true });
  const result = await runCase(checkout, tapping, setup.driver, setup.oracle, { runId: 'run-1', maxActions: 2 });
  assert.equal(setup.count, 2);
  assert.equal(result.status, 'AGENT_BLOCKED');
  assert.equal(result.metrics.actions, 2);
  assert.equal(setup.closed, true);
});

test('does not send malformed policy actions to the device', async () => {
  const setup = rig();
  const invalid: Policy = { async next() { return { type: 'tap', x: 4, y: 0 }; } };
  const result = await runCase(checkout, invalid, setup.driver, setup.oracle, { runId: 'run-1' });
  assert.equal(setup.count, 0);
  assert.equal(result.status, 'AGENT_BLOCKED');
});

test('keeps a device disconnect as infrastructure failure', async () => {
  const setup = rig({ disconnect: true });
  const result = await runCase(checkout, tapping, setup.driver, setup.oracle, { runId: 'run-1' });
  assert.equal(result.status, 'INFRA_ERROR');
  assert.equal(setup.closed, true);
});

test('does not let cleanup failure erase a proven product defect', async () => {
  const setup = rig({ faulty: true, cleanupFails: true });
  const result = await runCase(checkout, tapping, setup.driver, setup.oracle, { runId: 'run-1' });
  assert.equal(result.status, 'PRODUCT_FAIL');
  assert.equal(result.incidents.some(item => item.message.includes('Reset failed')), true);
});

test('aborts a stalled policy without waiting indefinitely', async () => {
  const setup = rig();
  let signalSeen: AbortSignal | undefined;
  const stalled: Policy = { async next(_input, signal) { signalSeen = signal; return new Promise<Action>(() => {}); } };
  const result = await runCase(checkout, stalled, setup.driver, setup.oracle, { runId: 'run-1', maxDurationMs: 25 });
  assert.equal(result.status, 'INFRA_ERROR');
  assert.equal(signalSeen?.aborted, true);
  assert.equal(setup.count, 0);
  assert.equal(setup.closed, true);
});

test('separates model service failure from invalid agent output', async () => {
  const setup = rig();
  const unavailable: Policy = { async next() { throw new Error('Provider connection refused'); } };
  const result = await runCase(checkout, unavailable, setup.driver, setup.oracle, { runId: 'run-1' });
  assert.equal(result.status, 'INFRA_ERROR');
  assert.equal(setup.count, 0);
});

test('does not dispatch an action when synchronous policy work exceeds the deadline', async () => {
  const setup = rig();
  const blocking: Policy = { async next() {
    const end = performance.now() + 40;
    while (performance.now() < end) { /* deliberately blocks the timer event loop */ }
    return { type: 'tap', x: 0.5, y: 0.5 };
  } };
  const result = await runCase(checkout, blocking, setup.driver, setup.oracle, { runId: 'run-1', maxDurationMs: 15 });
  assert.equal(setup.count, 0);
  assert.notEqual(result.status, 'PASS');
});

test('does not expose private oracle expectations to the policy', async () => {
  const setup = rig();
  let exposed = '';
  const policy: Policy = { async next(input) { exposed = JSON.stringify(input); return { type: 'tap', x: 0, y: 0 }; } };
  const result = await runCase(checkout, policy, setup.driver, setup.oracle, { runId: 'run-1' });
  assert.equal(result.status, 'PASS');
  assert.equal(exposed.includes('26900'), false);
  assert.equal(exposed.includes('assertions'), false);
});
