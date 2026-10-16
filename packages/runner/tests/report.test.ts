import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { writeReport } from '../src/report.ts';
import type { RunResult } from '../src/contracts.ts';

test('writes replayable JSON and escapes report content without overwriting history', async () => {
  const testRoot = resolve('artifacts', 'test-tmp');
  await mkdir(testRoot, { recursive: true });
  const root = await mkdtemp(join(testRoot, 'report-'));
  try {
    const result: RunResult = { schemaVersion: '1.0', runId: 'run-1', caseId: '<script>bad()</script>',
      status: 'INCONCLUSIVE', reason: '<img src=x onerror=alert(1)>', mode: 'simulation', assertions: [], steps: [], incidents: [],
      metrics: { actions: 0, policyCalls: 0, elapsedMs: 1 } };
    const paths = await writeReport(result, root);
    assert.equal(JSON.parse(await readFile(paths.json, 'utf8')).caseId, result.caseId);
    const html = await readFile(paths.html, 'utf8');
    assert.equal(html.includes('<script>bad()'), false);
    assert.equal(html.includes('&lt;img'), true);
    await assert.rejects(() => writeReport(result, root), /exist/i);
    await assert.rejects(() => writeReport({ ...result, runId: '../escape' }, root), /run id/i);
  } finally {
    if (resolve(root).startsWith(join(testRoot, 'report-'))) {
      await rm(root, { recursive: true, force: true });
    }
  }
});
