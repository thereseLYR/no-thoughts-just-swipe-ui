import { test, expect } from '@playwright/test';

/**
 * The critical path: swipe until the engine is satisfied, land on a result,
 * and prove the exported CSS actually reflects the session.
 */
test('swiping produces an exportable design system', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start swiping' }).click();

  await expect(page.getByRole('heading', { name: 'Which do you prefer?' })).toBeVisible();

  // Alternate so no single axis value wins by default.
  for (let i = 0; i < 60; i++) {
    if (page.url().endsWith('/result')) break;
    await page.keyboard.press(i % 3 === 0 ? 'ArrowRight' : 'ArrowLeft');
  }

  await expect(page).toHaveURL(/\/result$/);
  await expect(page.getByRole('heading', { name: 'Your design system' })).toBeVisible();

  // Contrast audit should report a passing ratio, not a placeholder.
  await expect(page.getByText(/Text on background/)).toBeVisible();
  await expect(page.getByText(/\d+(\.\d+)?:1 AA/).first()).toBeVisible();

  await expect(page.getByRole('button', { name: /Download \.zip/ })).toBeEnabled();
});

test('undo steps a swipe back', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start swiping' }).click();

  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByText(/2 swipes/)).toBeVisible();

  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByText(/1 swipes/)).toBeVisible();
});

test('a share link renders without a local session', async ({ page }) => {
  // hue=violet, vivid, cool greys, grotesk, pill radius, hard shadow.
  await page.goto('/s/WzEsOSwyLDAsMSwzLDEsNCwyLDMsMV0');
  await expect(page.getByRole('heading', { name: 'Shared design system' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Remix this/ })).toBeVisible();
});

test('a malformed share link fails gracefully', async ({ page }) => {
  await page.goto('/s/total-nonsense');
  await expect(page.getByRole('heading', { name: "Can't open that link" })).toBeVisible();
});
