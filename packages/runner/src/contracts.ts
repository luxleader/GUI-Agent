export type Point = { x: number; y: number };
export type Action =
  | { type: 'tap'; x: number; y: number }
  | { type: 'swipe'; from: Point; to: Point; durationMs: number }
  | { type: 'type'; text: string }
  | { type: 'back' | 'home' | 'finish' }
  | { type: 'wait'; ms: number };

export interface TestCase {
  id: string;
  goal: string;
  assertions: { id: string; requiredGuiCheckpoints: string[] }[];
  requiredGuiCheckpoints: string[];
}

export interface Observation {
  id: string;
  runId: string;
  width: number;
  height: number;
  screenshotRef: string;
  mode: 'simulation' | 'android';
}

export interface ScreenshotFrame {
  width: number;
  height: number;
  crop?: { left: number; top: number; width: number; height: number };
  rotation: 0 | 90 | 180 | 270;
}

export interface AssertionCheck {
  assertionId: string;
  runId: string;
  caseId: string;
  expected: string | number | boolean;
  observed: string | number | boolean;
  preconditionsMet: boolean;
  evidenceRef: string;
}

export type Status = 'PASS' | 'PRODUCT_FAIL' | 'AGENT_BLOCKED' | 'INFRA_ERROR' | 'INCONCLUSIVE';
export interface EvaluatedAssertion {
  id: string;
  outcome: 'passed' | 'failed' | 'not_evaluated' | 'blocked_by_product_defect';
  evidenceRef?: string;
  expected?: string | number | boolean;
  observed?: string | number | boolean;
}
export interface Assessment {
  status: Status;
  reason: string;
  assertions: EvaluatedAssertion[];
}
export interface OracleEvidence {
  runId: string;
  checks: AssertionCheck[];
  completedGuiCheckpoints: string[];
  executionFailure?: { reason: string; evidenceRef: string };
}
export interface TraceStep {
  index: number;
  action: Action;
  before: Observation;
  after: Observation;
}
export interface RunResult extends Assessment {
  schemaVersion: '1.0';
  runId: string;
  caseId: string;
  mode: Observation['mode'];
  steps: TraceStep[];
  incidents: { phase: string; message: string }[];
  metrics: { actions: number; policyCalls: number; elapsedMs: number };
}
