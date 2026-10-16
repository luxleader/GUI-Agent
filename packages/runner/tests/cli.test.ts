import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import test from 'node:test';

const cli = resolve('packages/runner/src/cli.ts');
test('demo distinguishes a verified checkout from a seeded amount defect', async () => {
  const parent = resolve('artifacts', 'test-tmp');
  await mkdir(parent, { recursive: true });
  const root = await mkdtemp(join(parent, 'cli-'));
  try {
    const child = spawnSync(process.execPath, [cli, 'demo', '--output', root], { encoding: 'utf8' });
    assert.equal(child.status, 0, child.stderr);
    const output = JSON.parse(child.stdout);
    assert.equal(output.mode, 'simulation');
    assert.deepEqual(output.runs.map((run: { status: string }) => run.status), ['PASS', 'PRODUCT_FAIL']);
    const defective = JSON.parse(await readFile(output.runs[1].json, 'utf8'));
    assert.equal(defective.assertions[0].observed, 29900);
    assert.equal(defective.steps.length, 1);
  } finally {
    if (resolve(root).startsWith(join(parent, 'cli-'))) await rm(root, { recursive: true, force: true });
  }
});

test('doctor reports missing prerequisites and never prints API credentials', () => {
  const secret = 'DO-NOT-PRINT-THIS-KEY';
  const child = spawnSync(process.execPath, [cli, 'doctor'], { encoding: 'utf8',
    env: { ...process.env, MIDSCENE_MODEL_API_KEY: secret, MIDSCENE_MODEL_BASE_URL: '', MIDSCENE_MODEL_NAME: '' } });
  assert.equal(child.status, 2);
  const report = JSON.parse(child.stdout);
  assert.equal(report.prerequisitesReady, false);
  assert.equal(report.deviceOrModelVerified, false);
  assert.equal(child.stdout.includes(secret), false);
  assert.equal(child.stderr.includes(secret), false);
});
