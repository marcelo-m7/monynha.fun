import { expect, test, type Locator, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const screenshotDir = 'test-results/navbar-responsive';

const viewports = [
  { name: 'mobile-small', width: 375, height: 812 },
  { name: 'mobile-common', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop-small', width: 1024, height: 768 },
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'desktop-wide', width: 1440, height: 900 },
];

const desktopBreakpoint = 1280;
const desktopPrimaryLinks = [/videos/i, /playlists/i, /imports/i, /facodi/i, /community/i];
const mobilePrimaryLinks = [/videos/i, /playlists/i, /imports/i, /facodi/i, /curation/i, /community/i];

async function preparePage(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('i18nextLng', 'en');
    sessionStorage.setItem('o2-splash-seen', 'true');
  });

  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
}

async function assertNoHorizontalOverflow(page: Page) {
  const metrics = await page.evaluate(() => {
    const root = document.documentElement;
    return {
      clientWidth: root.clientWidth,
      scrollWidth: Math.max(root.scrollWidth, document.body.scrollWidth),
    };
  });

  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
}

async function assertHeaderItemsFit(page: Page) {
  const result = await page.evaluate(() => {
    const header = document.querySelector('header');
    const logo = header?.querySelector('a[aria-label="Tube O2 home"]');

    if (!header || !logo) {
      return { missingHeader: true, cutOff: [], overlapsLogo: [] };
    }

    const viewportWidth = document.documentElement.clientWidth;
    const logoRect = logo.getBoundingClientRect();
    const visibleElements = Array.from(header.querySelectorAll<HTMLElement>('a, button, [role="combobox"]')).filter((element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    });

    const intersectsLogo = (rect: DOMRect) => (
      rect.left < logoRect.right &&
      rect.right > logoRect.left &&
      rect.top < logoRect.bottom &&
      rect.bottom > logoRect.top
    );

    return {
      missingHeader: false,
      cutOff: visibleElements
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.left < -1 || rect.right > viewportWidth + 1;
        })
        .map((element) => element.getAttribute('aria-label') || element.textContent?.trim() || element.tagName),
      overlapsLogo: visibleElements
        .filter((element) => element !== logo && !logo.contains(element) && !element.contains(logo))
        .filter((element) => intersectsLogo(element.getBoundingClientRect()))
        .map((element) => element.getAttribute('aria-label') || element.textContent?.trim() || element.tagName),
    };
  });

  expect(result.missingHeader).toBe(false);
  expect(result.cutOff).toEqual([]);
  expect(result.overlapsLogo).toEqual([]);
}

async function openMobileMenu(page: Page) {
  const menuButton = page.locator('header').getByRole('button', { name: /toggle menu/i });
  await expect(menuButton).toBeVisible();
  await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
  await menuButton.click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  return dialog;
}

async function assertFocusStaysInsideDialog(page: Page, dialog: Locator) {
  await expect.poll(async () => dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Tab');
  await expect.poll(async () => dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true);
}

test.beforeAll(() => {
  mkdirSync(screenshotDir, { recursive: true });
});

test.describe('responsive top navigation', () => {
  for (const viewport of viewports) {
    test(`keeps the navbar stable at ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await preparePage(page);

      await expect(page.getByRole('link', { name: /tube o2 home/i }).first()).toBeVisible();
      await assertNoHorizontalOverflow(page);
      await assertHeaderItemsFit(page);

      const header = page.locator('header');

      if (viewport.width >= desktopBreakpoint) {
        await page.screenshot({ path: `${screenshotDir}/${viewport.name}.png`, fullPage: false });

        await expect(header.getByRole('navigation', { name: /navigation/i })).toBeVisible();
        await expect(header.getByRole('button', { name: /toggle menu/i })).toHaveCount(0);
        await expect(header.getByRole('button', { name: /submit video/i })).toBeVisible();
        await expect(header.getByRole('button', { name: /login/i })).toBeVisible();
        await expect(header.getByRole('combobox', { name: /language/i })).toBeVisible();
        await expect(header.getByRole('button', { name: /switch to (dark|light) mode/i })).toBeVisible();

        const desktopNavigation = header.getByRole('navigation', { name: /navigation/i });
        for (const linkName of desktopPrimaryLinks) {
          await expect(desktopNavigation.getByRole('link', { name: linkName })).toBeVisible();
        }

        const projectMenuButton = header.getByRole('button', { name: /project/i });
        await expect(projectMenuButton).toBeVisible();
        await projectMenuButton.click();
        await expect(page.getByRole('menu').getByText(/curation/i)).toBeVisible();
        await page.keyboard.press('Escape');

        return;
      }

      await page.screenshot({ path: `${screenshotDir}/${viewport.name}-closed.png`, fullPage: false });
      await expect(header.getByRole('navigation', { name: /navigation/i })).toBeHidden();

      let dialog = await openMobileMenu(page);
      await assertFocusStaysInsideDialog(page, dialog);
      await page.screenshot({ path: `${screenshotDir}/${viewport.name}-open.png`, fullPage: false });

      for (const linkName of [/^home$/i, ...mobilePrimaryLinks]) {
        await expect(dialog.getByRole('link', { name: linkName }).first()).toBeVisible();
      }
      await expect(dialog.getByRole('button', { name: /submit video/i }).first()).toBeVisible();
      await expect(dialog.getByRole('button', { name: /login/i }).first()).toBeVisible();
      await expect(dialog.getByRole('combobox', { name: /language/i }).first()).toBeVisible();
      await expect(dialog.getByRole('button', { name: /switch to (dark|light) mode/i }).first()).toBeVisible();
      await assertNoHorizontalOverflow(page);

      if (viewport.width > 430) {
        await page.mouse.click(8, 8);
      } else {
        await page.keyboard.press('Escape');
      }
      await expect(page.getByRole('dialog')).toBeHidden();

      dialog = await openMobileMenu(page);
      await dialog.getByRole('link', { name: /videos/i }).click();
      await expect(page).toHaveURL(/\/videos/);
      await expect(page.getByRole('dialog')).toBeHidden();
      await assertNoHorizontalOverflow(page);
    });
  }
});

test.describe('authenticated top navigation', () => {
  const storageState = process.env.PLAYWRIGHT_AUTH_STORAGE;

  test.use(storageState ? { storageState } : {});

  test('keeps profile actions available when an authenticated storage state is supplied', async ({ page }) => {
    test.skip(!storageState, 'Set PLAYWRIGHT_AUTH_STORAGE to a Playwright storageState JSON file for authenticated navbar coverage.');

    await page.setViewportSize({ width: 390, height: 844 });
    await preparePage(page);

    const dialog = await openMobileMenu(page);
    await expect(dialog.getByRole('link', { name: /my profile/i })).toBeVisible();
    await expect(dialog.getByRole('link', { name: /messages/i })).toBeVisible();
    await expect(dialog.getByRole('link', { name: /notifications/i })).toBeVisible();
    await expect(dialog.getByRole('button', { name: /logout/i })).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });
});
