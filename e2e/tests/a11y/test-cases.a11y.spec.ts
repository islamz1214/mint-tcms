import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { AuthPage, createTestUser } from '../page-objects/auth-page';
import { Navbar } from '../page-objects/navbar';
import { ProjectDetailPage } from '../page-objects/project-detail-page';
import { ProjectsPage } from '../page-objects/projects-page';

test.describe('Test Cases accessibility', () => {
  test.beforeEach(async ({ page }) => {
    const authPage = new AuthPage(page);
    const navbar = new Navbar(page);
    const projectsPage = new ProjectsPage(page);
    const user = createTestUser('a11y-tc', 'A11y Cases', 'A11y1234!');

    await authPage.registerAndExpectDashboard(user);
    await projectsPage.createProject('A11y TC Project');
    await navbar.gotoProjects();
    await projectsPage.openProject('A11y TC Project');
  });

  test('new test case form has no a11y violations', async ({ page }) => {
    await page.getByRole('link', { name: /new test case/i }).click();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'section508'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('test case detail page has no a11y violations', async ({ page }) => {
    const projectDetailPage = new ProjectDetailPage(page);

    await projectDetailPage.createTestCase({ title: 'A11y Check Case' });
    await projectDetailPage.openTestCase('A11y Check Case');
    await expect(page.getByRole('heading', { name: 'A11y Check Case' })).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'section508'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
