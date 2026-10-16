import assert from 'node:assert/strict';
import test from 'node:test';
import { mapModelPoint, requireObservation } from '../src/geometry.ts';

test('maps a rotated cropped model image back onto the original device', () => {
  const point = mapModelPoint({ x: 1, y: 0 }, {
    width: 1081, height: 2401,
    crop: { left: 100, top: 200, width: 501, height: 1001 },
    rotation: 90,
  });
  assert.deepEqual(point, { x: 100, y: 200 });
});

test('maps image edges to existing device pixels', () => {
  assert.deepEqual(mapModelPoint({ x: 1, y: 1 }, { width: 1080, height: 2400, rotation: 0 }), { x: 1079, y: 2399 });
});

test('rejects a crop outside the screen and a stale observation', () => {
  assert.throws(() => mapModelPoint({ x: 0, y: 0 }, {
    width: 100, height: 100, rotation: 0,
    crop: { left: 90, top: 0, width: 20, height: 20 },
  }), /frame/i);
  assert.throws(() => requireObservation('old', 'new'), /stale/i);
});
