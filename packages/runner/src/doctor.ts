import { spawnSync } from 'node:child_process';

export function doctor() {
  const adb = spawnSync('adb', ['version'], { encoding: 'utf8', timeout: 3000, windowsHide: true });
  let midsceneInstalled = false;
  try { import.meta.resolve('@midscene/android'); midsceneInstalled = true; } catch { /* optional until device integration */ }
  const checks = {
    nodeSupported: Number(process.versions.node.split('.')[0]) >= 24,
    adbAvailable: adb.status === 0,
    midsceneInstalled,
    modelEndpointConfigured: Boolean(process.env.MIDSCENE_MODEL_BASE_URL),
    modelNameConfigured: Boolean(process.env.MIDSCENE_MODEL_NAME),
    modelKeyConfigured: Boolean(process.env.MIDSCENE_MODEL_API_KEY),
  };
  return { mode: 'prerequisite-check', nodeVersion: process.versions.node, checks,
    prerequisitesReady: Object.values(checks).every(Boolean), deviceOrModelVerified: false };
}
