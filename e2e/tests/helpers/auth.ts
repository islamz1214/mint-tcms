import { type Page } from '@playwright/test';
import { AuthPage, createTestUser } from '../page-objects/auth-page';

/** Default test user credentials — register once, reuse across tests */
export const TEST_USER = createTestUser('e2e', 'E2E Tester', 'Test1234!');
const API_URL = 'http://localhost:3000';

/**
 * Register a new user and return to the dashboard.
 * Call once per test worker in a setup fixture.
 */
export async function registerUser(page: Page) {
  await new AuthPage(page).registerAndExpectDashboard(TEST_USER);
}

/**
 * Log in with the test user and wait for dashboard.
 */
export async function loginUser(page: Page) {
  await new AuthPage(page).loginAndExpectDashboard(TEST_USER.email, TEST_USER.password);
}

/**
 * Ensure the user is authenticated. Tries to visit dashboard;
 * if redirected to login, performs login flow.
 */
export async function ensureLoggedIn(page: Page) {
  await page.goto('/dashboard');
  if (page.url().includes('/login')) {
    await loginUser(page);
  }
  await new AuthPage(page).expectDashboard();
}

export async function authenticateViaApi(page: Page, user = TEST_USER) {
  const response = await page.request.post(`${API_URL}/auth/register`, {
    data: user,
  });

  if (!response.ok()) {
    throw new Error(`API auth setup failed with status ${response.status()}`);
  }

  const data = (await response.json()) as { access_token: string };
  await page.context().addInitScript((token: string) => {
    window.localStorage.setItem('token', token);
  }, data.access_token);
  await page.goto('/dashboard');
  await new AuthPage(page).expectDashboard();
}
