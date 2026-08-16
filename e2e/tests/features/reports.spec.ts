import { test, expect } from '@playwright/test';
import { createTestUser } from '../page-objects/auth-page';
import { authenticateViaApi } from '../helpers/auth';
import { ProjectDetailPage } from '../page-objects/project-detail-page';
import { ProjectsPage } from '../page-objects/projects-page';

test.describe('Project Reports', () => {
  test.beforeEach(async ({ page }) => {
    const user = createTestUser('reports', 'Reports Tester', 'Reports123!');
    await authenticateViaApi(page, user);
  });

  test('shows an empty reports state before any runs are executed', async ({ page }) => {
    const projectDetailPage = new ProjectDetailPage(page);
    const projectsPage = new ProjectsPage(page);

    await projectsPage.createProject('Empty Reports Project');
    await projectDetailPage.openReports();

    await expect(page.getByText(/no test results yet/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /go to project/i })).toBeVisible();
  });

  test('shows aggregated metrics after executing a test run', async ({ page }) => {
    const projectDetailPage = new ProjectDetailPage(page);
    const projectsPage = new ProjectsPage(page);

    await projectsPage.createProject('Reports Data Project');
    await projectDetailPage.createTestCase({ title: 'Reports Case 1' });
    await projectDetailPage.createTestCase({ title: 'Reports Case 2' });
    await projectDetailPage.createTestRun({ name: 'Reports Run' });
    await projectDetailPage.updateResultAt(0, 'pass');
    await projectDetailPage.updateResultAt(1, 'fail');
    await projectDetailPage.goBackToProject();
    await projectDetailPage.openReports();

    await expect(page.getByRole('heading', { name: /reports/i })).toBeVisible();
    await expect(page.getByText('50%').first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Reports Run' })).toBeVisible();
    await expect(page.getByText('Passed (1)')).toBeVisible();
    await expect(page.getByText('Failed (1)')).toBeVisible();
  });
});