import { test, expect } from '@playwright/test';

test.describe('Health checks', () => {
  test('web app loads and returns 200', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
  });

  test('login page renders', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
  });

  test('register page renders', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: /sign up|create.*account/i })).toBeVisible();
  });

  test('API is reachable', async ({ request }) => {
    const res = await request.get('http://localhost:3000/');
    expect(res.ok()).toBeTruthy();
  });
});
