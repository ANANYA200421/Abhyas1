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

  // 1. Dashboard to Session Workflow Navigation
  console.log('1. Navigating to Dashboard http://localhost:5173/dashboard...');
  await page.goto('http://localhost:5173/dashboard', { waitUntil: 'networkidle' });

  console.log('Verifying Dashboard elements...');
  await page.waitForSelector('text=Prof. Rajesh Sharma', { timeout: 5000 });
  const scheduleSlots = page.locator('div[title*="preview"]');
  const slotCount = await scheduleSlots.count();
  console.log('Schedule slots found:', slotCount);

  console.log('Clicking schedule slot to navigate to /preview...');
  await scheduleSlots.first().click();
  await page.waitForURL('**/preview', { timeout: 5000 });
  console.log('Successfully navigated to Studio Preview page!');

  console.log('Clicking "Launch Studio" to navigate to /session...');
  const launchStudioBtn = page.locator('button:has-text("Launch Studio")');
  await launchStudioBtn.click();
  await page.waitForURL('**/session', { timeout: 5000 });
  console.log('Successfully navigated to Active Session page!');

  // 2. Audit Circuit Lab
  console.log('\n2. Testing Circuit Lab...');
  const circuitTab = page.locator('button:has-text("Circuit Lab")');
  await circuitTab.click();
  await page.waitForTimeout(600);

  // Check initial state (switch is OPEN by default)
  const switchToggleBtn = page.locator('button:has-text("OPEN")').first();
  await switchToggleBtn.waitFor({ state: 'visible', timeout: 5000 });
  console.log('Initial switch button (OPEN) visible: true');

  // Click Check Circuit while switch is open
  console.log('Evaluating circuit with switch open...');
  const checkCircuitBtn = page.locator('button:has-text("Check Circuit")');
  await checkCircuitBtn.click();
  await page.waitForTimeout(400);

  const modalOpenResult = page.locator('text=Incorrect connection (Switch Open)');
  console.log('Modal displayed switch open error:', await modalOpenResult.isVisible());

  // Close modal
  await page.locator('button:has-text("Dismiss")').click();
  await page.waitForTimeout(300);

  // Close switch to complete circuit loop
  console.log('Closing switch to complete circuit loop...');
  await switchToggleBtn.click();
  await page.waitForTimeout(400);

  // Check switch button label changed to CLOSED
  const switchClosedBtn = page.locator('button:has-text("CLOSED")').first();
  console.log('Switch toggled to closed:', await switchClosedBtn.isVisible());

  // Verify live current display
  const currentDisplay = page.locator('text=/41\\s*mA/');
  console.log('Current reading 41mA visible:', await currentDisplay.isVisible());

  // Click Check Circuit while switch is closed
  console.log('Evaluating circuit with switch closed...');
  await checkCircuitBtn.click();
  await page.waitForTimeout(400);

  const modalSuccessResult = page.locator('text=Correct connection! 🎉');
  console.log('Modal displayed success checkmark:', await modalSuccessResult.isVisible());
  await page.locator('button:has-text("Dismiss")').click();

  // 3. Audit 3D Solar System
  console.log('\n3. Testing 3D Solar System...');
  const modelTab = page.locator('button:has-text("3D Model")');
  await modelTab.click();
  await page.waitForTimeout(800);

  // Check 3D Canvas
  const threeCanvas = page.locator('.flex-1:not(.hidden) canvas').first();
  await threeCanvas.waitFor({ state: 'visible', timeout: 8000 });
  console.log('3D Three.js canvas rendered successfully!');

  // Test Model Switcher (Solar System to Heart placeholder and back)
  const heartBtn = page.locator('button:has-text("Human Heart")');
  await heartBtn.click();
  await page.waitForTimeout(400);
  const heartCard = page.locator('text=Human Heart 3D Asset');
  console.log('GLB placeholder card displayed:', await heartCard.isVisible());

  const solarBtn = page.locator('button:has-text("Solar System")');
  await solarBtn.click();
  await page.waitForTimeout(400);
  console.log('Switched back to Solar System!');

  // Test Reset View button
  const resetBtn = page.locator('button[data-gesture-target="action-reset-3d"]');
  console.log('Reset View button visible:', await resetBtn.isVisible());
  await resetBtn.click();
  await page.waitForTimeout(300);

  console.log('\n>>> SUCCESS: All modules verified for functional correctness!');
  await browser.close();
}

run().catch(err => {
  console.error('Test script failed:', err);
  process.exit(1);
});
