import { test, expect, type Page } from '@playwright/test';

const BASE = 'http://localhost:4173';

const GRADE1_TOYS = ['clock', 'count20', 'numberLine', 'shapes'];
const GRADE3_TOYS = ['clock', 'multiply', 'fractions', 'placeValue'];

test('no external requests', async ({ page }) => {
  const urls: string[] = [];
  page.on('request', (r) => urls.push(r.url()));

  await page.goto('/');
  await page.locator('[data-role="grade-card"][data-grade="3"]').click();
  await page.locator('[data-role="subject"]').first().click();
  await page.locator('[data-role="toy-card"]', { hasText: 'Tick-Tock Time' }).click();
  await page.locator('[data-role="mode"][data-mode="explore"]').click();
  await expect(page.locator('[data-role="clock-face"]')).toBeVisible();
  await page.locator('[data-role="mode"][data-mode="challenge"]').click();
  await expect(page.locator('[data-role="progress"]')).toHaveText('Question 1 of 10');
  await page.locator('[data-role="check"]').click();
  await expect(page.locator('[data-role="hint"], [data-role="next"], [data-role="reveal"]').first()).toBeVisible();

  expect(urls.length).toBeGreaterThan(0);
  const external = urls.filter((u) => !u.startsWith(BASE) && !u.startsWith('data:') && !u.startsWith('blob:'));
  expect(external).toEqual([]);
});

test('works offline after first visit', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); // now controlled by the service worker
  await page.evaluate(() => navigator.serviceWorker.ready);
  expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  const resp = await page.reload();
  expect(resp?.fromServiceWorker()).toBe(true);
  await page.locator('[data-role="grade-card"][data-grade="3"]').click();
  await page.locator('[data-role="subject"]').first().click();
  await page.locator('[data-role="toy-card"]', { hasText: 'Tick-Tock Time' }).click();
  await expect(page.locator('[data-role="progress"]')).toHaveText('Question 1 of 10');
  await context.close();
});

async function overflow(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth);
}

test.describe('360px portrait', () => {
  test.use({ viewport: { width: 360, height: 640 } });

  for (const [grade, toys] of [[1, GRADE1_TOYS], [3, GRADE3_TOYS]] as const) {
    for (const toy of toys) {
      for (const mode of ['explore', 'challenge']) {
        test(`Grade ${grade} ${toy} ${mode} does not scroll horizontally`, async ({ page }) => {
          await page.goto(`/#/k/${grade}/math/${toy}/${mode}`);
          await expect(page.locator('[data-role="home"]')).toBeVisible();
          if (mode === 'challenge') await expect(page.locator('[data-role="progress"]')).toBeVisible();
          await page.waitForTimeout(300);
          expect(await overflow(page)).toBeLessThanOrEqual(360);
        });
      }
    }
  }

  test('placeValue explore with every column full does not scroll horizontally', async ({ page }) => {
    await page.goto('/#/k/3/math/placeValue/explore');
    for (const col of ['h', 't', 'o']) {
      const plus = page.locator(`[data-role="pv-plus"][data-col="${col}"]`);
      for (let i = 0; i < 9; i++) await plus.click();
    }
    await expect(page.locator('[data-role="pv-value"]')).toHaveText('999');
    expect(await overflow(page)).toBeLessThanOrEqual(360);
  });

  test('clock challenge: drag minute hand from 12 to 3 gives 15 minutes', async ({ page }) => {
    await page.goto('/#/k/3/math/clock/challenge');
    const face = page.locator('[data-role="clock-face"]');
    await expect(face).toHaveAttribute('data-minutes', '0');
    const box = (await face.boundingBox())!;
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    const r = Math.min(box.width, box.height) * 0.35;
    await page.mouse.move(cx, cy - r);
    await page.mouse.down();
    await page.mouse.move(cx + r * 0.7, cy - r * 0.7, { steps: 5 });
    await page.mouse.move(cx + r, cy, { steps: 5 });
    await page.mouse.up();
    await expect(face).toHaveAttribute('data-minutes', '15');
  });
});

test('round to results: Grade 1 count20 challenge', async ({ page }) => {
  await page.goto('/#/k/1/math/count20/challenge');
  for (let i = 1; i <= 10; i++) {
    await expect(page.locator('[data-role="progress"]')).toHaveText(`Question ${i} of 10`);
    const target = Number(await page.locator('[data-role="prompt"]').getAttribute('data-target'));
    expect(target).toBeGreaterThan(0);
    const cells = page.locator('[data-role="cell"]');
    for (let c = 0; c < target; c++) await cells.nth(c).click();
    await page.locator('[data-role="check"]').click();
  }
  await expect(page.locator('[data-role="results"]')).toContainText('10 correct');
});

test.describe('grade menu', () => {
  test.use({ viewport: { width: 360, height: 640 } });

  test('360px: two columns, no horizontal scroll, closed grades are locked', async ({ page }) => {
    await page.goto('/');
    const cards = page.locator('[data-role="grade-card"]');
    await expect(cards).toHaveCount(6);
    expect(await overflow(page)).toBeLessThanOrEqual(360);
    const boxes = await cards.evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), right: r.right }; }));
    expect(new Set(boxes.map((b) => b.x)).size).toBe(2);
    for (const b of boxes) expect(b.right).toBeLessThanOrEqual(360);
    await expect(page.locator('[data-role="grade-card"][data-grade="2"]')).toHaveAttribute('aria-disabled', 'true');
    await expect(page.locator('[data-role="grade-card"][data-grade="2"]')).toContainText('🔒 Soon');
  });

  test('header toggle is reachable at 360px without scrolling sideways', async ({ page }) => {
    await page.goto('/#/k/1/math');
    const t = page.locator('[data-role="autoread-toggle"]');
    await expect(t).toHaveAttribute('aria-pressed', 'true');
    await t.click();
    await expect(t).toHaveAttribute('aria-pressed', 'false');
    await page.reload();
    await expect(page.locator('[data-role="autoread-toggle"]')).toHaveAttribute('aria-pressed', 'false');
    expect(await overflow(page)).toBeLessThanOrEqual(360);
    const box = (await t.boundingBox())!;
    expect(box.x + box.width).toBeLessThanOrEqual(360);
    expect(box.height).toBeGreaterThanOrEqual(48);
    const logo = (await page.locator('header > span').boundingBox())!;
    expect(logo.height).toBeLessThanOrEqual(box.height); // header stays one row
  });
});
