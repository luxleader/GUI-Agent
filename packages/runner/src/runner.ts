import type { Action, Observation, OracleEvidence, RunResult, TestCase, TraceStep } from './contracts.ts';
import { assessCase } from './oracle.ts';
import { ActionValidationError, parseAction } from './validation.ts';

export interface Driver {
  mode: Observation['mode'];
  observe(signal: AbortSignal): Promise<Observation>;
  execute(action: Action, observationId: string, signal: AbortSignal): Promise<Observation>;
  close(quarantine: boolean): Promise<void>;
}
export interface Policy {
  next(input: { goal: string; observation: Observation; history: TraceStep[] }, signal: AbortSignal): Promise<unknown>;
}
export interface RunOptions { runId: string; maxActions?: number; maxDurationMs?: number; }
export type Oracle = (testCase: TestCase, steps: TraceStep[], signal: AbortSignal) => Promise<OracleEvidence>;

function cancellable<T>(work: () => Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (signal.aborted) { reject(signal.reason); return; }
    const aborted = () => reject(signal.reason);
    signal.addEventListener('abort', aborted, { once: true });
    Promise.resolve().then(work).then(resolve, reject).finally(() => signal.removeEventListener('abort', aborted));
  });
}

export async function runCase(testCase: TestCase, policy: Policy, driver: Driver, oracle: Oracle, options: RunOptions): Promise<RunResult> {
  const frozenCase = structuredClone(testCase);
  const maxActions = options.maxActions ?? 40;
  const duration = options.maxDurationMs ?? 300000;
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(options.runId)
      || !Number.isSafeInteger(maxActions) || maxActions < 1
      || !Number.isSafeInteger(duration) || duration < 1) throw new Error('Invalid run options');
  const initial = assessCase(frozenCase, { runId: options.runId, checks: [], completedGuiCheckpoints: [] });
  const started = performance.now();
  const result: RunResult = { ...initial, schemaVersion: '1.0', runId: options.runId, caseId: frozenCase.id,
    mode: driver.mode, steps: [], incidents: [], metrics: { actions: 0, policyCalls: 0, elapsedMs: 0 } };
  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(new Error('Run deadline exceeded')), duration);
  function checkDeadline(): void {
    if (performance.now() - started >= duration && !controller.signal.aborted) {
      controller.abort(new Error('Run deadline exceeded'));
    }
    controller.signal.throwIfAborted();
  }
  async function withinBudget<T>(work: () => Promise<T>): Promise<T> {
    checkDeadline();
    const value = await cancellable(work, controller.signal);
    checkDeadline();
    return value;
  }
  let phase = 'observe';
  let quarantine = false;
  let observation: Observation | undefined;
  function verifyObservation(value: Observation): Observation {
    if (value.runId !== options.runId || !value.id || !value.screenshotRef || value.mode !== driver.mode
        || ![value.width, value.height].every(n => Number.isSafeInteger(n) && n > 0)) {
      throw new Error('Invalid device observation or run binding');
    }
    return value;
  }
  async function inspect(): Promise<void> {
    phase = 'oracle';
    const evidence = await withinBudget(() => oracle(structuredClone(frozenCase), structuredClone(result.steps), controller.signal));
    if (evidence.runId !== options.runId) throw new Error('Oracle evidence belongs to a different run');
    Object.assign(result, assessCase(frozenCase, evidence));
  }
  try {
    observation = verifyObservation(await withinBudget(() => driver.observe(controller.signal)));
    while (result.metrics.actions < maxActions) {
      phase = 'policy';
      result.metrics.policyCalls++;
      const policyObservation = observation;
      const raw = await withinBudget(() => policy.next({ goal: frozenCase.goal,
        observation: structuredClone(policyObservation), history: structuredClone(result.steps) }, controller.signal));
      const action = parseAction(raw);
      if (action.type === 'finish') { await inspect(); break; }
      phase = 'execute';
      checkDeadline();
      result.metrics.actions++;
      const before = structuredClone(observation);
      observation = verifyObservation(await withinBudget(() => driver.execute(action, before.id, controller.signal)));
      result.steps.push({ index: result.steps.length, action, before, after: structuredClone(observation) });
      await inspect();
      if (result.status === 'PASS' || result.status === 'PRODUCT_FAIL' || result.status === 'AGENT_BLOCKED') break;
    }
    if (result.metrics.actions >= maxActions && result.status === 'INCONCLUSIVE') {
      result.status = 'AGENT_BLOCKED'; result.reason = 'GUI action budget exhausted';
      result.incidents.push({ phase: 'budget', message: result.reason });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    result.incidents.push({ phase, message });
    result.status = error instanceof ActionValidationError ? 'AGENT_BLOCKED' : 'INFRA_ERROR';
    result.reason = message;
    quarantine = phase === 'execute' || phase === 'observe';
  } finally {
    clearTimeout(deadline);
    controller.abort(new Error('Run finished'));
    const cleanup = new AbortController();
    const cleanupDeadline = setTimeout(() => cleanup.abort(new Error('Device cleanup deadline exceeded')), 1000);
    try {
      await cancellable(() => driver.close(quarantine), cleanup.signal);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.incidents.push({ phase: 'cleanup', message });
      if (result.status !== 'PRODUCT_FAIL') { result.status = 'INFRA_ERROR'; result.reason = message; }
    } finally { clearTimeout(cleanupDeadline); }
    result.metrics.elapsedMs = Math.round(performance.now() - started);
  }
  return result;
}
