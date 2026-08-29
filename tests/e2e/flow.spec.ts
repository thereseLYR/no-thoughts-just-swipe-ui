import { test, expect } from '@playwright/test';

/**
 * The critical path: swipe until the engine is satisfied, land on a result,
 * and prove the exported CSS actually reflects the session.
 */
test('swiping produces an exportable design system', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start swiping' }).click();

  // The opening round compares whole aesthetics, not single axes.
  await expect(
    page.getByRole('heading', { name: 'Which world do you want to live in?' }),
  ).toBeVisible();

  // Alternate so no single axis value wins by default.
  for (let i = 0; i < 40; i++) {
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

test('later rounds show only what changed, expandable to the full page', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start swiping' }).click();

  // The vibe round is a full page already — nothing to expand into.
  await expect(page.getByRole('button', { name: /Show full page/ })).toHaveCount(0);

  // Swipe out of the vibe round.
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowLeft');

  const expand = page.getByRole('button', { name: /Show full page/ });
  await expect(expand).toBeVisible();

  await expand.click();
  await expect(page.getByRole('button', { name: /Just the difference/ })).toBeVisible();

  // Keyboard shortcut toggles it back.
  await page.keyboard.press('f');
  await expect(page.getByRole('button', { name: /Show full page/ })).toBeVisible();
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
  // The cyberpunk preset: dark, neon magenta, terminal type, uppercase, glow.
  await page.goto('/s/WzMsMSwxMSwzLDAsMSwyLDQsNSwyLDEsMSwwLDEsMCwwXQ');
  await expect(page.getByRole('heading', { name: 'Shared design system' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Remix this/ })).toBeVisible();
});

test('a malformed share link fails gracefully', async ({ page }) => {
  await page.goto('/s/total-nonsense');
  await expect(page.getByRole('heading', { name: "Can't open that link" })).toBeVisible();
});

test('an older link is rejected by version rather than silently misread', async ({ page }) => {
  // Same encoding, engine v1 — the param space has changed twice since.
  await page.goto('/s/WzEsOSwyLDAsMSwzLDEsNCwyLDMsMV0');
  await expect(page.getByRole('heading', { name: "Can't open that link" })).toBeVisible();
  await expect(page.getByText(/engine v1/)).toBeVisible();
});

test('the agent setup prompt is the primary path and copies', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/s/WzMsMSwxMSwzLDAsMSwyLDQsNSwyLDEsMSwwLDEsMCwwXQ');

  await expect(page.getByText('Recommended')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Let your agent set it up' })).toBeVisible();

  // The manual route stays available, just clearly secondary.
  await expect(page.getByRole('button', { name: /Download \.zip instead/ })).toBeVisible();

  // SETUP-PROMPT.md leads the file list and is what you see first.
  await expect(page.getByRole('button', { name: 'SETUP-PROMPT.md' })).toBeVisible();

  await page.getByRole('button', { name: /Copy setup prompt/ }).click();
  await expect(page.getByRole('button', { name: /Copied — paste it in/ })).toBeVisible();

  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain('Set up this design system in my project');
  expect(copied).toContain('Inspect the project first');
  expect(copied).toContain('--ds-accent:');
  expect(copied).toContain('AGENTS.md');
});

test('hover states are previewable', async ({ page }) => {
  await page.goto('/s/WzMsMSwxMSwzLDAsMSwyLDQsNSwyLDEsMSwwLDEsMCwwXQ');

  // The results preview is not inside a button, so real pointer hover applies.
  const hoverable = page.locator('[data-ds-hoverable]');
  await expect(hoverable).toBeVisible();

  const button = hoverable.locator('[data-ds-interactive]').first();
  const rest = await button.evaluate((el) => getComputedStyle(el).backgroundColor);
  await button.hover();
  await expect
    .poll(() => button.evaluate((el) => getComputedStyle(el).backgroundColor))
    .not.toBe(rest);
});
