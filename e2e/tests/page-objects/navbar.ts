import { type Page } from '@playwright/test';

export class Navbar {
  constructor(private readonly page: Page) {}

  private get header() {
    return this.page.locator('header');
  }

  async gotoProjects() {
    await this.header.getByRole('link', { name: 'Projects', exact: true }).click();
    await this.page.waitForURL(/\/projects(?:\?.*)?$/);
  }

  async gotoDashboard() {
    await this.header.getByRole('link', { name: 'Dashboard', exact: true }).click();
    await this.page.waitForURL(/\/dashboard(?:\?.*)?$/);
  }

  async gotoProfile() {
    await this.header.getByRole('link', { name: /@/ }).click();
    await this.page.waitForURL(/\/profile(?:\?.*)?$/);
  }

  async signOut() {
    await this.header.getByRole('button', { name: /sign out/i }).click({ force: true });
    await this.page.waitForURL(/\/login(?:\?.*)?$/);
  }
}