import test from 'node:test';
import assert from 'node:assert/strict';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import {
  GestureRecognizer,
  distance,
  isFingerExtended,
  isFingerCurled,
} from '../gestureRecognizer.ts';
import {
  makeIndexPointLandmarks,
  makeOpenPalmLandmarks,
  makeFistLandmarks,
  makeTwoFingersLandmarks,
  makePinchLandmarks,
} from './syntheticLandmarks.ts';

test('gestureRecognizer recognizes INDEX_POINT correctly', () => {
  const recognizer = new GestureRecognizer();
  const landmarks = makeIndexPointLandmarks();
  const result = recognizer.recognize(landmarks, 1000);

  assert.strictEqual(result.type, 'INDEX_POINT');
  assert.ok(result.confidence >= 0.9, 'Confidence should be high');
  // Mirrored cursor: x = 1 - indexTip.x
  assert.ok(Math.abs(result.cursor.x - (1 - landmarks[8].x)) < 0.001);
  assert.ok(Math.abs(result.cursor.y - landmarks[8].y) < 0.001);
});

test('gestureRecognizer recognizes OPEN_PALM correctly', () => {
  const recognizer = new GestureRecognizer();
  const landmarks = makeOpenPalmLandmarks();
  const result = recognizer.recognize(landmarks, 1000);

  assert.strictEqual(result.type, 'OPEN_PALM');
  assert.ok(result.confidence >= 0.9, 'Confidence should be high');
});

test('gestureRecognizer recognizes FIST correctly', () => {
  const recognizer = new GestureRecognizer();
  const landmarks = makeFistLandmarks();
  const result = recognizer.recognize(landmarks, 1000);

  assert.strictEqual(result.type, 'FIST');
  assert.ok(result.confidence >= 0.9, 'Confidence should be high');
});

test('gestureRecognizer recognizes TWO_FINGERS correctly', () => {
  const recognizer = new GestureRecognizer();
  const landmarks = makeTwoFingersLandmarks();
  const result = recognizer.recognize(landmarks, 1000);

  assert.strictEqual(result.type, 'TWO_FINGERS');
  assert.ok(result.confidence >= 0.9, 'Confidence should be high');
  // Two fingers cursor is midpoint between index (8) and middle (12)
  const expectedMirroredX = 1 - (landmarks[8].x + landmarks[12].x) / 2;
  assert.ok(Math.abs(result.cursor.x - expectedMirroredX) < 0.001);
});

test('gestureRecognizer recognizes PINCH correctly', () => {
  const recognizer = new GestureRecognizer();
  const landmarks = makePinchLandmarks(0.02); // Distance ~0.02
  const result = recognizer.recognize(landmarks, 1000);

  assert.strictEqual(result.type, 'PINCH');
  assert.ok(result.confidence >= 0.7, 'Confidence should be high');
});

test('gestureRecognizer implements Schmitt-trigger hysteresis for PINCH', () => {
  const recognizer = new GestureRecognizer();

  // 1. Initial distance 0.065 (above trigger threshold 0.055) -> should NOT pinch
  const landmarksPrePinch = makePinchLandmarks(0.065);
  const result1 = recognizer.recognize(landmarksPrePinch, 1000);
  assert.notStrictEqual(result1.type, 'PINCH');

  // 2. Bring fingers close to 0.03 (< 0.055) -> transitions to PINCH
  const landmarksClose = makePinchLandmarks(0.03);
  const result2 = recognizer.recognize(landmarksClose, 1016);
  assert.strictEqual(result2.type, 'PINCH');

  // 3. Relax fingers slightly to 0.070 (below release threshold 0.080) -> MUST STAY PINCH (hysteresis)
  const landmarksSlightlyApart = makePinchLandmarks(0.070);
  const result3 = recognizer.recognize(landmarksSlightlyApart, 1032);
  assert.strictEqual(result3.type, 'PINCH', 'Hysteresis should keep pinch active below release threshold');

  // 4. Open fingers beyond 0.085 -> releases pinch
  const landmarksFar = makePinchLandmarks(0.090);
  const result4 = recognizer.recognize(landmarksFar, 1048);
  assert.notStrictEqual(result4.type, 'PINCH', 'Pinch should release past release threshold');
});

test('FIST takes priority over PINCH when all fingers are clenched', () => {
  const recognizer = new GestureRecognizer();
  // In a fist, thumb tip might be near index tip
  const fistLandmarks = makeFistLandmarks();
  // Force thumb tip (4) to be close to index tip (8)
  fistLandmarks[4] = { x: fistLandmarks[8].x + 0.02, y: fistLandmarks[8].y, z: 0, visibility: 1 };

  const result = recognizer.recognize(fistLandmarks, 1000);
  assert.strictEqual(result.type, 'FIST', 'Clenched fist must not be misclassified as a PINCH');
});

test('gestureRecognizer safely handles invalid or corrupt landmark data', () => {
  const recognizer = new GestureRecognizer();

  // Null / undefined input
  const res1 = recognizer.recognize(null as unknown as NormalizedLandmark[]);
  assert.strictEqual(res1.type, 'NONE');
  assert.strictEqual(res1.confidence, 0);

  const res1b = recognizer.recognize(undefined as unknown as NormalizedLandmark[]);
  assert.strictEqual(res1b.type, 'NONE');
  assert.strictEqual(res1b.confidence, 0);

  // Incomplete landmarks (< 21)
  const res2 = recognizer.recognize([]);
  assert.strictEqual(res2.type, 'NONE');

  // Landmarks with NaN coordinates
  const nanLandmarks = makeIndexPointLandmarks();
  nanLandmarks[8] = { x: NaN, y: 0.5, z: 0, visibility: 1 };
  const res3 = recognizer.recognize(nanLandmarks);
  assert.strictEqual(res3.type, 'NONE');
  assert.strictEqual(res3.confidence, 0);
});

test('distance, isFingerExtended, and isFingerCurled helper functions', () => {
  const p1 = { x: 0, y: 0, z: 0, visibility: 1 };
  const p2 = { x: 3, y: 4, z: 0, visibility: 1 };
  assert.strictEqual(distance(p1, p2), 5);

  const landmarks = makeIndexPointLandmarks();
  // Index should be extended
  assert.strictEqual(
    isFingerExtended(landmarks[0], landmarks[5], landmarks[6], landmarks[7], landmarks[8]),
    true
  );
  // Middle should be curled
  assert.strictEqual(
    isFingerCurled(landmarks[0], landmarks[9], landmarks[10], landmarks[12]),
    true
  );
});
