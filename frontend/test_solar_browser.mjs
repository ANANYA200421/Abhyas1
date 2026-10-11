import { chromium } from 'playwright';

async function run() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.log(`[Browser Console Error] ${msg.text()}`);
    }
  });

  console.log('1. Navigating to http://localhost:5173/session...');
  await page.goto('http://localhost:5173/session', { waitUntil: 'domcontentloaded' });

  // Switch to 3D Models Tab
  console.log('2. Switching to 3D Model tab...');
  const modelsTab = page.locator('button:has-text("3D Model")');
  await modelsTab.waitFor({ state: 'visible', timeout: 15000 });
  await modelsTab.click();
  await page.waitForTimeout(600);

  // Verify Three.js Canvas
  console.log('3. Verifying Three.js Canvas...');
  const threeCanvas = page.locator('canvas:visible').first();
  await threeCanvas.waitFor({ state: 'visible', timeout: 10000 });
  const canvasBox = await threeCanvas.boundingBox();
  console.log('Canvas bounding box:', canvasBox);

  // Test Mouse Drag (OrbitControls Rotate)
  console.log('4. Testing mouse drag rotation on Canvas...');
  await page.mouse.move(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(canvasBox.x + canvasBox.width / 2 + 100, canvasBox.y + canvasBox.height / 2 + 60, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(300);

  // Test Planet Selection via Click on Sun/Planet
  console.log('5. Clicking center of canvas to select Sun/celestial body...');
  await page.mouse.click(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2);
  await page.waitForTimeout(400);

  // Check if callout card is visible or click Reset View
  console.log('6. Testing Reset View button...');
  const resetBtn = page.locator('button[data-gesture-target="action-reset-3d"]');
  await resetBtn.waitFor({ state: 'visible', timeout: 5000 });
  await resetBtn.click();
  await page.waitForTimeout(300);
  console.log('Reset View clicked successfully.');

  // Test Switching to Human Heart (.glb) mode
  console.log('7. Switching to Human Heart (.glb) mode...');
  const heartBtn = page.locator('button:has-text("Human Heart (.glb)")');
  await heartBtn.click();
  await page.waitForTimeout(600);

  // Verify Active Anatomical Simulation badge is displayed without crashing
  const heartBadge = page.locator('text=Active Anatomical Simulation');
  await heartBadge.waitFor({ state: 'visible', timeout: 5000 });
  console.log('Human Heart mode active and rendered with simulation badge.');

  // Verify Canvas is still active and rotating
  await page.mouse.move(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(canvasBox.x + canvasBox.width / 2 - 80, canvasBox.y + canvasBox.height / 2 - 40, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(300);

  // Switch back to Solar System
  console.log('8. Switching back to Solar System...');
  const solarBtn = page.locator('button:has-text("Solar System")');
  await solarBtn.click();
  await page.waitForTimeout(500);

  // Check for any unhandled 3D/GLTF errors (ignore webcam permission error)
  const fatalErrors = consoleErrors.filter(e => !e.includes('Webcam initialization failed'));
  if (fatalErrors.length > 0) {
    throw new Error(`Unexpected browser errors: ${fatalErrors.join('; ')}`);
  }

  console.log('\n=============================================');
  console.log('>>> 3D SOLAR SYSTEM & HEART BROWSER TESTS PASSED <<<');
  console.log('=============================================');

  await browser.close();
}

run().catch(err => {
  console.error('\nTest script failed:', err);
  process.exit(1);
});
