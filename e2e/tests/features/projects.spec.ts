import { test, expect } from '@playwright/test';
import { createTestUser } from '../page-objects/auth-page';
import { authenticateViaApi } from '../helpers/auth';
import { Navbar } from '../page-objects/navbar';
import { ProjectDetailPage } from '../page-objects/project-detail-page';
import { ProjectsPage } from '../page-objects/projects-page';

test.describe('Projects CRUD', () => {
  test.beforeEach(async ({ page }) => {
    const user = createTestUser('proj', 'Project Tester', 'Proj1234!');
    await authenticateViaApi(page, user);
  });

  test('can create a new project', async ({ page }) => {
    const navbar = new Navbar(page);
    const projectsPage = new ProjectsPage(page);

    await navbar.gotoProjects();
    await projectsPage.createProject('E2E Test Project', 'Created by Playwright');

    await projectsPage.expectProjectVisible('E2E Test Project');
  });

  test('new project appears on projects list', async ({ page }) => {
    const navbar = new Navbar(page);
    const projectsPage = new ProjectsPage(page);

    await projectsPage.createProject('List Check Project', 'Should appear in list');
    await navbar.gotoProjects();

    await projectsPage.expectProjectVisible('List Check Project');
  });

  test('can view project details', async ({ page }) => {
    const navbar = new Navbar(page);
    const projectsPage = new ProjectsPage(page);
    const projectDetailPage = new ProjectDetailPage(page);

    await projectsPage.createProject('Detail View Project');
    await navbar.gotoProjects();
    await projectsPage.openProject('Detail View Project');

    await projectDetailPage.expectLoaded('Detail View Project');
    await expect(page.getByText('Test Cases', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Test Runs' })).toBeVisible();
    await expect(page.getByRole('link', { name: /new suite/i })).toBeVisible();
  });

  test('can edit a project', async ({ page }) => {
    const projectsPage = new ProjectsPage(page);
    const projectDetailPage = new ProjectDetailPage(page);

    await projectsPage.createProject('Editable Project', 'Original description');
    await projectDetailPage.openEditProject();
    await projectDetailPage.saveProjectEdits('Edited Project Name', 'Updated project description');

    await expect(page.getByRole('heading', { name: 'Edited Project Name' })).toBeVisible();
    await expect(page.getByText('Updated project description')).toBeVisible();
  });

  test('can delete a project', async ({ page }) => {
    const navbar = new Navbar(page);
    const projectDetailPage = new ProjectDetailPage(page);
    const projectsPage = new ProjectsPage(page);

    await projectsPage.createProject('Delete Me Project');
    await navbar.gotoProjects();
    await projectsPage.openProject('Delete Me Project');
    await projectDetailPage.deleteProject();

    await expect(page.getByText('Delete Me Project')).not.toBeVisible();
  });
});
