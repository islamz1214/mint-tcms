import { test, expect } from '@playwright/test';
import { createTestUser } from '../page-objects/auth-page';
import { authenticateViaApi } from '../helpers/auth';
import { Navbar } from '../page-objects/navbar';
import { ProjectDetailPage } from '../page-objects/project-detail-page';
import { ProjectsPage } from '../page-objects/projects-page';

test.describe('Test Runs', () => {
  test.beforeEach(async ({ page }) => {
    const navbar = new Navbar(page);
    const projectsPage = new ProjectsPage(page);
    const projectDetailPage = new ProjectDetailPage(page);
    const user = createTestUser('run', 'Run Tester', 'Run1234!!');

    await authenticateViaApi(page, user);
    await projectsPage.createProject('Run Test Project');
    await navbar.gotoProjects();
    await projectsPage.openProject('Run Test Project');
    await projectDetailPage.createTestCase({ title: 'Run Case 1' });
    await projectDetailPage.createTestCase({ title: 'Run Case 2' });
  });

  test('can create a test run with selected cases', async ({ page }) => {
    const projectDetailPage = new ProjectDetailPage(page);

    await projectDetailPage.createTestRun({
      name: 'Sprint 1 Run',
      description: 'First sprint regression',
    });

    await expect(page.getByText('Sprint 1 Run')).toBeVisible();
  });

  test('can view test run with results', async ({ page }) => {
    const projectDetailPage = new ProjectDetailPage(page);

    await projectDetailPage.createTestRun({ name: 'View Run' });

    await expect(page.getByText('Run Case 1')).toBeVisible();
    await expect(page.getByText('Run Case 2')).toBeVisible();
    await expect(page.getByText('pending').first()).toBeVisible();
  });

  test('can update test result status', async ({ page }) => {
    const projectDetailPage = new ProjectDetailPage(page);

    await projectDetailPage.createTestRun({ name: 'Execute Run' });
    await projectDetailPage.updateFirstResult('pass');

    await expect(page.getByText(/passed/i).first()).toBeVisible();
  });
});
