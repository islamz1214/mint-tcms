import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Login page accessibility', () => {
  test('login page has no a11y violations', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'section508'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('register page has no a11y violations', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: /sign up|create.*account/i })).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'section508'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
