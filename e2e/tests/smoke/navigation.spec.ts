import { test, expect } from '@playwright/test';
import { AuthPage, createTestUser } from '../page-objects/auth-page';
import { Navbar } from '../page-objects/navbar';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    const authPage = new AuthPage(page);
    const user = createTestUser('nav', 'Nav Tester', 'Nav1234!');

    await authPage.registerAndExpectDashboard(user);
  });

  test('navbar links are visible', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Projects' })).toBeVisible();
  });

  test('can navigate to Projects page', async ({ page }) => {
    const navbar = new Navbar(page);

    await navbar.gotoProjects();
    await expect(page.getByRole('heading', { name: /projects/i })).toBeVisible();
  });

  test('can navigate back to Dashboard', async ({ page }) => {
    const navbar = new Navbar(page);

    await navbar.gotoProjects();
    await navbar.gotoDashboard();
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });

  test('unauthenticated user is redirected to login', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
    await context.close();
  });
});
