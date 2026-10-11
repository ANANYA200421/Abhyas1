import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DrawingEngine,
  blackboardDrawingEngine,
  slidesDrawingEngine,
  distanceToSegment,
  strokeIntersectsCircle,
  type Stroke,
} from '../drawingEngine.ts';

test('distanceToSegment accurately computes distance to segment', () => {
  // Point directly above segment (0, 0) to (10, 0) at (5, 5) -> distance should be 5
  assert.strictEqual(distanceToSegment(5, 5, 0, 0, 10, 0), 5);

  // Point beyond the end at (15, 0) -> distance to end (10, 0) is 5
  assert.strictEqual(distanceToSegment(15, 0, 0, 0, 10, 0), 5);

  // Point before the start at (-5, 0) -> distance to start (0, 0) is 5
  assert.strictEqual(distanceToSegment(-5, 0, 0, 0, 10, 0), 5);

  // Point exactly on the segment -> distance 0
  assert.strictEqual(distanceToSegment(4, 0, 0, 0, 10, 0), 0);
});

test('strokeIntersectsCircle detects when eraser circle touches stroke', () => {
  const stroke: Stroke = {
    id: 's1',
    tool: 'pen',
    color: '#FFFFFF',
    size: 4,
    points: [
      { x: 100, y: 100 },
      { x: 200, y: 100 },
    ],
  };

  // Circle centered at (150, 110) with radius 20: touches line y=100
  assert.strictEqual(strokeIntersectsCircle(stroke, 150, 110, 20), true);

  // Circle centered at (150, 200) with radius 20: far away (dy=100 > 22)
  assert.strictEqual(strokeIntersectsCircle(stroke, 150, 200, 20), false);

  // Circle centered near endpoint (90, 100) with radius 15: touches start point
  assert.strictEqual(strokeIntersectsCircle(stroke, 90, 100, 15), true);
});

test('DrawingEngine: startStroke, addPoint, and endStroke records a stroke', () => {
  const engine = new DrawingEngine();

  engine.startStroke({ x: 50, y: 50 }, false);
  engine.addPoint({ x: 60, y: 60 }, false);
  engine.addPoint({ x: 70, y: 70 }, false);
  engine.endStroke();

  const strokes = engine.getStrokes();
  assert.strictEqual(strokes.length, 1);
  assert.strictEqual(strokes[0].points.length, 3);
  assert.strictEqual(engine.canUndo(), true);
  assert.strictEqual(engine.canRedo(), false);
});

test('DrawingEngine: erasing a stroke removes it from the stroke list', () => {
  const engine = new DrawingEngine();

  // Create Stroke 1 at y = 100
  engine.startStroke({ x: 50, y: 100 }, false);
  engine.addPoint({ x: 150, y: 100 }, false);
  engine.endStroke();

  // Create Stroke 2 at y = 300
  engine.startStroke({ x: 50, y: 300 }, false);
  engine.addPoint({ x: 150, y: 300 }, false);
  engine.endStroke();

  assert.strictEqual(engine.getStrokes().length, 2);

  // Erase at (100, 100) with radius 25 -> Should erase Stroke 1 only
  engine.eraseAt({ x: 100, y: 100 }, 25, false);
  engine.commitCurrentErase();

  const remaining = engine.getStrokes();
  assert.strictEqual(remaining.length, 1);
  assert.strictEqual(remaining[0].points[0].y, 300, 'Stroke 2 at y=300 should remain');
});

test('DrawingEngine: undo restores the erased stroke', () => {
  const engine = new DrawingEngine();

  // Create Stroke 1
  engine.startStroke({ x: 50, y: 100 }, false);
  engine.addPoint({ x: 150, y: 100 }, false);
  engine.endStroke();

  // Create Stroke 2
  engine.startStroke({ x: 50, y: 200 }, false);
  engine.addPoint({ x: 150, y: 200 }, false);
  engine.endStroke();

  assert.strictEqual(engine.getStrokes().length, 2);

  // Erase Stroke 1
  engine.eraseAt({ x: 100, y: 100 }, 25, false);
  engine.commitCurrentErase();
  assert.strictEqual(engine.getStrokes().length, 1);

  // Undo the erase -> Stroke 1 must be restored at index 0
  engine.undo();
  const restored = engine.getStrokes();
  assert.strictEqual(restored.length, 2, 'Erased stroke must be restored on undo');
  assert.strictEqual(restored[0].points[0].y, 100);
  assert.strictEqual(restored[1].points[0].y, 200);
});

test('DrawingEngine: redo removes the erased stroke again', () => {
  const engine = new DrawingEngine();

  engine.startStroke({ x: 50, y: 100 }, false);
  engine.addPoint({ x: 150, y: 100 }, false);
  engine.endStroke();

  engine.eraseAt({ x: 100, y: 100 }, 25, false);
  engine.commitCurrentErase();
  assert.strictEqual(engine.getStrokes().length, 0);

  // Undo restores
  engine.undo();
  assert.strictEqual(engine.getStrokes().length, 1);

  // Redo re-erases
  engine.redo();
  assert.strictEqual(engine.getStrokes().length, 0, 'Redo must re-erase the stroke');
});

