import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { doctor } from './doctor.ts';
import { runCase } from './runner.ts';
import { writeReport } from './report.ts';
import { createCheckoutSimulation } from './simulation.ts';

try {
  try { process.loadEnvFile(); } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  const command = process.argv[2];
  if (command === 'doctor') {
    const report = doctor();
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.prerequisitesReady ? 0 : 2;
  } else if (command === 'demo') {
    const index = process.argv.indexOf('--output');
    if (index >= 0 && !process.argv[index + 1]) throw new Error('--output requires a directory');
    const output = resolve(index >= 0 ? process.argv[index + 1] : 'artifacts/demo');
    const runs = [];
    for (const faulty of [false, true]) {
      const runId = `simulation-${randomUUID()}`;
      const setup = createCheckoutSimulation(runId, faulty);
      const result = await runCase(setup.testCase, setup.policy, setup.driver, setup.oracle, { runId });
      runs.push({ status: result.status, ...await writeReport(result, output) });
    }
    console.log(JSON.stringify({ mode: 'simulation', warning: 'Deterministic fixture; no device, browser, or model was evaluated.', runs }, null, 2));
    if (runs[0].status !== 'PASS' || runs[1].status !== 'PRODUCT_FAIL') process.exitCode = 1;
  } else {
    throw new Error('Usage: cli.ts demo [--output DIRECTORY] | doctor');
  }
} catch (error) {
  let message = error instanceof Error ? error.message : String(error);
  const key = process.env.MIDSCENE_MODEL_API_KEY;
  if (key) message = message.replaceAll(key, '[REDACTED]');
  console.error(message);
  process.exitCode = 1;
}
