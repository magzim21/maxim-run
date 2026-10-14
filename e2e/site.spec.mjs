// The main flows of maxim.run in a phone viewport (and desktop): themes, languages, shell, globe.
import { test, expect } from '@playwright/test';

// Nothing sticks out sideways (body hides the scrollbar, so measure the elements themselves).
const noHorizontalScroll = async (page) => {
  const widths = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth, document.documentElement.clientWidth]);
  expect(widths[0], 'page wider than the screen').toBeLessThanOrEqual(widths[2]);
  expect(widths[1], 'layout viewport wider than the screen').toBeLessThanOrEqual(widths[2]);
  const out = await page.evaluate(() => {
    const w = document.documentElement.clientWidth;
    return [...document.querySelectorAll('header *, main *, footer *')]
      .filter((e) => !e.closest('.marquee, .halo, .langs__list, .nav__links, pre'))
      .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > w + 1 || r.left < -1); })
      .map((e) => `${e.tagName}.${e.className}`);
  });
  expect(out).toEqual([]);
};

test.beforeEach(async ({ page }) => {
  page.on('pageerror', (e) => { throw e; });
});

test('home renders the hero, links and no horizontal scroll', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toHaveText('Max Onyx');
  await expect(page.locator('.loc')).toContainText('Vancouver Island');
  await expect(page.locator('a[href="mailto:me@maxim.run"]').first()).toBeVisible();
  for (const host of ['linkedin.com', 'github.com/magzim21', 'youtube.com/@HelloWorldTrip', 'instagram.com', 't.me/usryname', 'medium.com', 'credly.com']) {
    await expect(page.locator(`a[href*="${host}"]`).first()).toBeAttached();
  }
  await noHorizontalScroll(page);
});

test('a theme picked from the header survives a reload', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-theme-set="blueprint"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'blueprint');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'blueprint');
  await page.locator('[data-theme-set="nebula"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'nebula');
});

test('the language menu opens Russian, Hebrew is right-to-left without overflow', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-dropdown-btn]').click();
  await page.locator('[data-dropdown-panel] a[data-lang="ru"]').click();
  await expect(page).toHaveURL(/\/ru\/$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  await page.goto('/he/');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await noHorizontalScroll(page);
});

test('first visit to / follows the browser language once', async ({ browser }) => {
  const ctx = await browser.newContext({ locale: 'uk-UA' });
  const page = await ctx.newPage();
  await page.goto('/');
  await expect(page).toHaveURL(/\/uk\/$/);
  await page.locator('.foot__langs a[data-lang="en"]').click();
  await expect(page).toHaveURL(/127\.0\.0\.1:4321\/$/);
  await page.reload();
  await expect(page).toHaveURL(/127\.0\.0\.1:4321\/$/);
  await ctx.close();
});

test('the shell answers commands and switches theme and language', async ({ page }) => {
  await page.goto('/#shell');
  const input = page.locator('#shell-input');
  await input.fill('whoami');
  await input.press('Enter');
  await expect(page.locator('[data-shell-out]')).toContainText('DevOps and platform engineer');
  await input.fill('theme blueprint');
  await input.press('Enter');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'blueprint');
  await input.fill('lang es');
  await input.press('Enter');
  await expect(page).toHaveURL(/\/es\/#shell$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
});

test('the globe draws land and the route', async ({ page }) => {
  await page.goto('/');
  await page.locator('#travel').scrollIntoViewIfNeeded();
  const canvas = page.locator('[data-globe] canvas');
  await expect.poll(async () => canvas.evaluate((c) => {
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let lit = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 0) lit++;
    return lit;
  }), { timeout: 10_000 }).toBeGreaterThan(2000);
});

test('ClickOps vs code toggle and the copy-email button', async ({ page }) => {
  await page.goto('/');
  const versus = page.locator('[data-versus]');
  await versus.scrollIntoViewIfNeeded();
  await versus.locator('[data-mode-set="manual"]').click();
  await expect(versus).toHaveAttribute('data-mode', 'manual');
  await page.locator('[data-copy]').scrollIntoViewIfNeeded();
  await page.locator('[data-copy]').click();
  await expect(page.locator('[data-copy] span')).toHaveText('Copied');
});

test('unknown paths get the 404 page', async ({ page }) => {
  const res = await page.goto('/does-not-exist');
  expect(res.status()).toBe(404);
  await expect(page.locator('h1')).toContainText('404');
});

test('ring icons are whole, steady under the cursor, and not on white tiles', async ({ page, isMobile }) => {
  await page.goto('/');
  const hero = await page.locator('.hero').boundingBox();
  const links = page.locator('.orbit__link');
  await expect(links).toHaveCount(10);
  for (const box of await links.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON()))) {
    expect(box.left, 'ring icon cut on the left').toBeGreaterThanOrEqual(hero.x - 1);
    expect(box.right, 'ring icon cut on the right').toBeLessThanOrEqual(hero.x + hero.width + 1);
  }
  const tiles = await page.locator('.orbit__link--codelaw .orbit__face, .orbit__link--leadpancakes .orbit__face, .orbit__link--mediaarchive .orbit__face')
    .evaluateAll((els) => els.map((e) => getComputedStyle(e).backgroundColor));
  for (const bg of tiles) expect(bg).not.toBe('rgb(255, 255, 255)');
  if (isMobile) return; // hover is a desktop interaction
  const first = links.first();
  // The ring keeps moving until the cursor is over it, so aim twice: the second aim hits a paused ring.
  for (let i = 0; i < 2; i++) {
    const box = await first.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(300);
  }
  const a = await first.boundingBox();
  await page.waitForTimeout(700);
  const b = await first.boundingBox();
  expect(Math.abs(a.x - b.x) + Math.abs(a.y - b.y), 'icon moved under the cursor').toBeLessThan(1);
  await expect(page.locator('[data-tipbox]')).toHaveClass(/is-on/);
  await page.mouse.move(b.x + b.width / 2 + 3, b.y + b.height / 2 + 3); // still inside the icon
  await expect(page.locator('[data-tipbox]')).toHaveClass(/is-on/);
});

test('the location chip scrolls to the globe and flies it to Vancouver Island', async ({ page }) => {
  await page.goto('/ru/');
  await page.locator('.hero .loc').click();
  const globe = page.locator('[data-globe]');
  await expect(globe).toBeInViewport({ ratio: 0.5, timeout: 5000 });
  await expect(globe).toHaveAttribute('data-view', 'home', { timeout: 6000 });
  await expect(globe).toHaveAttribute('data-home-label', 'Дом: остров Ванкувер');
  // The home marker is drawn in the middle of the canvas: sample its colour there.
  const lit = await globe.locator('canvas').evaluate((c) => {
    const d = c.getContext('2d').getImageData(c.width / 2 - 6, c.height / 2 - 6, 12, 12).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 200) n++;
    return n;
  });
  expect(lit, 'home marker not in the centre').toBeGreaterThan(40);
});
