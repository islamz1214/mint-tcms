import { test, expect } from '@playwright/test';
import { AuthPage, createTestUser } from '../page-objects/auth-page';
import { Navbar } from '../page-objects/navbar';

test.describe('Login flow', () => {
  test('user can register a new account', async ({ page }) => {
    const authPage = new AuthPage(page);
    const user = createTestUser('smoke', 'Smoke Tester', 'Smoke1234!');

    await authPage.registerAndExpectDashboard(user);
  });

  test('user can log out and log back in', async ({ page }) => {
    const authPage = new AuthPage(page);
    const navbar = new Navbar(page);
    const user = createTestUser('smoke-login', 'Smoke Tester', 'Smoke1234!');

    await authPage.registerAndExpectDashboard(user);
    await navbar.signOut();
    await authPage.loginAndExpectDashboard(user.email, user.password);
  });

  test('invalid credentials show error', async ({ page }) => {
    const authPage = new AuthPage(page);

    await authPage.login('wrong@test.com', 'wrongpassword');

    await expect(page.getByText(/invalid|unauthorized|wrong/i)).toBeVisible();
    expect(page.url()).toContain('/login');
  });
});
