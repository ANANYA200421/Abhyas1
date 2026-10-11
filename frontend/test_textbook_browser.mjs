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

  console.log('1. Navigating to http://localhost:5173/session...');
  await page.goto('http://localhost:5173/session', { waitUntil: 'networkidle' });

  console.log('2. Switching to Smart Textbook tab...');
  await page.locator('button:has-text("Textbook")').click();
  await page.waitForSelector('.react-pdf__Page', { timeout: 15000 });
  await page.locator('.textLayer').waitFor({ state: 'attached', timeout: 5000 });
  await page.waitForTimeout(1000);

  // Test Search: "Coulomb's" with straight apostrophe vs typographic
  console.log('3. Searching for "Coulomb\'s"...');
  const searchInput = page.locator('input[placeholder="Search in book..."]');
  await searchInput.fill("Coulomb's");
  await page.waitForTimeout(1000);

  const matchIndicator = page.locator('text=/matches|match/');
  console.log('Matches for "Coulomb\'s":', await matchIndicator.first().textContent().catch(() => 'None'));

  let marks = page.locator('.pdf-search-match');
  let count = await marks.count();
  console.log('Marks for "Coulomb\'s" on Page 1:', count);
  if (count > 0) {
    console.log('Mark text:', await marks.first().textContent());
  }

  // Test Search: "Flux" (located on Page 2)
  console.log('\n4. Searching for "Flux" (which is on Page 2)...');
  await searchInput.fill('Flux');
  await page.waitForTimeout(1200);

  console.log('Matches for "Flux":', await matchIndicator.first().textContent().catch(() => 'None'));

  // Did it auto-navigate to Page 2?
  const pageInput = page.locator('input[type="number"]');
  console.log('Current page input value:', await pageInput.inputValue());

  marks = page.locator('.pdf-search-match');
  count = await marks.count();
  console.log('Marks for "Flux" on active page:', count);
  for (let i = 0; i < count; i++) {
    console.log(`Mark ${i}:`, await marks.nth(i).textContent());
  }

  // Test Next/Prev Match navigation
  console.log('\n5. Testing Next Match navigation for "Electric"...');
  await searchInput.fill('Electric');
  await page.waitForTimeout(1200);

  console.log('Initial page:', await pageInput.inputValue());
  console.log('Initial match display:', await page.locator('text=/\\d+\\/\\d+/').textContent().catch(() => 'None'));

  const nextBtn = page.locator('button[title="Next match"]');
  // Click next match multiple times to test cycle across pages
  for (let i = 1; i <= 4; i++) {
    await nextBtn.click();
    await page.waitForTimeout(500);
    const currPage = await pageInput.inputValue();
    const matchIndexText = await page.locator('text=/\\d+\\/\\d+/').textContent().catch(() => 'None');
    console.log(`After click ${i}: Page ${currPage}, match index: ${matchIndexText}`);
  }

  // Test Bookmarks
  console.log('\n6. Testing Bookmarks...');
  const bookmarkBtn = page.locator('button[title*="Bookmark"]');
  if (await bookmarkBtn.count() > 0) {
    console.log('Toggling bookmark on current page...');
    await bookmarkBtn.click();
    await page.waitForTimeout(300);
  }

  // Test Table of Contents
  console.log('\n7. Testing Table of Contents...');
  const tocBtn = page.locator('button:has-text("Contents")');
  await tocBtn.click();
  await page.waitForTimeout(500);
  const tocItems = page.locator('aside .space-y-1 button');
  const tocCount = await tocItems.count();
  console.log('Found TOC items:', tocCount);
  for (let i = 0; i < tocCount; i++) {
    console.log(`  TOC ${i}:`, (await tocItems.nth(i).textContent()).trim());
  }
  if (tocCount > 1) {
    console.log('Clicking second TOC item...');
    await tocItems.nth(1).click();
    await page.waitForTimeout(500);
    console.log('Current page after TOC jump:', await pageInput.inputValue());
  }

  console.log('\nAll browser textbook checks completed!');
  await browser.close();
}

run().catch(err => {
  console.error('Test script failed:', err);
  process.exit(1);
});
