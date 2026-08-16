import { test, expect } from '@playwright/test';
import { createTestUser } from '../page-objects/auth-page';
import { authenticateViaApi } from '../helpers/auth';
import { Navbar } from '../page-objects/navbar';
import { ProjectDetailPage } from '../page-objects/project-detail-page';
import { ProjectsPage } from '../page-objects/projects-page';

test.describe('Test Cases CRUD', () => {
  test.beforeEach(async ({ page }) => {
    const navbar = new Navbar(page);
    const projectsPage = new ProjectsPage(page);
    const user = createTestUser('tc', 'TC Tester', 'TC1234!!');

    await authenticateViaApi(page, user);
    await projectsPage.createProject('TC Test Project');
    await navbar.gotoProjects();
    await projectsPage.openProject('TC Test Project');
  });

  test('can create a test case', async ({ page }) => {
    const projectDetailPage = new ProjectDetailPage(page);

    await projectDetailPage.createTestCase({
      title: 'Login with valid creds',
      description: 'Verify login works',
      steps: '1. Go to login\n2. Enter creds\n3. Click sign in',
      expectedResult: 'User lands on dashboard',
      priority: 'high',
    });

    await expect(page.getByText('Login with valid creds')).toBeVisible();
  });

  test('test case appears in project detail table', async ({ page }) => {
    const projectDetailPage = new ProjectDetailPage(page);

    await projectDetailPage.createTestCase({ title: 'Appears In Table' });

    await expect(page.getByText('Appears In Table')).toBeVisible();
    await expect(page.getByText('draft')).toBeVisible();
    await expect(page.getByText('medium')).toBeVisible();
  });

  test('can view and edit a test case', async ({ page }) => {
    const projectDetailPage = new ProjectDetailPage(page);

    await projectDetailPage.createTestCase({ title: 'Edit Me Case' });
    await projectDetailPage.openTestCase('Edit Me Case');
    await expect(page.getByRole('heading', { name: 'Edit Me Case' })).toBeVisible();

    await projectDetailPage.editCurrentTestCase({ title: 'Edited Case Title', status: 'active' });

    await expect(page.getByRole('heading', { name: 'Edited Case Title' })).toBeVisible();
    await expect(page.getByText('active')).toBeVisible();
  });

  test('can delete a test case', async ({ page }) => {
    const projectDetailPage = new ProjectDetailPage(page);

    await projectDetailPage.createTestCase({ title: 'Delete Me Case' });
    await projectDetailPage.openTestCase('Delete Me Case');
    await projectDetailPage.deleteCurrentTestCase();

    await expect(page.getByText('Delete Me Case')).not.toBeVisible();
  });

  test('can create a test case with suite assignment', async ({ page }) => {
    const projectDetailPage = new ProjectDetailPage(page);

    await projectDetailPage.createTestSuite({ name: 'Auth Suite' });
    await projectDetailPage.goBackToProject();
    await projectDetailPage.createTestCase({ title: 'Case In Suite', suiteLabel: 'Auth Suite' });

    await expect(page.getByText('Case In Suite')).toBeVisible();
  });
});
