import assert from 'node:assert/strict';
import test from 'node:test';
import { parseAction } from '../src/validation.ts';

test('accepts a normalized action without changing its coordinates', () => {
  assert.deepEqual(parseAction({ type: 'tap', x: 0.25, y: 1 }), { type: 'tap', x: 0.25, y: 1 });
});

test('rejects out-of-screen and nonfinite coordinates before execution', () => {
  for (const x of [-0.1, 1.1, NaN, Infinity]) {
    assert.throws(() => parseAction({ type: 'tap', x, y: 0.5 }), /action/i);
  }
});

test('rejects extra commands and malformed action parameters', () => {
  for (const action of [
    { type: 'shell', command: 'anything' },
    { type: 'tap', x: 0.5, y: 0.5, command: 'unexpected' },
    { type: 'wait', ms: -1 },
    { type: 'wait', ms: 30001 },
    { type: 'type', text: 42 },
    null,
  ]) assert.throws(() => parseAction(action), /action/i);
});