test('DrawingEngine: sequential undo through erase and drawing', () => {
  const engine = new DrawingEngine();

  // 1. Draw S1
  engine.startStroke({ x: 10, y: 10 }, false);
  engine.endStroke();

  // 2. Draw S2
  engine.startStroke({ x: 100, y: 100 }, false);
  engine.endStroke();

  // 3. Erase S2
  engine.eraseAt({ x: 100, y: 100 }, 15, false);
  engine.commitCurrentErase();
  assert.strictEqual(engine.getStrokes().length, 1);

  // Undo #1: restores S2
  engine.undo();
  assert.strictEqual(engine.getStrokes().length, 2);

  // Undo #2: undoes drawing of S2
  engine.undo();
  assert.strictEqual(engine.getStrokes().length, 1);

  // Undo #3: undoes drawing of S1
  engine.undo();
  assert.strictEqual(engine.getStrokes().length, 0);

  // Redo #1: restores drawing of S1
  engine.redo();
  assert.strictEqual(engine.getStrokes().length, 1);

  // Redo #2: restores drawing of S2
  engine.redo();
  assert.strictEqual(engine.getStrokes().length, 2);

  // Redo #3: re-erases S2
  engine.redo();
  assert.strictEqual(engine.getStrokes().length, 1);
});

test('DrawingEngine: clear removes all strokes and undo restores them', () => {
  const engine = new DrawingEngine();

  engine.startStroke({ x: 10, y: 10 }, false);
  engine.endStroke();
  engine.startStroke({ x: 20, y: 20 }, false);
  engine.endStroke();
  assert.strictEqual(engine.getStrokes().length, 2);

  engine.clear();
  assert.strictEqual(engine.getStrokes().length, 0);
  assert.strictEqual(engine.canUndo(), true);

  engine.undo();
  assert.strictEqual(engine.getStrokes().length, 2, 'Undo must restore strokes after clear');

  engine.redo();
  assert.strictEqual(engine.getStrokes().length, 0, 'Redo must re-clear strokes');
});

test('DrawingEngine Isolation: Blackboard and Slides engines have independent stroke states', () => {
  blackboardDrawingEngine.clear();
  slidesDrawingEngine.clear();

  // Draw 2 strokes on Blackboard
  blackboardDrawingEngine.startStroke({ x: 100, y: 100 }, false);
  blackboardDrawingEngine.endStroke();
  blackboardDrawingEngine.startStroke({ x: 150, y: 150 }, false);
  blackboardDrawingEngine.endStroke();

  // Draw 1 stroke on Slides
  slidesDrawingEngine.startStroke({ x: 300, y: 300 }, false);
  slidesDrawingEngine.endStroke();

  assert.strictEqual(blackboardDrawingEngine.getStrokes().length, 2);
  assert.strictEqual(slidesDrawingEngine.getStrokes().length, 1);

  // Erasing on Blackboard touches ONLY Blackboard
  blackboardDrawingEngine.eraseAt({ x: 100, y: 100 }, 30, false);
  blackboardDrawingEngine.commitCurrentErase();

  assert.strictEqual(
    blackboardDrawingEngine.getStrokes().length,
    1,
    'Blackboard should have 1 stroke remaining after erase'
  );
  assert.strictEqual(
    slidesDrawingEngine.getStrokes().length,
    1,
    'Slides stroke must remain completely unaffected by Blackboard erase'
  );

  // Clearing Slides does NOT touch Blackboard
  slidesDrawingEngine.clear();
  assert.strictEqual(slidesDrawingEngine.getStrokes().length, 0);
  assert.strictEqual(blackboardDrawingEngine.getStrokes().length, 1);

  // Undo on Slides does NOT touch Blackboard
  slidesDrawingEngine.undo();
  assert.strictEqual(slidesDrawingEngine.getStrokes().length, 1);
  assert.strictEqual(blackboardDrawingEngine.getStrokes().length, 1);
});

test('DrawingEngine Isolation: Tool selection, color, and stroke size are strictly isolated', () => {
  blackboardDrawingEngine.setTool('pen');
  blackboardDrawingEngine.setColor('#FFFFFF');
  blackboardDrawingEngine.setSize(7);

  slidesDrawingEngine.setTool('highlighter');
  slidesDrawingEngine.setColor('#FDE047');
  slidesDrawingEngine.setSize(18);

  assert.strictEqual(blackboardDrawingEngine.getTool(), 'pen');
  assert.strictEqual(blackboardDrawingEngine.getColor(), '#FFFFFF');
  assert.strictEqual(blackboardDrawingEngine.getSize(), 7);

  assert.strictEqual(slidesDrawingEngine.getTool(), 'highlighter');
  assert.strictEqual(slidesDrawingEngine.getColor(), '#FDE047');
  assert.strictEqual(slidesDrawingEngine.getSize(), 18);
});

