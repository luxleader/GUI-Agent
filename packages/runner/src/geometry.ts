import type { Point, ScreenshotFrame } from './contracts.ts';

export function mapModelPoint(point: Point, frame: ScreenshotFrame): Point {
  if (![point.x, point.y].every(n => Number.isFinite(n) && n >= 0 && n <= 1)) {
    throw new Error('Invalid model point');
  }
  const crop = frame.crop ?? { left: 0, top: 0, width: frame.width, height: frame.height };
  if (![frame.width, frame.height, crop.width, crop.height].every(n => Number.isSafeInteger(n) && n > 0)
      || ![crop.left, crop.top].every(n => Number.isSafeInteger(n) && n >= 0)
      || crop.left + crop.width > frame.width || crop.top + crop.height > frame.height
      || ![0, 90, 180, 270].includes(frame.rotation)) {
    throw new Error('Invalid screenshot frame');
  }
  let { x, y } = point;
  switch (frame.rotation) {
    case 90: [x, y] = [y, 1 - x]; break;
    case 180: [x, y] = [1 - x, 1 - y]; break;
    case 270: [x, y] = [1 - y, x]; break;
  }
  return {
    x: Math.round(crop.left + x * (crop.width - 1)),
    y: Math.round(crop.top + y * (crop.height - 1)),
  };
}

export function requireObservation(expected: string, current: string): void {
  if (!expected || expected !== current) throw new Error('Stale observation: capture the interface again');
}
