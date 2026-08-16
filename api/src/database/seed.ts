import 'reflect-metadata';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { User, UserRole } from '../users/entities/user.entity';
import { Project } from '../projects/entities/project.entity';
import { TestSuite } from '../test-suites/entities/test-suite.entity';
import { TestCase, TestCasePriority, TestCaseStatus } from '../test-cases/entities/test-case.entity';
import { TestRun, TestRunStatus } from '../test-runs/entities/test-run.entity';
import { TestResult, TestResultStatus } from '../test-results/entities/test-result.entity';
import { Defect } from '../defects/entities/defect.entity';
import { FileAttachment } from '../attachments/entities/file-attachment.entity';
import { Organization } from '../organizations/entities/organization.entity';
import {
  OrganizationMember,
  OrganizationMemberRole,
} from '../organizations/entities/organization-member.entity';
import { OrganizationInvitation } from '../organizations/entities/organization-invitation.entity';
import { Precondition } from '../preconditions/entities/precondition.entity';

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_NAME ?? 'mint',
  synchronize: true,
  entities: [
    User,
    Organization,
    OrganizationMember,
    OrganizationInvitation,
    Precondition,
    Project,
    TestSuite,
    TestCase,
    TestRun,
    TestResult,
    Defect,
    FileAttachment,
  ],
});

async function seed() {
  await AppDataSource.initialize();
  console.log('Connected to database');

  const userRepo = AppDataSource.getRepository(User);
  const projectRepo = AppDataSource.getRepository(Project);
  const organizationRepo = AppDataSource.getRepository(Organization);
  const organizationMemberRepo = AppDataSource.getRepository(OrganizationMember);
  const suiteRepo = AppDataSource.getRepository(TestSuite);
  const caseRepo = AppDataSource.getRepository(TestCase);
  const runRepo = AppDataSource.getRepository(TestRun);
  const resultRepo = AppDataSource.getRepository(TestResult);

  // -- User --
  const email = 'admin@example.com';
  let user = await userRepo.findOneBy({ email });
  if (!user) {
    user = await userRepo.save(
      userRepo.create({
        email,
        name: 'Admin',
        password: await bcrypt.hash('password123', 10),
        role: UserRole.ADMIN,
      }),
    );
    console.log(`Created user: ${email}`);
  } else {
    if (user.role !== UserRole.ADMIN) {
      user.role = UserRole.ADMIN;
      user = await userRepo.save(user);
    }
    console.log(`User already exists: ${email}`);
  }

  // -- Personal organization --
  let membership = await organizationMemberRepo.findOne({
    where: { userId: user.id },
    relations: { organization: true },
  });
  let organizationId = membership?.organizationId;
  if (!organizationId) {
    const organization = await organizationRepo.save(
      organizationRepo.create({ name: `${user.name}'s Organization` }),
    );
    membership = await organizationMemberRepo.save(
      organizationMemberRepo.create({
        userId: user.id,
        organizationId: organization.id,
        role: OrganizationMemberRole.ADMIN,
      }),
    );
    organizationId = membership.organizationId;
  }

  // -- Project --
  let project = await projectRepo.findOneBy({ organizationId });
  if (!project) {
    project = await projectRepo.save(
      projectRepo.create({
        name: 'Demo Project',
        description: 'Sample project created by seed script',
        ownerId: user.id,
        organizationId,
      }),
    );
    console.log(`Created project: ${project.name}`);
  } else {
    console.log(`Project already exists for user, skipping`);
    await AppDataSource.destroy();
    return;
  }

  // -- Test Suites --
  const authSuite = await suiteRepo.save(
    suiteRepo.create({ name: 'Authentication', project }),
  );
  const dashboardSuite = await suiteRepo.save(
    suiteRepo.create({ name: 'Dashboard', project }),
  );
  console.log('Created test suites: Authentication, Dashboard');

  // -- Test Cases --
  const testCases = await caseRepo.save([
    caseRepo.create({
      title: 'User can register with valid credentials',
      steps: '1. Navigate to /register\n2. Fill in name, email, password\n3. Submit',
      expectedResult: 'User is redirected to dashboard',
      status: TestCaseStatus.ACTIVE,
      priority: TestCasePriority.HIGH,
      project,
      testSuite: authSuite,
      createdById: user.id,
    }),
    caseRepo.create({
      title: 'User can log in with valid credentials',
      steps: '1. Navigate to /login\n2. Enter email and password\n3. Submit',
      expectedResult: 'User is redirected to dashboard',
      status: TestCaseStatus.ACTIVE,
      priority: TestCasePriority.HIGH,
      project,
      testSuite: authSuite,
      createdById: user.id,
    }),
    caseRepo.create({
      title: 'Login fails with wrong password',
      steps: '1. Navigate to /login\n2. Enter valid email with wrong password\n3. Submit',
      expectedResult: 'Error message is displayed',
      status: TestCaseStatus.ACTIVE,
      priority: TestCasePriority.MEDIUM,
      project,
      testSuite: authSuite,
      createdById: user.id,
    }),
    caseRepo.create({
      title: 'Dashboard shows project overview',
      steps: '1. Log in\n2. Navigate to /dashboard',
      expectedResult: 'Dashboard shows list of projects and stats',
      status: TestCaseStatus.ACTIVE,
      priority: TestCasePriority.MEDIUM,
      project,
      testSuite: dashboardSuite,
      createdById: user.id,
    }),
    caseRepo.create({
      title: 'User can create a new project',
      steps: '1. Click "New Project"\n2. Fill in name and description\n3. Submit',
      expectedResult: 'New project appears in project list',
      status: TestCaseStatus.ACTIVE,
      priority: TestCasePriority.HIGH,
      project,
      testSuite: dashboardSuite,
      createdById: user.id,
    }),
  ]);
  console.log(`Created ${testCases.length} test cases`);

  // -- Test Run --
  const run = await runRepo.save(
    runRepo.create({
      name: 'Sprint 1 Regression',
      description: 'Initial regression run for sprint 1',
      status: TestRunStatus.COMPLETED,
      project,
      createdById: user.id,
    }),
  );
  console.log(`Created test run: ${run.name}`);

  // -- Test Results --
  const resultStatuses = [
    TestResultStatus.PASSED,
    TestResultStatus.PASSED,
    TestResultStatus.FAILED,
    TestResultStatus.PASSED,
    TestResultStatus.SKIPPED,
  ];
  await resultRepo.save(
    testCases.map((tc, i) =>
      resultRepo.create({
        testRun: run,
        testCase: tc,
        status: resultStatuses[i],
        executedById: user.id,
        notes: resultStatuses[i] === TestResultStatus.FAILED ? 'Invalid error message shown' : '',
      }),
    ),
  );
  console.log('Created test results');

  await AppDataSource.destroy();
  console.log('\nSeed complete!');
  console.log('  Login: admin@example.com');
  console.log('  Password: password123');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
