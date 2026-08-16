import { expect, type Page } from '@playwright/test';

export type TestUser = {
  name: string;
  organizationName: string;
  email: string;
  password: string;
};

export function createTestUser(prefix: string, name: string, password: string): TestUser {
  return {
    name,
    organizationName: `${name} Org ${Math.random().toString(36).slice(2, 7)}`,
    email: `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`,
    password,
  };
}

export class AuthPage {
  constructor(private readonly page: Page) {}

  private async waitForAppReady() {
    const compilingIndicator = this.page.getByText('Compiling').last();
    if (await compilingIndicator.isVisible().catch(() => false)) {
      await expect(compilingIndicator).not.toBeVisible({ timeout: 30000 });
    }
  }

  async gotoLogin() {
    await this.page.goto('/login');
    await this.waitForAppReady();
  }

  async gotoRegister() {
    await this.page.goto('/register');
    await this.waitForAppReady();
  }

  async register(user: TestUser) {
    await this.gotoRegister();
    await this.page.getByLabel('Name').fill(user.name);
    await this.page.getByLabel('Organization Name').fill(user.organizationName);
    await this.page.getByLabel('Email').fill(user.email);
    await this.page.getByLabel('Password').fill(user.password);
    await this.page.getByRole('button', { name: /create account/i }).click({ force: true });
  }

  async registerAndExpectDashboard(user: TestUser) {
    await this.register(user);
    await this.expectDashboard();
  }

  async login(email: string, password: string) {
    await this.gotoLogin();
    await this.page.getByLabel('Email').fill(email);
    await this.page.getByLabel('Password').fill(password);
    await this.page.getByRole('button', { name: /sign in/i }).click({ force: true });
  }

  async loginAndExpectDashboard(email: string, password: string) {
    await this.login(email, password);
    await this.expectDashboard();
  }

  async expectDashboard() {
    await expect(this.page).toHaveURL(/\/dashboard(?:\?.*)?$/, { timeout: 10000 });
    await expect(this.page.getByRole('heading', { name: /welcome back/i })).toBeVisible({ timeout: 10000 });
  }
}