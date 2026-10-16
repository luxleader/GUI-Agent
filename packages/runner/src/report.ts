import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { RunResult } from './contracts.ts';

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
}

export async function writeReport(result: RunResult, root: string): Promise<{ json: string; html: string }> {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(result.runId)) throw new Error('Invalid run id');
  const directory = join(resolve(root), result.runId);
  await mkdir(resolve(root), { recursive: true });
  await mkdir(directory);
  const paths = { json: join(directory, 'result.json'), html: join(directory, 'report.html') };
  const payload = JSON.stringify(result, null, 2);
  const html = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>GUI Agent ${escapeHtml(result.runId)}</title><body><h1>${escapeHtml(result.caseId)}</h1>
<p>Execution mode: <strong>${escapeHtml(result.mode)}</strong></p><p>${escapeHtml(result.status)}: ${escapeHtml(result.reason)}</p>
<pre>${escapeHtml(payload)}</pre></body></html>`;
  await writeFile(paths.json, payload + '\n', { flag: 'wx' });
  await writeFile(paths.html, html, { flag: 'wx' });
  return paths;
}
