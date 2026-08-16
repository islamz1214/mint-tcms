import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { AuthPage, createTestUser } from '../page-objects/auth-page';

test.describe('Dashboard accessibility', () => {
  test.beforeEach(async ({ page }) => {
    const authPage = new AuthPage(page);
    const user = createTestUser('a11y-dash', 'A11y Dashboard', 'A11y1234!');

    await authPage.registerAndExpectDashboard(user);
  });

  test('dashboard has no a11y violations', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'section508'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
