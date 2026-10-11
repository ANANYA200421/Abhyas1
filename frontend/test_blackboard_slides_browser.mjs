import { chromium } from 'playwright';

async function run() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`[Browser Console Error] ${msg.text()}`);
    }
  });

  const getActiveCanvasPixels = async () => {
    return await page.evaluate(() => {
      const activeCanvas = Array.from(document.querySelectorAll('canvas.cursor-crosshair')).find(
        c => c.offsetParent !== null
      );
      if (!activeCanvas) return -1;
      const ctx = activeCanvas.getContext('2d');
      const imgData = ctx.getImageData(0, 0, activeCanvas.width, activeCanvas.height);
      let nonZero = 0;
      for (let i = 3; i < imgData.data.length; i += 4) {
        if (imgData.data[i] > 0) nonZero++;
      }
      return nonZero;
    });
  };

  console.log('1. Navigating to http://localhost:5173/session...');
  await page.goto('http://localhost:5173/session', { waitUntil: 'domcontentloaded' });

  // SCENARIO 1: Virtual Blackboard initial drawing and undo/redo
  console.log('\n--- Scenario 1: Blackboard drawing & undo/redo ---');
  const blackboardCanvas = page.locator('canvas.cursor-crosshair').first();
  await blackboardCanvas.waitFor({ state: 'visible', timeout: 15000 });
  const bbBox = await blackboardCanvas.boundingBox();

  // Stroke 1
  console.log('Drawing Stroke 1 on Blackboard...');
  await page.mouse.move(bbBox.x + 80, bbBox.y + 80);
  await page.mouse.down();
  await page.mouse.move(bbBox.x + 200, bbBox.y + 200, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(200);

  // Stroke 2
  console.log('Drawing Stroke 2 on Blackboard...');
  await page.mouse.move(bbBox.x + 250, bbBox.y + 100);
  await page.mouse.down();
  await page.mouse.move(bbBox.x + 350, bbBox.y + 100, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(200);

  const bbPixelsAfter2Strokes = await getActiveCanvasPixels();
  console.log('Blackboard pixels after 2 strokes:', bbPixelsAfter2Strokes);
  if (bbPixelsAfter2Strokes === 0) throw new Error('Blackboard drawing failed!');

  // Blackboard Undo Stroke 2
  const bbUndoBtn = page.locator('button[title="Undo (Ctrl+Z)"]').first();
  await bbUndoBtn.click();
  await page.waitForTimeout(200);
  const bbPixelsAfterUndo = await getActiveCanvasPixels();
  console.log('Blackboard pixels after Undo:', bbPixelsAfterUndo);
  if (bbPixelsAfterUndo >= bbPixelsAfter2Strokes) throw new Error('Blackboard Undo failed to decrease strokes!');

  // Blackboard Redo Stroke 2
  const bbRedoBtn = page.locator('button[title="Redo (Ctrl+Y)"]').first();
  await bbRedoBtn.click();
  await page.waitForTimeout(200);
  const bbPixelsAfterRedo = await getActiveCanvasPixels();
  console.log('Blackboard pixels after Redo:', bbPixelsAfterRedo);
  if (bbPixelsAfterRedo <= bbPixelsAfterUndo) throw new Error('Blackboard Redo failed to restore pixels!');

  // SCENARIO 2: Switch to Slides — Verify complete stroke isolation (0 pixels)
  console.log('\n--- Scenario 2: Switch to Slides (Verify 0 strokes transferred) ---');
  const slidesTab = page.locator('button:has-text("Slides")');
  await slidesTab.click();
  await page.waitForTimeout(400);

  const slPixelsInitial = await getActiveCanvasPixels();
  console.log('Slide 1 initial pixels (must be 0):', slPixelsInitial);
  if (slPixelsInitial !== 0) throw new Error(`Slides inherited Blackboard strokes! Found ${slPixelsInitial} pixels.`);

  // SCENARIO 3: Draw on Slide 1, test Slide Undo/Redo
  console.log('\n--- Scenario 3: Draw on Slide 1, test Slide Undo/Redo ---');
  const slidesCanvas = page.locator('canvas.cursor-crosshair:visible');
  await slidesCanvas.waitFor({ state: 'visible', timeout: 5000 });
  const slBox = await slidesCanvas.boundingBox();

  // Slide Stroke 1
  await page.mouse.move(slBox.x + 100, slBox.y + 100);
  await page.mouse.down();
  await page.mouse.move(slBox.x + 220, slBox.y + 180, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(200);

  const slPixelsSlide1 = await getActiveCanvasPixels();
  console.log('Slide 1 pixels after drawing:', slPixelsSlide1);
  if (slPixelsSlide1 === 0) throw new Error('Drawing on Slide 1 failed!');

  // Slide Undo
  const slUndoBtn = page.locator('button[title="Undo (Ctrl+Z)"]:visible');
  await slUndoBtn.click();
  await page.waitForTimeout(200);
  const slPixelsUndo = await getActiveCanvasPixels();
  console.log('Slide 1 pixels after Undo:', slPixelsUndo);
  if (slPixelsUndo !== 0) throw new Error('Slide 1 Undo failed!');

  // Slide Redo
  const slRedoBtn = page.locator('button[title="Redo (Ctrl+Y)"]:visible');
  await slRedoBtn.click();
  await page.waitForTimeout(200);
  const slPixelsRedo = await getActiveCanvasPixels();
  console.log('Slide 1 pixels after Redo:', slPixelsRedo);
  if (slPixelsRedo === 0) throw new Error('Slide 1 Redo failed!');

  // SCENARIO 4: Slide Navigation & per-slide annotation persistence
  console.log('\n--- Scenario 4: Slide navigation & per-slide annotation persistence ---');
  const nextSlideBtn = page.locator('button[title="Next Slide (Swipe Left / Right Arrow)"]');
  await nextSlideBtn.click();
  await page.waitForTimeout(400);

  const sl2PixelsInitial = await getActiveCanvasPixels();
  console.log('Slide 2 initial pixels (must be 0):', sl2PixelsInitial);
  if (sl2PixelsInitial !== 0) throw new Error('Slide 2 should be empty!');

  // Draw on Slide 2
  console.log('Drawing on Slide 2...');
  await page.mouse.move(slBox.x + 150, slBox.y + 120);
  await page.mouse.down();
  await page.mouse.move(slBox.x + 300, slBox.y + 120, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(200);
  const sl2PixelsDrawn = await getActiveCanvasPixels();
  console.log('Slide 2 pixels after drawing:', sl2PixelsDrawn);

  // Advance to Slide 3
  await nextSlideBtn.click();
  await page.waitForTimeout(400);
  const sl3PixelsInitial = await getActiveCanvasPixels();
  console.log('Slide 3 initial pixels (must be 0):', sl3PixelsInitial);
  if (sl3PixelsInitial !== 0) throw new Error('Slide 3 should be empty!');

  // Return to Slide 2
  const prevSlideBtn = page.locator('button[title="Previous Slide (Swipe Right / Left Arrow)"]');
  await prevSlideBtn.click();
  await page.waitForTimeout(400);
  const sl2PixelsRestored = await getActiveCanvasPixels();
  console.log('Slide 2 restored pixels (should match drawn):', sl2PixelsRestored);
  if (sl2PixelsRestored === 0) throw new Error('Slide 2 annotations failed to persist!');

  // Return to Slide 1
  await prevSlideBtn.click();
  await page.waitForTimeout(400);
  const sl1PixelsRestored = await getActiveCanvasPixels();
  console.log('Slide 1 restored pixels (should match redo count):', sl1PixelsRestored);
  if (sl1PixelsRestored === 0) throw new Error('Slide 1 annotations failed to persist!');

  // SCENARIO 5: Return to Blackboard — Verify state completely untouched
  console.log('\n--- Scenario 5: Return to Blackboard (Verify untouched state) ---');
  const bbTab = page.locator('button:has-text("Blackboard")');
  await bbTab.click();
  await page.waitForTimeout(400);

  const bbPixelsOnReturn = await getActiveCanvasPixels();
  console.log('Blackboard pixels on return:', bbPixelsOnReturn, '(Expected:', bbPixelsAfterRedo, ')');
  if (bbPixelsOnReturn !== bbPixelsAfterRedo) {
    throw new Error(`Blackboard strokes were modified while viewing slides! Got ${bbPixelsOnReturn}, expected ${bbPixelsAfterRedo}`);
  }

  // SCENARIO 6: Erase on Blackboard — Verify Slides untouched
  console.log('\n--- Scenario 6: Erase on Blackboard & verify Slides unaffected ---');
  const bbEraserBtn = page.locator('button[title="Eraser Tool"]').first();
  await bbEraserBtn.click();
  await page.waitForTimeout(200);

  // Erase part of Blackboard
  await page.mouse.move(bbBox.x + 280, bbBox.y + 100);
  await page.mouse.down();
  await page.mouse.move(bbBox.x + 320, bbBox.y + 100, { steps: 3 });
  await page.mouse.up();
  await page.waitForTimeout(300);

  const bbPixelsAfterErase = await getActiveCanvasPixels();
  console.log('Blackboard pixels after erase:', bbPixelsAfterErase);
  if (bbPixelsAfterErase >= bbPixelsOnReturn) throw new Error('Blackboard erase failed!');

  // Switch to Slides and verify Slide 1 still has its annotations
  await slidesTab.click();
  await page.waitForTimeout(400);
  const slPixelsAfterBbErase = await getActiveCanvasPixels();
  console.log('Slide 1 pixels after Blackboard erase (must be unchanged):', slPixelsAfterBbErase);
  if (slPixelsAfterBbErase !== sl1PixelsRestored) {
    throw new Error('Blackboard erasing affected Slides annotations!');
  }

  // SCENARIO 7: Clean tab switching mid-stroke without leaving open stroke
  console.log('\n--- Scenario 7: Mid-stroke tab switch clean finalization ---');
  // Start stroke on Slide
  await page.mouse.move(slBox.x + 50, slBox.y + 50);
  await page.mouse.down();
  // Switch to Blackboard while mouse is still down
  await bbTab.click();
  await page.mouse.up();
  await page.waitForTimeout(400);

  // Blackboard should be active and responsive without errors
  const bbResponsivePixels = await getActiveCanvasPixels();
  console.log('Blackboard responsive pixels:', bbResponsivePixels);
  if (bbResponsivePixels !== bbPixelsAfterErase) {
    throw new Error('Stray stroke left on Blackboard after tab switch!');
  }

  console.log('\n========================================');
  console.log('>>> ALL 7 ISOLATION SCENARIOS PASSED <<<');
  console.log('========================================');

  await browser.close();
}

run().catch(err => {
  console.error('\nTest script failed:', err);
  process.exit(1);
});
