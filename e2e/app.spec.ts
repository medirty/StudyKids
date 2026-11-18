import { test, expect, type Page } from '@playwright/test';

const BASE = 'http://localhost:4173';

const STAGE1_TOYS = ['clock', 'count20', 'numberLine', 'shapes'];
const STAGE3_TOYS = ['clock', 'multiply', 'fractions', 'placeValue'];

test('no external requests', async ({ page }) => {
  const urls: string[] = [];
  page.on('request', (r) => urls.push(r.url()));

  await page.goto('/');
  await page.getByRole('button', { name: /Kakak/ }).click();
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
  await page.getByRole('button', { name: /Kakak/ }).click();
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

  for (const [profile, stage, toys] of [['adik', 1, STAGE1_TOYS], ['kakak', 3, STAGE3_TOYS]] as const) {
    for (const toy of toys) {
      for (const mode of ['explore', 'challenge']) {
        test(`${profile} ${toy} ${mode} does not scroll horizontally`, async ({ page }) => {
          await page.goto(`/#/p/${profile}/${stage}/math/${toy}/${mode}`);
          await expect(page.locator('[data-role="home"]')).toBeVisible();
          if (mode === 'challenge') await expect(page.locator('[data-role="progress"]')).toBeVisible();
          await page.waitForTimeout(300);
          expect(await overflow(page)).toBeLessThanOrEqual(360);
        });
      }
    }
  }

  test('placeValue explore with every column full does not scroll horizontally', async ({ page }) => {
    await page.goto('/#/p/kakak/3/math/placeValue/explore');
    for (const col of ['h', 't', 'o']) {
      const plus = page.locator(`[data-role="pv-plus"][data-col="${col}"]`);
      for (let i = 0; i < 9; i++) await plus.click();
    }
    await expect(page.locator('[data-role="pv-value"]')).toHaveText('999');
    expect(await overflow(page)).toBeLessThanOrEqual(360);
  });

  test('clock challenge: drag minute hand from 12 to 3 gives 15 minutes', async ({ page }) => {
    await page.goto('/#/p/kakak/3/math/clock/challenge');
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

test('round to results: Adik count20 challenge', async ({ page }) => {
  await page.goto('/#/p/adik/1/math/count20/challenge');
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

test('long name at 360px does not overflow', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.addInitScript(() => {
    localStorage.setItem('studykids.profileCustom', JSON.stringify({
      adik: { name: 'WWWWWWWWWWWW', emoji: '🐱' },
      kakak: { name: 'MMMMMMMMMMMM', emoji: '🐶' },
    }));
  });
  await page.goto('/');
  await expect(page.locator('[data-role="profile-card"]').first()).toContainText('WWWWWWWWWWWW');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  for (const c of await page.locator('[data-role="profile-card"]').all()) {
    const box = (await c.boundingBox())!;
    expect(box.x + box.width).toBeLessThanOrEqual(360);
  }
  await page.locator('[data-role="profile-card"][data-profile="adik"]').click();
  await expect(page.locator('[data-role="greeting"]')).toHaveText('Hi, WWWWWWWWWWWW! 👋');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  const hdr = (await page.locator('header').boundingBox())!;
  expect(hdr.x + hdr.width).toBeLessThanOrEqual(360);
});

test('hold a profile card for 2 s to rename it; names stay on the device', async ({ page }) => {
  await page.goto('/');
  const adik = page.locator('[data-role="profile-card"][data-profile="adik"]');
  const box = (await adik.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(800);
  await page.mouse.up();
  await expect(page.getByRole('dialog')).toHaveCount(0); // a short hold does nothing
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 4000 });
  await page.mouse.up();
  await expect(page).toHaveURL(/\/$|#\/?$/); // not selected
  await page.locator('[data-role="name-input"]').fill('Nadia');
  await page.locator('[data-role="avatar"][data-emoji="🦊"]').click();
  await page.locator('[data-role="save"]').click();
  await expect(adik).toContainText('Nadia');
  await expect(adik).toContainText('🦊');
  await page.reload();
  await expect(page.locator('[data-role="profile-card"][data-profile="adik"]')).toContainText('Nadia');
});
