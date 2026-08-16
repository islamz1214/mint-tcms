// ─── User ───────────────────────────────────────────
export type UserRole = 'admin' | 'test_manager' | 'tester' | 'viewer';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

// ─── Organization ──────────────────────────────────
export type OrganizationMemberRole = 'admin' | 'test_manager' | 'tester' | 'viewer';
export type OrganizationInvitationStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'revoked'
  | 'expired';

export interface Organization {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
  membership: {
    id: number;
    role: OrganizationMemberRole;
    createdAt: string;
    updatedAt: string;
  };
}

export interface OrganizationMember {
  id: number;
  organizationId: number;
  userId: number;
  role: OrganizationMemberRole;
  createdAt: string;
  updatedAt: string;
  user: User;
}

export interface OrganizationInvitation {
  id: number;
  organizationId: number;
  email: string;
  role: OrganizationMemberRole;
  status: OrganizationInvitationStatus;
  invitedById: number | null;
  invitedBy: User | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Preconditions ────────────────────────────────
export interface Precondition {
  id: number;
  key: string;
  name: string;
  content: string;
  projectId: number;
  createdById: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePreconditionDto {
  name: string;
  content: string;
}

export interface UpdatePreconditionDto {
  name?: string;
  content?: string;
}

// ─── Project ────────────────────────────────────────
export interface Project {
  id: number;
  key: string | null;
  name: string;
  description: string | null;
  isActive: boolean;
  ownerId: number;
  organizationId: number;
  owner?: User;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectDto {
  name: string;
  description?: string;
  organizationId?: number;
}

export interface UpdateProjectDto {
  name?: string;
  description?: string;
}

// ─── Test Suite ─────────────────────────────────────
export interface TestSuite {
  id: number;
  name: string;
  description: string | null;
  projectId: number;
  parentId: number | null;
  parent?: TestSuite;
  children?: TestSuite[];
  project?: Project;
  testCases?: TestCase[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTestSuiteDto {
  name: string;
  description?: string;
  parentId?: number | null;
}

export interface UpdateTestSuiteDto {
  name?: string;
  description?: string;
  parentId?: number | null;
}

export interface TestCaseTree {
  suites: TestSuiteTreeNode[];
  unassignedCases: TestCase[];
}

export interface TestSuiteTreeNode extends TestSuite {
  children: TestSuiteTreeNode[];
  testCases: TestCase[];
}

// Paginated test-case list returned by GET /projects/:id/test-cases?limit=&offset=
export interface TestCaseListResponse {
  total: number;
  items: TestCase[];
}

// ─── Test Case ──────────────────────────────────────
export type TestCaseStatus = 'active' | 'draft' | 'archived';
export type TestCasePriority = 'low' | 'medium' | 'high';

export interface TestCase {
  id: number;
  key: string | null;
  title: string;
  description: string | null;
  precondition: string | null;
  preconditionId: number | null;
  preconditionRef?: Precondition | null;
  steps: string | null;
  expectedResult: string | null;
  status: TestCaseStatus;
  priority: TestCasePriority;
  projectId: number;
  project?: Project;
  testSuiteId: number | null;
  testSuite?: TestSuite;
  createdById: number | null;
  createdBy?: User;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTestCaseDto {
  title: string;
  description?: string;
  precondition?: string;
  preconditionId?: number | null;
  steps?: string;
  expectedResult?: string;
  status?: TestCaseStatus;
  priority?: TestCasePriority;
  testSuiteId?: number;
}

export interface UpdateTestCaseDto {
  title?: string;
  description?: string;
  precondition?: string;
  preconditionId?: number | null;
  steps?: string;
  expectedResult?: string;
  status?: TestCaseStatus;
  priority?: TestCasePriority;
  testSuiteId?: number | null;
}

export interface BulkAssignSuiteDto {
  testCaseIds: number[];
  testSuiteId: number | null;
}

export interface BulkAssignSuiteResponse {
  updatedCount: number;
  updatedIds: number[];
}

export interface TestCaseCsvImportResult {
  createdCount: number;
  skippedCount: number;
  createdSuiteCount?: number;
  warnings: string[];
}

export interface TestCaseRevision {
  id: number;
  testCaseId: number;
  version: number;
  title: string;
  description: string | null;
  precondition: string | null;
  preconditionId: number | null;
  steps: string | null;
  expectedResult: string | null;
  status: TestCaseStatus;
  priority: TestCasePriority;
  testSuiteId: number | null;
  changedById: number | null;
  changedBy?: User;
  createdAt: string;
}

// ─── Requirement ───────────────────────────────────
export type RequirementStatus = 'draft' | 'ready' | 'in_progress' | 'done';
export type RequirementPriority = 'low' | 'medium' | 'high';
export type RequirementCoverageStatus =
  | 'not_covered'
  | 'covered'
  | 'executed_pass'
  | 'executed_fail'
  | 'mixed';

export interface Requirement {
  id: number;
  key: string;
  title: string;
  description: string | null;
  status: RequirementStatus;
  priority: RequirementPriority;
  projectId: number;
  ownerId: number | null;
  externalSystem: string | null;
  externalId: string | null;
  externalUrl: string | null;
  testCases?: TestCase[];
  createdAt: string;
  updatedAt: string;
  linkedTestCasesCount?: number;
  coverageStatus?: RequirementCoverageStatus;
  latestExecutionAt?: string | null;
  passedCount?: number;
  failedCount?: number;
  blockedCount?: number;
  pendingCount?: number;
  skippedCount?: number;
}

export interface CreateRequirementDto {
  key?: string;
  title: string;
  description?: string;
  status?: RequirementStatus;
  priority?: RequirementPriority;
  externalSystem?: string;
  externalId?: string;
  externalUrl?: string;
}

export interface UpdateRequirementDto {
  key?: string;
  title?: string;
  description?: string;
  status?: RequirementStatus;
  priority?: RequirementPriority;
  externalSystem?: string;
  externalId?: string;
  externalUrl?: string;
}

// ─── Test Plan ─────────────────────────────────────
export type TestPlanType = 'release' | 'sprint' | 'milestone';
export type TestPlanStatus = 'draft' | 'active' | 'closed';

export interface TestPlan {
  id: number;
  name: string;
  description: string | null;
  cycleLabel: string | null;
  type: TestPlanType;
  status: TestPlanStatus;
  startDate: string | null;
  endDate: string | null;
  projectId: number;
  createdById: number | null;
  testCases?: TestCase[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTestPlanDto {
  name: string;
  description?: string;
  cycleLabel?: string;
  type: TestPlanType;
  status?: TestPlanStatus;
  startDate?: string;
  endDate?: string;
  testCaseIds: number[];
}

export interface UpdateTestPlanDto {
  name?: string;
  description?: string;
  cycleLabel?: string;
  type?: TestPlanType;
  status?: TestPlanStatus;
  startDate?: string;
  endDate?: string;
  testCaseIds?: number[];
}

// ─── Test Run ───────────────────────────────────────
export type TestRunStatus = 'pending' | 'in_progress' | 'completed';

export interface TestRun {
  id: number;
  name: string;
  description: string | null;
  status: TestRunStatus;
  projectId: number;
  project?: Project;
  createdById: number | null;
  createdBy?: User;
  results?: TestResult[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTestRunDto {
  name: string;
  description?: string;
  testCaseIds: number[];
}

export interface UpdateTestRunDto {
  name?: string;
  description?: string;
  status?: TestRunStatus;
}

// ─── File Attachment ────────────────────────────────
export interface FileAttachment {
  id: number;
  originalName: string;
  mimeType: string;
  size: number;
  storageKey: string;
  testResultId: number;
  uploadedById: number | null;
  createdAt: string;
}

// ─── Defect ───────────────────────────────────────
export type DefectStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type DefectSeverity = 'low' | 'medium' | 'high' | 'critical';
export type DefectPriority = 'low' | 'medium' | 'high' | 'critical';
export type DefectSourceType = 'internal' | 'external';

export interface Defect {
  id: number;
  title: string;
  description: string | null;
  status: DefectStatus;
  severity: DefectSeverity;
  priority: DefectPriority;
  expectedResult: string | null;
  actualResult: string | null;
  environment: string | null;
  component: string | null;
  sourceType: DefectSourceType;
  externalKey: string | null;
  externalUrl: string | null;
  projectId: number;
  createdById: number | null;
  results?: TestResult[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateDefectDto {
  title: string;
  description?: string;
  status?: DefectStatus;
  severity?: DefectSeverity;
  priority?: DefectPriority;
  expectedResult?: string;
  actualResult?: string;
  environment?: string;
  component?: string;
  sourceType?: DefectSourceType;
  externalKey?: string;
  externalUrl?: string;
}

export interface UpdateDefectDto {
  title?: string;
  description?: string;
  status?: DefectStatus;
  severity?: DefectSeverity;
  priority?: DefectPriority;
  expectedResult?: string;
  actualResult?: string;
  environment?: string;
  component?: string;
  sourceType?: DefectSourceType;
  externalKey?: string;
  externalUrl?: string;
}

// ─── Test Result ────────────────────────────────────
export type TestResultStatus = 'pending' | 'passed' | 'failed' | 'blocked' | 'skipped';

export interface TestResult {
  id: number;
  status: TestResultStatus;
  notes: string | null;
  testRunId: number;
  testRun?: TestRun;
  testCaseId: number;
  testCase?: TestCase;
  executedById: number | null;
  executedBy?: User;
  defects?: Defect[];
  attachments?: FileAttachment[];
  createdAt: string;
  updatedAt: string;
}

export interface UpdateTestResultDto {
  status: TestResultStatus;
  notes?: string;
}

// ─── Stats / Reports ────────────────────────────────
export interface RunStat {
  runId: number;
  name: string;
  status: TestRunStatus;
  createdAt: string;
  passed: number;
  failed: number;
  blocked: number;
  skipped: number;
  pending: number;
  total: number;
  passRate: number;
}

export interface ProjectStats {
  overall: {
    passed: number;
    failed: number;
    blocked: number;
    skipped: number;
    pending: number;
    total: number;
    passRate: number;
    totalRuns: number;
  };
  runs: RunStat[];
}

// Project plus its aggregated overall test stats, as returned by
// GET /projects/stats-summary (the dashboard's single-request replacement
// for the previous N+1 pattern).
export interface ProjectStatsSummaryItem extends Project {
  stats: ProjectStats['overall'];
}

export interface ProjectStatsSummaryResponse {
  projects: ProjectStatsSummaryItem[];
}

// ─── AI Planning ───────────────────────────────────
export interface SuggestedAiTestStep {
  action: string;
  expectedResult: string;
}

export interface SuggestedAiTestCase {
  title: string;
  steps: SuggestedAiTestStep[];
  expectedResult: string;
}

export interface AiTestCaseGeneration {
  title: string;
  summary: string;
  inputType: 'user_story';
  testCases: SuggestedAiTestCase[];
  notes: string[];
}

export interface AiTestCaseGenerationResponse {
  provider: string;
  model: string;
  generation: AiTestCaseGeneration;
}
