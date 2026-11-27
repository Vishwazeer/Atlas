import { expect, test } from '@playwright/test';

const CHARTS = [
  ['topology-graph', 'Topology graph'],
  ['brush-time-series', 'Brush time series'],
  ['calendar-heatmap', 'Calendar heatmap'],
  ['data-treemap', 'Data treemap'],
  ['severity-breakdown', 'Severity breakdown'],
  ['sla-rings', 'SLA rings'],
] as const;

test('overview shows the brand and links every chart', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Atlas/);
  await expect(page.getByRole('heading', { level: 1, name: 'Atlas' })).toBeVisible();
  await expect(page.getByText('Charts that read your infrastructure like a map.')).toBeVisible();
  for (const [, title] of CHARTS) await expect(page.getByRole('link', { name: new RegExp(title) }).first()).toBeAttached();
});

for (const [slug, title] of CHARTS) {
  test(`${title} renders and switches to a table`, async ({ page }) => {
    await page.goto(`/charts/${slug}`);
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
    await expect(page.locator('.chart__plot svg').first()).toBeVisible();
    await page.getByRole('button', { name: /view as table/i }).click();
    await expect(page.getByRole('table').first()).toBeVisible();
  });
}

test('deep links survive a reload (SPA rewrite)', async ({ page }) => {
  await page.goto('/charts/data-treemap');
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Data treemap' })).toBeVisible();
});

test('theme toggle recolours charts through tokens', async ({ page }) => {
  await page.goto('/charts/calendar-heatmap');
  const cell = page.locator('rect.mark--cell').first();
  await expect(cell).toBeVisible();
  const before = await cell.evaluate((el) => getComputedStyle(el).fill);
  await page.getByRole('button', { name: /switch to (light|dark) theme/i }).click();
  await expect.poll(() => cell.evaluate((el) => getComputedStyle(el).fill)).not.toBe(before);
});

test('no horizontal page scroll', async ({ page }) => {
  for (const path of ['/', '/charts/topology-graph', '/charts/calendar-heatmap']) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  }
});
