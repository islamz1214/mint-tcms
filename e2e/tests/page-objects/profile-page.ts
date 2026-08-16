import { expect, type Page } from '@playwright/test';

export class ProfilePage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/profile');
    await expect(this.page.getByRole('heading', { name: 'Profile' })).toBeVisible();
  }

  async updateProfile(name: string, email?: string) {
    await this.page.getByLabel('Name').fill(name);
    if (email !== undefined) {
      await this.page.getByLabel('Email').fill(email);
    }
    await this.page.getByRole('button', { name: /save changes/i }).click();
  }

  async updatePassword(password: string, confirmation = password) {
    await this.page.getByLabel('New Password', { exact: true }).fill(password);
    await this.page.getByLabel('Confirm New Password', { exact: true }).fill(confirmation);
    await this.page.getByRole('button', { name: /update password/i }).click();
  }

  async expectProfileUpdated() {
    await expect(this.page.getByText('Profile updated successfully.')).toBeVisible();
  }

  async expectPasswordUpdated() {
    await expect(this.page.getByText('Password updated successfully.')).toBeVisible();
  }
}