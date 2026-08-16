import { test, expect } from '@playwright/test';
import { createTestUser } from '../page-objects/auth-page';
import { authenticateViaApi } from '../helpers/auth';
import { Navbar } from '../page-objects/navbar';
import { ProjectDetailPage } from '../page-objects/project-detail-page';
import { ProjectsPage } from '../page-objects/projects-page';

test.describe('Test Suites CRUD', () => {
  test.beforeEach(async ({ page }) => {
    const navbar = new Navbar(page);
    const projectsPage = new ProjectsPage(page);
    const user = createTestUser('suite', 'Suite Tester', 'Suite1234!');

    await authenticateViaApi(page, user);
    await projectsPage.createProject('Suite Test Project');
    await navbar.gotoProjects();
    await projectsPage.openProject('Suite Test Project');
  });

  test('can create a test suite', async ({ page }) => {
    const projectDetailPage = new ProjectDetailPage(page);

    await projectDetailPage.createTestSuite({
      name: 'Regression Suite',
      description: 'All regression tests',
    });

    await expect(page.getByRole('heading', { name: 'Regression Suite' })).toBeVisible();
    await expect(page.getByText('All regression tests')).toBeVisible();
  });

  test('suite appears on project detail page', async ({ page }) => {
    const projectDetailPage = new ProjectDetailPage(page);

    await projectDetailPage.createTestSuite({ name: 'Visible Suite' });
    await projectDetailPage.goBackToProject();

    await expect(page.getByText('Visible Suite')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Visible Suite' })).toBeVisible();
  });

  test('can edit a test suite', async ({ page }) => {
    const projectDetailPage = new ProjectDetailPage(page);

    await projectDetailPage.createTestSuite({ name: 'Old Name' });
    await projectDetailPage.editCurrentSuite('Updated Name');

    await expect(page.getByRole('heading', { name: 'Updated Name' })).toBeVisible();
  });

  test('can delete a test suite', async ({ page }) => {
    const projectDetailPage = new ProjectDetailPage(page);

    await projectDetailPage.createTestSuite({ name: 'Deletable Suite' });
    await projectDetailPage.deleteCurrentSuite();

    await expect(page.getByRole('heading', { name: 'Deletable Suite' })).not.toBeVisible();
  });

  test('suite shows its test cases', async ({ page }) => {
    const navbar = new Navbar(page);
    const projectDetailPage = new ProjectDetailPage(page);
    const projectsPage = new ProjectsPage(page);

    await projectDetailPage.createTestSuite({ name: 'Cases Suite' });
    await projectDetailPage.addTestCaseFromCurrentSuite({ title: 'Suite Case 1' });
    await navbar.gotoProjects();
    await projectsPage.openProject('Suite Test Project');
    await projectDetailPage.openSuite('Cases Suite');

    await expect(page.getByText('Suite Case 1')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Cases Suite' })).toBeVisible();
  });
});
