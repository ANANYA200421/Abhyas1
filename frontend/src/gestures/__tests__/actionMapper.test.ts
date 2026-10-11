import test from 'node:test';
import assert from 'node:assert/strict';
import { ActionMapper } from '../actionMapper.ts';
import type { ActionPayload, RecognizedGesture } from '../types.ts';

test('ActionMapper: INDEX_POINT starts and continues drawing stroke', () => {
  const mapper = new ActionMapper();
  const dispatched: ActionPayload[] = [];
  mapper.subscribe((a) => dispatched.push(a));

  const point1: RecognizedGesture = {
    type: 'INDEX_POINT',
    confidence: 0.98,
    cursor: { x: 0.2, y: 0.3 },
  };
  mapper.processGesture(point1, 1000);

  const startAction = dispatched.find((a) => a.type === 'DRAW_START');
  assert.ok(startAction, 'Should dispatch DRAW_START on initial index point');

  const point2: RecognizedGesture = {
    type: 'INDEX_POINT',
    confidence: 0.98,
    cursor: { x: 0.25, y: 0.35 },
  };
  mapper.processGesture(point2, 1016);

  const moveAction = dispatched.find((a) => a.type === 'DRAW_MOVE');
  assert.ok(moveAction, 'Should dispatch DRAW_MOVE on subsequent index point');
});

test('ActionMapper: OPEN_PALM ends active drawing stroke', () => {
  const mapper = new ActionMapper();
  const dispatched: ActionPayload[] = [];
  mapper.subscribe((a) => dispatched.push(a));

  // Start drawing
  mapper.processGesture({ type: 'INDEX_POINT', confidence: 0.98, cursor: { x: 0.2, y: 0.3 } }, 1000);
  // Transition to open palm
  mapper.processGesture({ type: 'OPEN_PALM', confidence: 0.97, cursor: { x: 0.25, y: 0.35 } }, 1016);

  const endAction = dispatched.find((a) => a.type === 'DRAW_END');
  assert.ok(endAction, 'Should dispatch DRAW_END when showing OPEN_PALM');
});

test('ActionMapper: TWO_FINGERS dispatches ERASE action', () => {
  const mapper = new ActionMapper();
  const dispatched: ActionPayload[] = [];
  mapper.subscribe((a) => dispatched.push(a));

  mapper.processGesture({ type: 'TWO_FINGERS', confidence: 0.95, cursor: { x: 0.4, y: 0.4 } }, 1000);

  const eraseAction = dispatched.find((a) => a.type === 'ERASE');
  assert.ok(eraseAction, 'Should dispatch ERASE on TWO_FINGERS gesture');
  assert.strictEqual(eraseAction?.pressure, 35);
});

test('ActionMapper: FIST held 1.0s clears board with single-shot latch', () => {
  const mapper = new ActionMapper();
  const dispatched: ActionPayload[] = [];
  mapper.subscribe((a) => dispatched.push(a));

  const fistGesture: RecognizedGesture = {
    type: 'FIST',
    confidence: 0.96,
    cursor: { x: 0.5, y: 0.5 },
  };

  // 1. Initial frame at t=1000
  mapper.processGesture(fistGesture, 1000);
  assert.strictEqual(dispatched.some((a) => a.type === 'CLEAR'), false);

  // 2. Midpoint at t=1500 (500ms into hold, progress ~0.5)
  mapper.processGesture(fistGesture, 1500);
  const midAction = dispatched[dispatched.length - 1];
  assert.ok(midAction.holdProgress !== undefined && midAction.holdProgress >= 0.45 && midAction.holdProgress <= 0.55);
  assert.strictEqual(dispatched.some((a) => a.type === 'CLEAR'), false);

  // 3. Full 1.0s at t=2000 -> Triggers CLEAR
  mapper.processGesture(fistGesture, 2000);
  const clearActions = dispatched.filter((a) => a.type === 'CLEAR');
  assert.strictEqual(clearActions.length, 1, 'Should dispatch CLEAR exactly once');
  assert.strictEqual(clearActions[0].holdProgress, 1);

  // 4. Continued holding at t=2500 and t=3000 -> Must NOT re-trigger CLEAR (single-shot latch)
  mapper.processGesture(fistGesture, 2500);
  mapper.processGesture(fistGesture, 3000);
  const repeatedClearActions = dispatched.filter((a) => a.type === 'CLEAR');
  assert.strictEqual(repeatedClearActions.length, 1, 'Single-shot latch must prevent repeated clear while fist is held');

  // 5. Open hand at t=3100 -> Re-arms clear
  mapper.processGesture({ type: 'OPEN_PALM', confidence: 0.97, cursor: { x: 0.5, y: 0.5 } }, 3100);

  // 6. Hold fist again for another 1.0s -> Now it can clear again
  mapper.processGesture(fistGesture, 3200);
  mapper.processGesture(fistGesture, 4200);
  const reArmedClearActions = dispatched.filter((a) => a.type === 'CLEAR');
  assert.strictEqual(reArmedClearActions.length, 2, 'Should allow re-armed CLEAR after releasing fist');
});

