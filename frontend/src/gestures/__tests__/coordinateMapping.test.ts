import test from 'node:test';
import assert from 'node:assert/strict';
import { mapVideoToWorkspace, ActionMapper } from '../actionMapper.ts';

test('mapVideoToWorkspace: preserves coordinates when aspect ratios match', () => {
  const videoW = 640;
  const videoH = 480;
  const container = { width: 1280, height: 960 }; // 4:3 aspect ratio

  const p = { x: 0.25, y: 0.75 };
  const mapped = mapVideoToWorkspace(p, videoW, videoH, container);

  assert.ok(Math.abs(mapped.x - 0.25) < 0.001);
  assert.ok(Math.abs(mapped.y - 0.75) < 0.001);
});

test('mapVideoToWorkspace: accounts for vertical cropping when container is wider than 4:3 video', () => {
  const videoW = 640;
  const videoH = 480; // Aspect ratio = 1.3333
  const container = { width: 1200, height: 600 }; // Aspect ratio = 2.0 (wider)

  // 1. Center of video should remain center of workspace
  const center = mapVideoToWorkspace({ x: 0.5, y: 0.5 }, videoW, videoH, container);
  assert.ok(Math.abs(center.x - 0.5) < 0.001);
  assert.ok(Math.abs(center.y - 0.5) < 0.001);

  // 2. High point (y = 0.3)
  // Scale = 2.0 / (4/3) = 1.5
  // Expected y = (0.3 - 0.5) * 1.5 + 0.5 = -0.3 + 0.5 = 0.20
  const upperPoint = mapVideoToWorkspace({ x: 0.4, y: 0.3 }, videoW, videoH, container);
  assert.ok(Math.abs(upperPoint.x - 0.4) < 0.001, 'Horizontal position should not be cropped in wider container');
  assert.ok(Math.abs(upperPoint.y - 0.20) < 0.001, 'Vertical position must account for top/bottom object-cover cropping');
});

test('mapVideoToWorkspace: accounts for horizontal cropping when container is taller than video', () => {
  const videoW = 640;
  const videoH = 360; // 16:9 = 1.7777
  const container = { width: 600, height: 600 }; // 1:1 = 1.0 (taller)

  // 1. Center remains center
  const center = mapVideoToWorkspace({ x: 0.5, y: 0.5 }, videoW, videoH, container);
  assert.ok(Math.abs(center.x - 0.5) < 0.001);
  assert.ok(Math.abs(center.y - 0.5) < 0.001);

  // 2. Point to the right (x = 0.6)
  // Scale = (16/9) / 1.0 = 1.7777
  // Expected x = (0.6 - 0.5) * 1.7777 + 0.5 = 0.1777 + 0.5 = 0.6777
  const rightPoint = mapVideoToWorkspace({ x: 0.6, y: 0.5 }, videoW, videoH, container);
  assert.ok(Math.abs(rightPoint.x - 0.6777) < 0.01);
  assert.ok(Math.abs(rightPoint.y - 0.5) < 0.001);
});

test('mapVideoToWorkspace: clamps points within [0, 1] range', () => {
  const videoW = 640;
  const videoH = 480;
  const container = { width: 1600, height: 600 }; // Extreme wide ratio = 2.666

  // A point near the top of video that is cropped outside visible workspace
  const croppedTop = mapVideoToWorkspace({ x: 0.5, y: 0.05 }, videoW, videoH, container);
  assert.ok(croppedTop.y >= 0 && croppedTop.y <= 1);

  // A point near bottom of video
  const croppedBottom = mapVideoToWorkspace({ x: 0.5, y: 0.95 }, videoW, videoH, container);
  assert.ok(croppedBottom.y >= 0 && croppedBottom.y <= 1);
});

test('ActionMapper toClientCoords maps workspace normalized points to container client pixels', () => {
  const mapper = new ActionMapper();
  const mockRect = {
    left: 100,
    top: 80,
    width: 800,
    height: 600,
    right: 900,
    bottom: 680,
    x: 100,
    y: 80,
    toJSON: () => {},
  } as DOMRect;

  mapper.setContainerRect(mockRect);

  const clientPoint = mapper.toClientCoords({ x: 0.5, y: 0.5 });
  assert.strictEqual(clientPoint.x, 100 + 0.5 * 800); // 500
  assert.strictEqual(clientPoint.y, 80 + 0.5 * 600); // 380

  const cornerPoint = mapper.toClientCoords({ x: 0, y: 1 });
  assert.strictEqual(cornerPoint.x, 100);
  assert.strictEqual(cornerPoint.y, 680);
});
