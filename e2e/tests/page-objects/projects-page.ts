import { expect, type Page } from '@playwright/test';

export class ProjectsPage {
  constructor(private readonly page: Page) {}

  async gotoList() {
    await this.page.goto('/projects');
    await this.expectListLoaded();
  }

  async gotoNew() {
    await this.page.goto('/projects/new');
  }

  async expectListLoaded() {
    await expect(this.page.getByRole('heading', { name: /projects/i })).toBeVisible();
  }

  async createProject(name: string, description?: string) {
    await this.gotoNew();
    await this.page.getByLabel(/project name|name/i).fill(name);
    if (description !== undefined) {
      await this.page.getByLabel('Description').fill(description);
    }
    await this.page.getByRole('button', { name: /create/i }).click();
  }

  async expectProjectVisible(name: string) {
    await expect(this.page.getByText(name)).toBeVisible();
  }

  async openProject(name: string) {
    await this.page.getByText(name).click();
  }
}