test('DrawingEngine Isolation: Independent undo and redo stacks between Blackboard and Slides', () => {
  blackboardDrawingEngine.clear();
  slidesDrawingEngine.clear();

  // Add 3 strokes to Blackboard
  for (let i = 0; i < 3; i++) {
    blackboardDrawingEngine.startStroke({ x: i * 10, y: i * 10 }, false);
    blackboardDrawingEngine.endStroke();
  }

  // Add 2 strokes to Slides
  for (let i = 0; i < 2; i++) {
    slidesDrawingEngine.startStroke({ x: 100 + i * 10, y: 100 + i * 10 }, false);
    slidesDrawingEngine.endStroke();
  }

  assert.strictEqual(blackboardDrawingEngine.getStrokes().length, 3);
  assert.strictEqual(slidesDrawingEngine.getStrokes().length, 2);

  // Undo twice on Blackboard
  blackboardDrawingEngine.undo();
  blackboardDrawingEngine.undo();
  assert.strictEqual(blackboardDrawingEngine.getStrokes().length, 1);
  assert.strictEqual(slidesDrawingEngine.getStrokes().length, 2, 'Slides count unchanged by Blackboard undo');

  // Redo once on Blackboard
  blackboardDrawingEngine.redo();
  assert.strictEqual(blackboardDrawingEngine.getStrokes().length, 2);
  assert.strictEqual(slidesDrawingEngine.getStrokes().length, 2);

  // Undo once on Slides
  slidesDrawingEngine.undo();
  assert.strictEqual(slidesDrawingEngine.getStrokes().length, 1);
  assert.strictEqual(blackboardDrawingEngine.getStrokes().length, 2, 'Blackboard count unchanged by Slides undo');

  // Redo once on Slides
  slidesDrawingEngine.redo();
  assert.strictEqual(slidesDrawingEngine.getStrokes().length, 2);
  assert.strictEqual(blackboardDrawingEngine.getStrokes().length, 2);
});

test('DrawingEngine Isolation: Per-slide annotation persistence model isolates across slides and blackboard', () => {
  blackboardDrawingEngine.clear();
  slidesDrawingEngine.clear();

  // Draw 2 strokes on Blackboard
  blackboardDrawingEngine.startStroke({ x: 50, y: 50 }, false);
  blackboardDrawingEngine.endStroke();
  blackboardDrawingEngine.startStroke({ x: 60, y: 60 }, false);
  blackboardDrawingEngine.endStroke();

  const slideAnnotations: Record<string, any[]> = {};

  // Slide 0: draw 1 stroke
  slidesDrawingEngine.startStroke({ x: 100, y: 100 }, false);
  slidesDrawingEngine.endStroke();
  slideAnnotations['default-0'] = slidesDrawingEngine.getStrokes();

  // Navigate to Slide 1 (start empty)
  slidesDrawingEngine.setStrokes(slideAnnotations['default-1'] || []);
  assert.strictEqual(slidesDrawingEngine.getStrokes().length, 0);

  // Draw 2 strokes on Slide 1
  slidesDrawingEngine.startStroke({ x: 200, y: 200 }, false);
  slidesDrawingEngine.endStroke();
  slidesDrawingEngine.startStroke({ x: 250, y: 250 }, false);
  slidesDrawingEngine.endStroke();
  slideAnnotations['default-1'] = slidesDrawingEngine.getStrokes();

  // Navigate back to Slide 0
  slidesDrawingEngine.setStrokes(slideAnnotations['default-0'] || []);
  assert.strictEqual(slidesDrawingEngine.getStrokes().length, 1, 'Slide 0 must have exactly 1 stroke');

  // Navigate to Slide 1 again
  slidesDrawingEngine.setStrokes(slideAnnotations['default-1'] || []);
  assert.strictEqual(slidesDrawingEngine.getStrokes().length, 2, 'Slide 1 must have exactly 2 strokes');

  // Blackboard remains completely untouched throughout slide navigation
  assert.strictEqual(blackboardDrawingEngine.getStrokes().length, 2, 'Blackboard must still have 2 strokes');
});

test('DrawingEngine Isolation: Tab switch stroke finalization prevents dangling open strokes', () => {
  const engine = new DrawingEngine();

  // Start a stroke without finishing
  engine.startStroke({ x: 10, y: 10 }, false);
  engine.addPoint({ x: 20, y: 20 }, false);

  // Ending stroke commits it cleanly
  engine.endStroke();
  assert.strictEqual(engine.getStrokes().length, 1);
  assert.strictEqual((engine as any).currentStroke, null);

  // Subsequent stroke works normally
  engine.startStroke({ x: 30, y: 30 }, false);
  engine.endStroke();
  assert.strictEqual(engine.getStrokes().length, 2);
});