test('ActionMapper: Releasing FIST before 1.0s cancels clear progress', () => {
  const mapper = new ActionMapper();
  const dispatched: ActionPayload[] = [];
  mapper.subscribe((a) => dispatched.push(a));

  const fistGesture: RecognizedGesture = {
    type: 'FIST',
    confidence: 0.96,
    cursor: { x: 0.5, y: 0.5 },
  };

  // Hold for 600ms
  mapper.processGesture(fistGesture, 1000);
  mapper.processGesture(fistGesture, 1600);
  // Release to OPEN_PALM at 1700
  mapper.processGesture({ type: 'OPEN_PALM', confidence: 0.97, cursor: { x: 0.5, y: 0.5 } }, 1700);

  const clearActions = dispatched.filter((a) => a.type === 'CLEAR');
  assert.strictEqual(clearActions.length, 0, 'Releasing fist before 1s should cancel CLEAR');
});

test('ActionMapper: PINCH debounce prevents rapid duplicate clicks', () => {
  const mapper = new ActionMapper();
  const dispatched: ActionPayload[] = [];
  mapper.subscribe((a) => dispatched.push(a));

  const pinchGesture: RecognizedGesture = {
    type: 'PINCH',
    confidence: 0.95,
    cursor: { x: 0.5, y: 0.5 },
  };

  // Frame 1: Initial pinch at t=1000 -> PINCH dispatched
  mapper.processGesture(pinchGesture, 1000);
  const pinchActions1 = dispatched.filter((a) => a.type === 'PINCH');
  assert.strictEqual(pinchActions1.length, 1);

  // Frame 2: Rapid chatter at t=1050 (50ms later, within 400ms cooldown) -> no duplicate click
  mapper.processGesture(pinchGesture, 1050);
  const pinchActions2 = dispatched.filter((a) => a.type === 'PINCH');
  assert.strictEqual(pinchActions2.length, 1, 'Should not dispatch duplicate PINCH click within cooldown');

  // Frame 3: Release pinch at t=1100 -> PINCH_RELEASE dispatched
  mapper.processGesture({ type: 'INDEX_POINT', confidence: 0.95, cursor: { x: 0.5, y: 0.5 } }, 1100);
  const releaseActions = dispatched.filter((a) => a.type === 'PINCH_RELEASE');
  assert.strictEqual(releaseActions.length, 1);
});

test('ActionMapper: processNoHand safely cleans up when tracking is lost', () => {
  const mapper = new ActionMapper();
  const dispatched: ActionPayload[] = [];
  mapper.subscribe((a) => dispatched.push(a));

  // Start drawing with index point
  mapper.processGesture({ type: 'INDEX_POINT', confidence: 0.98, cursor: { x: 0.3, y: 0.3 } }, 1000);

  // Hand is suddenly lost
  mapper.processNoHand(1050);

  const drawEnd = dispatched.find((a) => a.type === 'DRAW_END');
  assert.ok(drawEnd, 'Should end drawing stroke when hand tracking is lost');

  const trackingLost = dispatched.find((a) => a.type === 'TRACKING_LOST');
  assert.ok(trackingLost, 'Should dispatch TRACKING_LOST action');
});
