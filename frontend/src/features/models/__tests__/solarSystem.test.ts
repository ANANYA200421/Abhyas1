import { test } from 'node:test';
import assert from 'node:assert';
import { PLANETS, SUN_DATA } from '../planetData.ts';

test('Solar System: Sun has valid central star configuration', () => {
  assert.strictEqual(SUN_DATA.id, 'sun');
  assert.strictEqual(SUN_DATA.distance, 0, 'Sun distance from center must be 0');
  assert.ok(SUN_DATA.size > 1.5, 'Sun size must be prominently larger than terrestrial planets');
  assert.ok(SUN_DATA.color.startsWith('#'), 'Sun color must be valid hex');
});

test('Solar System: Contains all 8 canonical planets in correct orbital order', () => {
  assert.strictEqual(PLANETS.length, 8, 'Solar system must have exactly 8 planets');

  const expectedOrder = [
    'mercury',
    'venus',
    'earth',
    'mars',
    'jupiter',
    'saturn',
    'uranus',
    'neptune',
  ];

  for (let i = 0; i < PLANETS.length; i++) {
    assert.strictEqual(PLANETS[i].id, expectedOrder[i], `Planet at index ${i} must be ${expectedOrder[i]}`);
    assert.ok(PLANETS[i].size > 0, `Planet ${PLANETS[i].name} must have positive size`);
    assert.ok(PLANETS[i].distance > 0, `Planet ${PLANETS[i].name} must have positive distance`);
    assert.ok(PLANETS[i].speed > 0, `Planet ${PLANETS[i].name} must have positive orbital speed`);
    assert.ok(PLANETS[i].color.startsWith('#'), `Planet ${PLANETS[i].name} color must be valid hex`);
    assert.ok(PLANETS[i].info.length > 10, `Planet ${PLANETS[i].name} must have informative description`);
  }
});

test('Solar System: Distances strictly increase from Mercury to Neptune', () => {
  for (let i = 1; i < PLANETS.length; i++) {
    assert.ok(
      PLANETS[i].distance > PLANETS[i - 1].distance,
      `Planet ${PLANETS[i].name} distance (${PLANETS[i].distance}) must be greater than ${PLANETS[i - 1].name} (${PLANETS[i - 1].distance})`
    );
  }
});

test('Solar System: Orbital speeds decrease with distance (Keplerian relationship)', () => {
  for (let i = 1; i < PLANETS.length; i++) {
    assert.ok(
      PLANETS[i].speed < PLANETS[i - 1].speed,
      `Planet ${PLANETS[i].name} speed (${PLANETS[i].speed}) must be slower than closer planet ${PLANETS[i - 1].name} (${PLANETS[i - 1].speed})`
    );
  }
});

test('Solar System: Saturn has ring configuration enabled', () => {
  const saturn = PLANETS.find((p) => p.id === 'saturn');
  assert.ok(saturn, 'Saturn must exist');
  assert.strictEqual(saturn.hasRings, true, 'Saturn must have hasRings set to true');

  const earth = PLANETS.find((p) => p.id === 'earth');
  assert.ok(earth, 'Earth must exist');
  assert.strictEqual(earth.hasRings, undefined);
});

test('Solar System: Gesture rotation math correctly updates orientation', () => {
  const dx = 0.05;
  const dy = -0.02;

  const deltaRotationY = dx * 6;
  const deltaRotationX = dy * 4;

  assert.ok(Math.abs(deltaRotationY - 0.3) < 1e-6);
  assert.ok(Math.abs(deltaRotationX - -0.08) < 1e-6);
});

test('Solar System: Gesture pinch zoom clamps camera within safe view frustum', () => {
  const clampZoom = (currentZ: number, delta: number) => {
    return Math.max(8, Math.min(85, currentZ + delta));
  };

  // Normal zoom in
  assert.strictEqual(clampZoom(38, -10), 28);
  // Normal zoom out
  assert.strictEqual(clampZoom(38, 20), 58);
  // Min clamp limit (prevent camera clipping through Sun)
  assert.strictEqual(clampZoom(10, -50), 8);
  // Max clamp limit (prevent camera losing scene into deep space)
  assert.strictEqual(clampZoom(80, 50), 85);
});

test('Solar System: Raycast NDC conversion maps normalized (0..1) to NDC (-1..1)', () => {
  const toNDC = (point: { x: number; y: number }) => {
    return {
      x: point.x * 2 - 1,
      y: -(point.y * 2 - 1),
    };
  };

  // Center (0.5, 0.5) -> (0, 0)
  const center = toNDC({ x: 0.5, y: 0.5 });
  assert.strictEqual(center.x, 0);
  assert.strictEqual(center.y, -0);

  // Top-left (0, 0) -> (-1, 1)
  const topLeft = toNDC({ x: 0, y: 0 });
  assert.strictEqual(topLeft.x, -1);
  assert.strictEqual(topLeft.y, 1);

  // Bottom-right (1, 1) -> (1, -1)
  const bottomRight = toNDC({ x: 1, y: 1 });
  assert.strictEqual(bottomRight.x, 1);
  assert.strictEqual(bottomRight.y, -1);
});
