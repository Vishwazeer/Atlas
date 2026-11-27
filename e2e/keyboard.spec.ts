import { expect, test } from '@playwright/test';

test('calendar cells rove with arrow keys', async ({ page }) => {
  await page.goto('/charts/calendar-heatmap');
  const first = page.locator('rect.mark--cell[tabindex="0"]');
  await first.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('rect.mark--cell:focus')).toHaveAttribute('data-index', '7');
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('rect.mark--cell:focus')).toHaveAttribute('data-index', '8');
});

test('treemap drills in with Enter and back with Escape', async ({ page }) => {
  await page.goto('/charts/data-treemap');
  const block = page.locator('rect.treemap__group[tabindex="0"]');
  await block.focus();
  await page.keyboard.press('Enter');
  const crumbs = page.getByRole('navigation', { name: 'Treemap level' });
  await expect(crumbs.getByRole('button', { name: 'All regions' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(crumbs.getByRole('button', { name: 'All regions' })).toHaveCount(0);
});

test('brush window slider responds to the keyboard', async ({ page }) => {
  await page.goto('/charts/brush-time-series');
  const slider = page.getByRole('slider', { name: 'Brush window' });
  const before = await slider.getAttribute('aria-valuenow');
  await slider.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(slider).not.toHaveAttribute('aria-valuenow', before ?? '');
});
