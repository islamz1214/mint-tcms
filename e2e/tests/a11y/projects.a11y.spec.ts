import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { AuthPage, createTestUser } from '../page-objects/auth-page';
import { Navbar } from '../page-objects/navbar';
import { ProjectsPage } from '../page-objects/projects-page';

test.describe('Projects accessibility', () => {
  test.beforeEach(async ({ page }) => {
    const authPage = new AuthPage(page);
    const user = createTestUser('a11y-proj', 'A11y Projects', 'A11y1234!');

    await authPage.registerAndExpectDashboard(user);
  });

  test('projects list page has no a11y violations', async ({ page }) => {
    await new ProjectsPage(page).gotoList();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'section508'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('new project page has no a11y violations', async ({ page }) => {
    await new ProjectsPage(page).gotoNew();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'section508'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('project detail page has no a11y violations', async ({ page }) => {
    const navbar = new Navbar(page);
    const projectsPage = new ProjectsPage(page);

    await projectsPage.createProject('A11y Detail Project');
    await navbar.gotoProjects();
    await projectsPage.openProject('A11y Detail Project');
    await expect(page.getByRole('heading', { name: 'A11y Detail Project' })).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'section508'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
