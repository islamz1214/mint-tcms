import { expect, type Page } from '@playwright/test';

type TestCaseInput = {
  title: string;
  description?: string;
  steps?: string;
  expectedResult?: string;
  priority?: 'low' | 'medium' | 'high';
  status?: 'draft' | 'active' | 'archived';
  suiteLabel?: string;
};

type TestSuiteInput = {
  name: string;
  description?: string;
};

type TestRunInput = {
  name: string;
  description?: string;
};

export class ProjectDetailPage {
  constructor(private readonly page: Page) {}

  private async navigateByLinkName(pattern: RegExp | string) {
    const link = this.page.getByRole('link', { name: pattern });
    const href = await link.getAttribute('href');
    if (!href) {
      throw new Error(`Missing href for link ${String(pattern)}`);
    }
    await this.page.goto(href);
  }

  async expectLoaded(name: string) {
    await expect(this.page.getByRole('heading', { name })).toBeVisible();
  }

  async openEditProject() {
    await this.page.getByRole('link', { name: 'Edit' }).click();
    await this.page.waitForURL(/\/projects\/\d+\/edit$/);
  }

  async saveProjectEdits(name: string, description?: string) {
    await this.page.getByLabel('Project Name').fill(name);
    if (description !== undefined) {
      await this.page.getByLabel('Description').fill(description);
    }
    await this.page.getByRole('button', { name: /save changes/i }).click();
  }

  async deleteProject() {
    this.page.once('dialog', (dialog) => dialog.accept());
    await this.page.getByRole('button', { name: /delete/i }).click();
    await this.page.waitForURL('/projects');
  }

  async createTestCase(input: TestCaseInput) {
    await this.navigateByLinkName(/new test case/i);
    await this.page.getByLabel('Title').fill(input.title);
    if (input.description !== undefined) {
      await this.page.getByLabel('Description').fill(input.description);
    }
    if (input.steps !== undefined) {
      await this.page.getByLabel('Steps').fill(input.steps);
    }
    if (input.expectedResult !== undefined) {
      await this.page.getByLabel('Expected Result').fill(input.expectedResult);
    }
    if (input.priority !== undefined) {
      await this.page.getByLabel('Priority').selectOption(input.priority);
    }
    if (input.status !== undefined) {
      await this.page.getByLabel('Status').selectOption(input.status);
    }
    if (input.suiteLabel !== undefined) {
      await this.page.getByLabel('Test Suite').selectOption({ label: input.suiteLabel });
    }
    await this.page.getByRole('button', { name: /create test case/i }).click({ force: true });
  }

  async openTestCase(title: string) {
    await this.page.getByText(title).click();
  }

  async editCurrentTestCase(input: Partial<TestCaseInput>) {
    await this.page.getByRole('button', { name: /edit/i }).click();
    if (input.title !== undefined) {
      await this.page.getByLabel('Title').fill(input.title);
    }
    if (input.status !== undefined) {
      await this.page.getByLabel('Status').selectOption(input.status);
    }
    if (input.priority !== undefined) {
      await this.page.getByLabel('Priority').selectOption(input.priority);
    }
    await this.page.getByRole('button', { name: /save/i }).click();
  }

  async deleteCurrentTestCase() {
    this.page.once('dialog', (dialog) => dialog.accept());
    await this.page.getByRole('button', { name: /delete/i }).click();
    await this.page.waitForURL(/\/projects\/\d+$/);
  }

  async createTestSuite(input: TestSuiteInput) {
    await this.navigateByLinkName(/new suite/i);
    await this.page.getByLabel('Name').fill(input.name);
    if (input.description !== undefined) {
      await this.page.getByLabel('Description').fill(input.description);
    }
    await this.page.getByRole('button', { name: /create test suite/i }).click();
    await this.page.waitForURL(/\/projects\/\d+\/test-suites\/\d+$/);
  }

  async openSuite(name: string) {
    await this.page.getByText(name).click();
  }

  async editCurrentSuite(name: string) {
    await this.page.getByRole('button', { name: /edit/i }).click();
    await this.page.getByLabel('Name').fill(name);
    await this.page.getByRole('button', { name: /save/i }).click();
  }

  async deleteCurrentSuite() {
    this.page.once('dialog', (dialog) => dialog.accept());
    await this.page.getByRole('button', { name: /delete/i }).click();
    await this.page.waitForURL(/\/projects\/\d+$/);
  }

  async addTestCaseFromCurrentSuite(input: TestCaseInput) {
    await this.navigateByLinkName(/add test case/i);
    await this.page.getByLabel('Title').fill(input.title);
    if (input.description !== undefined) {
      await this.page.getByLabel('Description').fill(input.description);
    }
    if (input.steps !== undefined) {
      await this.page.getByLabel('Steps').fill(input.steps);
    }
    if (input.expectedResult !== undefined) {
      await this.page.getByLabel('Expected Result').fill(input.expectedResult);
    }
    await this.page.getByRole('button', { name: /create test case/i }).click({ force: true });
  }

  async goBackToProject() {
    const backToProjectLink = this.page.getByRole('link', { name: /back to project/i });
    if (await backToProjectLink.count()) {
      const href = await backToProjectLink.getAttribute('href');
      if (!href) {
        throw new Error('Missing href for back to project link');
      }
      await this.page.goto(href);
    } else {
      const projectBreadcrumbLink = this.page.getByRole('link', { name: 'Project', exact: true });
      const href = await projectBreadcrumbLink.getAttribute('href');
      if (!href) {
        throw new Error('Missing href for project breadcrumb link');
      }
      await this.page.goto(href);
    }
    await this.page.waitForURL(/\/projects\/\d+$/);
  }

  async createTestRun(input: TestRunInput) {
    await this.navigateByLinkName(/new test run/i);
    await this.page.getByLabel('Name').fill(input.name);
    if (input.description !== undefined) {
      await this.page.getByLabel('Description').fill(input.description);
    }

    const submitButton = this.page.getByRole('button', { name: /create test run/i });
    if (await submitButton.isDisabled()) {
      await this.page.getByRole('button', { name: /select all/i }).click();
    }

    await expect(submitButton).toBeEnabled();
    await submitButton.click();
  }

  async updateFirstResult(status: 'pass' | 'fail' | 'skip' | 'reset') {
    await this.updateResultAt(0, status);
  }

  async updateResultAt(index: number, status: 'pass' | 'fail' | 'skip' | 'reset') {
    const patterns = {
      pass: /pass/i,
      fail: /fail/i,
      skip: /skip/i,
      reset: /reset/i,
    };
    await this.page.getByRole('button', { name: patterns[status] }).nth(index).click();
  }

  async openReports() {
    await this.navigateByLinkName(/^Reports$/);
    await this.page.waitForURL(/\/projects\/\d+\/reports$/);
  }
}