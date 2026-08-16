'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ApiError, download, get, del, patch, post, upload } from '@/lib/api';
import type {
  BulkAssignSuiteDto,
  BulkAssignSuiteResponse,
  Project,
  TestCase,
  TestRun,
  TestSuite,
  TestCaseTree as TreeData,
  TestSuiteTreeNode,
  TestCaseListResponse,
  CreateTestCaseDto,
  TestCaseCsvImportResult,
} from '@/lib/types';
import TestSuiteTree from '@/components/test-case-tree';
import TestCaseList from '@/components/test-case-list';

function flattenSuites(nodes: TestSuiteTreeNode[], depth = 0): { suite: TestSuite; depth: number }[] {
  const result: { suite: TestSuite; depth: number }[] = [];
  for (const node of nodes) {
    result.push({ suite: node, depth });
    if (node.children?.length) {
      result.push(...flattenSuites(node.children, depth + 1));
    }
  }
  return result;
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [testSuites, setTestSuites] = useState<TestSuite[]>([]);
  const [tree, setTree] = useState<TreeData | null>(null);
  const [flatSuites, setFlatSuites] = useState<{ suite: TestSuite; depth: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkTitles, setBulkTitles] = useState('');
  const [bulkSuiteId, setBulkSuiteId] = useState<number | null>(null);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkError, setBulkError] = useState('');
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvSubmitting, setCsvSubmitting] = useState(false);
  const [csvExporting, setCsvExporting] = useState(false);
  const [csvError, setCsvError] = useState('');
  const [isZephyrModalOpen, setIsZephyrModalOpen] = useState(false);
  const [zephyrFile, setZephyrFile] = useState<File | null>(null);
  const [zephyrSubmitting, setZephyrSubmitting] = useState(false);
  const [zephyrError, setZephyrError] = useState('');
  const [importNotice, setImportNotice] = useState('');
  const [selectedSuiteId, setSelectedSuiteId] = useState<number | null>(null);
  const [selectedTestCaseIds, setSelectedTestCaseIds] = useState<number[]>([]);
  const [bulkAssignSuiteId, setBulkAssignSuiteId] = useState<number | null>(null);
  const [bulkAssignSubmitting, setBulkAssignSubmitting] = useState(false);
  const [bulkAssignError, setBulkAssignError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState(false);
  const [bulkDeleteSubmitting, setBulkDeleteSubmitting] = useState(false);
  const [bulkDeleteError, setBulkDeleteError] = useState('');
  const [suiteDeleteSubmitting, setSuiteDeleteSubmitting] = useState(false);

  // ── Test case list pagination (server-driven) ─────────────────────────
  // The list, its search, and its suite filter are all applied server-side so
  // a project with many cases never loads them all into the browser at once.
  const CASE_PAGE_SIZE = 200;
  const [totalCases, setTotalCases] = useState(0);
  // Number of rows actually fetched from the server so far. Unlike
  // `testCases.length` this is unaffected by optimistic removals, so "load
  // more" always resumes at the correct server offset.
  const [loadedCasesCount, setLoadedCasesCount] = useState(0);
  const [casesLoading, setCasesLoading] = useState(true);
  const [casesLoadingMore, setCasesLoadingMore] = useState(false);

  // Resolve the current suite selection to the explicit set of suite ids
  // (selected suite + all descendants) that the list endpoint should match.
  function getSuiteFilter(): { suiteIds: number[]; unassigned: boolean } {
    if (selectedSuiteId === null) return { suiteIds: [], unassigned: false };
    if (selectedSuiteId === -1) return { suiteIds: [], unassigned: true };

    const suiteIds = new Set<number>();
    function collectSuiteIds(nodes: TestSuiteTreeNode[]) {
      for (const node of nodes) {
        suiteIds.add(node.id);
        if (node.children?.length) collectSuiteIds(node.children);
      }
    }
    if (tree) {
      function findSuite(nodes: TestSuiteTreeNode[]): TestSuiteTreeNode | undefined {
        for (const node of nodes) {
          if (node.id === selectedSuiteId) return node;
          if (node.children?.length) {
            const found = findSuite(node.children);
            if (found) return found;
          }
        }
        return undefined;
      }
      const selectedNode = findSuite(tree.suites);
      if (selectedNode) collectSuiteIds([selectedNode]);
    }
    return { suiteIds: [...suiteIds], unassigned: false };
  }

  function buildCaseQuery(offset: number): string {
    const { suiteIds, unassigned } = getSuiteFilter();
    const params = new URLSearchParams({
      limit: String(CASE_PAGE_SIZE),
      offset: String(offset),
    });
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    if (unassigned) params.set('unassigned', 'true');
    else if (suiteIds.length > 0) params.set('suiteIds', suiteIds.join(','));
    return `/projects/${id}/test-cases?${params.toString()}`;
  }

  async function loadCasesAt(offset: number, mode: 'replace' | 'append') {
    const result = await get<TestCaseListResponse>(buildCaseQuery(offset));
    setTotalCases(result.total);
    if (mode === 'append') {
      setLoadedCasesCount((prev) => prev + result.items.length);
      setTestCases((prev) => [...prev, ...result.items]);
    } else {
      setLoadedCasesCount(result.items.length);
      setTestCases(result.items);
    }
    return result;
  }

  async function reloadCaseList() {
    setCasesLoading(true);
    try {
      await loadCasesAt(0, 'replace');
    } catch {
      // keep the existing list on a transient failure
    } finally {
      setCasesLoading(false);
    }
  }

  async function handleLoadMoreCases() {
    if (casesLoadingMore) return;
    setCasesLoadingMore(true);
    try {
      await loadCasesAt(loadedCasesCount, 'append');
    } catch {
      // ignore load-more failures
    } finally {
      setCasesLoadingMore(false);
    }
  }

  // Change the first page whenever the route, search text, or selected suite
  // changes. `testCases` holds the server-filtered view of the current page.
  useEffect(() => {
    reloadCaseList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, searchQuery, selectedSuiteId]);

  const visibleTestCaseIds = useMemo(() => testCases.map((testCase) => testCase.id), [testCases]);

  const selectedVisibleCount = useMemo(
    () => selectedTestCaseIds.filter((idValue) => visibleTestCaseIds.includes(idValue)).length,
    [selectedTestCaseIds, visibleTestCaseIds],
  );

  useEffect(() => {
    Promise.all([
      get<Project>(`/projects/${id}`),
      get<TestRun[]>(`/projects/${id}/test-runs`),
      get<TestSuite[]>(`/projects/${id}/test-suites`),
      get<TreeData>(`/projects/${id}/test-suites/tree`),
    ])
      .then(([p, tr, ts, treeData]) => {
        setProject(p);
        setTestRuns(tr);
        setTestSuites(ts);
        setTree(treeData);
        setFlatSuites(flattenSuites(treeData.suites));
      })
      .catch(() => router.push('/projects'))
      .finally(() => setLoading(false));
  }, [id, router]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowMoreMenu(false);
        setIsBulkModalOpen(false);
        setIsCsvModalOpen(false);
        setIsZephyrModalOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  async function handleDeleteProject() {
    if (!confirm('Delete this project? This cannot be undone.')) return;
    await del(`/projects/${id}`);
    router.push('/projects');
  }

  function handleToggleTestCase(testCaseId: number) {
    setSelectedTestCaseIds((prev) =>
      prev.includes(testCaseId)
        ? prev.filter((idValue) => idValue !== testCaseId)
        : [...prev, testCaseId],
    );
  }

  function handleToggleAllVisible() {
    setSelectedTestCaseIds((prev) => {
      const visibleSet = new Set(visibleTestCaseIds);
      const allVisibleAlreadySelected =
        visibleTestCaseIds.length > 0 && visibleTestCaseIds.every((idValue) => prev.includes(idValue));

      if (allVisibleAlreadySelected) {
        return prev.filter((idValue) => !visibleSet.has(idValue));
      }

      const merged = new Set(prev);
      for (const idValue of visibleTestCaseIds) {
        merged.add(idValue);
      }
      return [...merged];
    });
  }

  async function handleBulkAssignSuite() {
    if (selectedTestCaseIds.length === 0) {
      setBulkAssignError('Select at least one test case.');
      return;
    }

    setBulkAssignSubmitting(true);
    setBulkAssignError('');

    try {
      const payload: BulkAssignSuiteDto = {
        testCaseIds: selectedTestCaseIds,
        testSuiteId: bulkAssignSuiteId,
      };

      const result = await patch<BulkAssignSuiteResponse>(
        `/projects/${id}/test-cases/bulk/assign-suite`,
        payload,
      );

      if (result.updatedCount > 0) {
        if (selectedSuiteId === null) {
          // No suite/unassigned filter is active, so the moved cases stay
          // visible — update them in place instead of reloading the page.
          setTestCases((prev) =>
            prev.map((testCase) =>
              selectedTestCaseIds.includes(testCase.id)
                ? { ...testCase, testSuiteId: bulkAssignSuiteId }
                : testCase,
            ),
          );
        } else {
          // A suite/unassigned filter is active. Reloading keeps the filtered
          // view (and its totals) consistent with the server.
          await reloadCaseList();
        }

        const refreshedTree = await get<TreeData>(`/projects/${id}/test-suites/tree`);
        setTree(refreshedTree);
        setFlatSuites(flattenSuites(refreshedTree.suites));
      }

      setImportNotice(
        result.updatedCount === 1
          ? 'Moved 1 test case to the selected suite.'
          : `Moved ${result.updatedCount} test cases to the selected suite.`,
      );
      setSelectedTestCaseIds([]);
    } catch (err) {
      if (err instanceof ApiError) {
        const message = err.body?.message;
        setBulkAssignError(
          Array.isArray(message)
            ? message.join(', ')
            : (message as string) || 'Failed to move selected test cases.',
        );
      } else {
        setBulkAssignError('Failed to move selected test cases.');
      }
    } finally {
      setBulkAssignSubmitting(false);
    }
  }

  async function handleBulkDeleteTestCases() {
    if (selectedTestCaseIds.length === 0) {
      setBulkDeleteError('Select at least one test case.');
      return;
    }

    setBulkDeleteSubmitting(true);
    setBulkDeleteError('');

    try {
      await Promise.all(
        selectedTestCaseIds.map((testCaseId) =>
          del(`/projects/${id}/test-cases/${testCaseId}`),
        ),
      );

      setTestCases((prev) =>
        prev.filter((testCase) => !selectedTestCaseIds.includes(testCase.id)),
      );
      const removedCount = selectedTestCaseIds.length;
      setTotalCases((prev) => Math.max(prev - removedCount, 0));
      setLoadedCasesCount((prev) => Math.max(prev - removedCount, 0));

      const refreshedTree = await get<TreeData>(`/projects/${id}/test-suites/tree`);
      setTree(refreshedTree);
      setFlatSuites(flattenSuites(refreshedTree.suites));

      setImportNotice(
        selectedTestCaseIds.length === 1
          ? 'Deleted 1 test case.'
          : `Deleted ${selectedTestCaseIds.length} test cases.`,
      );
      setSelectedTestCaseIds([]);
      setIsDeleteConfirmModalOpen(false);
    } catch (err) {
      if (err instanceof ApiError) {
        const message = err.body?.message;
        setBulkDeleteError(
          Array.isArray(message)
            ? message.join(', ')
            : (message as string) || 'Failed to delete selected test cases.',
        );
      } else {
        setBulkDeleteError('Failed to delete selected test cases.');
      }
    } finally {
      setBulkDeleteSubmitting(false);
    }
  }

  async function handleDeleteSelectedSuite() {
    if (!selectedSuiteId || selectedSuiteId < 1) return;

    const selectedSuite = flatSuites.find(({ suite }) => suite.id === selectedSuiteId)?.suite;
    const suiteName = selectedSuite?.name ?? 'this suite';

    const confirmed = confirm(
      `Delete "${suiteName}"? Child suites will also be deleted. Test cases inside will be unassigned, not deleted.`,
    );
    if (!confirmed) return;

    setSuiteDeleteSubmitting(true);
    setImportNotice('');

    try {
      await del(`/projects/${id}/test-suites/${selectedSuiteId}`);

      const [refreshedSuites, refreshedTree] = await Promise.all([
        get<TestSuite[]>(`/projects/${id}/test-suites`),
        get<TreeData>(`/projects/${id}/test-suites/tree`),
      ]);
      await reloadCaseList();
      setTestSuites(refreshedSuites);
      setTree(refreshedTree);
      setFlatSuites(flattenSuites(refreshedTree.suites));
      setSelectedSuiteId(null);
      setSelectedTestCaseIds([]);
      setImportNotice(`Deleted suite "${suiteName}".`);
    } catch (err) {
      if (err instanceof ApiError) {
        const message = err.body?.message;
        setImportNotice(
          Array.isArray(message)
            ? message.join(', ')
            : (message as string) || 'Failed to delete the selected suite.',
        );
      } else {
        setImportNotice('Failed to delete the selected suite.');
      }
    } finally {
      setSuiteDeleteSubmitting(false);
    }
  }

  function openBulkCreateModal() {
    setShowMoreMenu(false);
    setBulkError('');
    setIsBulkModalOpen(true);
  }

  function openCsvImportModal() {
    setShowMoreMenu(false);
    setCsvError('');
    setImportNotice('');
    setIsCsvModalOpen(true);
  }

  function openZephyrImportModal() {
    setShowMoreMenu(false);
    setZephyrError('');
    setImportNotice('');
    setIsZephyrModalOpen(true);
  }

  function closeBulkCreateModal() {
    if (bulkSubmitting) return;
    setIsBulkModalOpen(false);
    setBulkError('');
  }

  function closeCsvImportModal() {
    if (csvSubmitting) return;
    setIsCsvModalOpen(false);
    setCsvError('');
  }

  function closeZephyrImportModal() {
    if (zephyrSubmitting) return;
    setIsZephyrModalOpen(false);
    setZephyrError('');
  }

  async function handleBulkCreateTestCases(e: React.FormEvent) {
    e.preventDefault();
    const titles = bulkTitles
      .split('\n')
      .map((value) => value.trim())
      .filter(Boolean);

    if (titles.length === 0) {
      setBulkError('Enter at least one test case title.');
      return;
    }

    if (titles.some((value) => value.length < 3)) {
      setBulkError('Each test case title must be at least 3 characters long.');
      return;
    }

    setBulkSubmitting(true);
    setBulkError('');

    try {
      const created = await Promise.all(
        titles.map((title) => {
          const body: CreateTestCaseDto = {
            title,
            status: 'draft',
            priority: 'medium',
          };

          if (bulkSuiteId) {
            body.testSuiteId = bulkSuiteId;
          }

          return post<TestCase>(`/projects/${id}/test-cases`, body);
        }),
      );

      setTestCases((prev) => [...prev, ...created]);
      setTotalCases((prev) => prev + created.length);
      setLoadedCasesCount((prev) => prev + created.length);
      const refreshedTree = await get<TreeData>(`/projects/${id}/test-suites/tree`);
      setTree(refreshedTree);
      setFlatSuites(flattenSuites(refreshedTree.suites));
      setBulkTitles('');
      setBulkSuiteId(null);
      setIsBulkModalOpen(false);
    } catch (err) {
      if (err instanceof ApiError) {
        const message = err.body?.message;
        setBulkError(
          Array.isArray(message)
            ? message.join(', ')
            : (message as string) || 'Failed to create test cases.',
        );
      } else {
        setBulkError('Failed to create test cases.');
      }
    } finally {
      setBulkSubmitting(false);
    }
  }

  async function handleCsvImport(e: React.FormEvent) {
    e.preventDefault();

    if (!csvFile) {
      setCsvError('Choose a CSV file to import.');
      return;
    }

    setCsvSubmitting(true);
    setCsvError('');
    setImportNotice('');

    try {
      const formData = new FormData();
      formData.append('file', csvFile);

      const result = await upload<TestCaseCsvImportResult>(`/projects/${id}/test-cases/import/csv`, formData);
      await reloadCaseList();
      const refreshedTree = await get<TreeData>(`/projects/${id}/test-suites/tree`);

      setTree(refreshedTree);
      setFlatSuites(flattenSuites(refreshedTree.suites));
      setCsvFile(null);
      setIsCsvModalOpen(false);

      const warningText = result.warnings.length > 0 ? ` ${result.warnings.length} warning${result.warnings.length === 1 ? '' : 's'} returned.` : '';
      setImportNotice(`Imported ${result.createdCount} test case${result.createdCount === 1 ? '' : 's'} from CSV.${warningText}`);
    } catch (err) {
      if (err instanceof ApiError) {
        const message = err.body?.message;
        setCsvError(Array.isArray(message) ? message.join(', ') : (message as string) || 'Failed to import CSV.');
      } else {
        setCsvError('Failed to import CSV.');
      }
    } finally {
      setCsvSubmitting(false);
    }
  }

  async function handleCsvExport() {
    setShowMoreMenu(false);
    setCsvError('');
    setCsvExporting(true);

    try {
      const result = await download(`/projects/${id}/test-cases/export/csv`);
      const objectUrl = URL.createObjectURL(result.blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = result.filename || `project-${id}-test-cases.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      setImportNotice('Test cases CSV export downloaded successfully.');
    } catch (err) {
      if (err instanceof ApiError) {
        const message = err.body?.message;
        setCsvError(Array.isArray(message) ? message.join(', ') : (message as string) || 'Failed to export CSV.');
      } else {
        setCsvError('Failed to export CSV.');
      }
    } finally {
      setCsvExporting(false);
    }
  }

  async function handleZephyrImport(e: React.FormEvent) {
    e.preventDefault();

    if (!zephyrFile) {
      setZephyrError('Choose a Zephyr XML file to import.');
      return;
    }

    setZephyrSubmitting(true);
    setZephyrError('');
    setImportNotice('');

    try {
      const formData = new FormData();
      formData.append('file', zephyrFile);

      const result = await upload<TestCaseCsvImportResult>(`/projects/${id}/test-cases/import/zephyr-xml`, formData);
      const [refreshedTree, refreshedSuites] = await Promise.all([
        get<TreeData>(`/projects/${id}/test-suites/tree`),
        get<TestSuite[]>(`/projects/${id}/test-suites`),
      ]);
      await reloadCaseList();

      setTree(refreshedTree);
      setFlatSuites(flattenSuites(refreshedTree.suites));
      setTestSuites(refreshedSuites);
      setZephyrFile(null);
      setIsZephyrModalOpen(false);

      const suiteText = result.createdSuiteCount && result.createdSuiteCount > 0
        ? ` Created ${result.createdSuiteCount} test suite${result.createdSuiteCount === 1 ? '' : 's'}.`
        : '';
      const warningText = result.warnings.length > 0
        ? ` ${result.warnings.length} warning${result.warnings.length === 1 ? '' : 's'} returned.`
        : '';
      setImportNotice(`Imported ${result.createdCount} test case${result.createdCount === 1 ? '' : 's'} from Zephyr XML.${suiteText}${warningText}`);
    } catch (err) {
      if (err instanceof ApiError) {
        const message = err.body?.message;
        setZephyrError(Array.isArray(message) ? message.join(', ') : (message as string) || 'Failed to import Zephyr XML.');
      } else {
        setZephyrError('Failed to import Zephyr XML.');
      }
    } finally {
      setZephyrSubmitting(false);
    }
  }

  if (loading || !project) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
        <div className="h-4 w-96 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
        <div className="mt-8 grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
          ))}
        </div>
      </div>
    );
  }

  const runStatusColors: Record<string, string> = {
    pending: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
    in_progress: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
    completed: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400',
  };

  const bulkTitleCount = bulkTitles
    .split('\n')
    .map((value) => value.trim())
    .filter(Boolean).length;

  return (
    <>
      <div className="space-y-8">
      {/* Header */}
      <div>
        <Link href="/projects" className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50">
          ← Back to projects
        </Link>
        <div className="mt-2 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              {project.name}
            </h1>
            {project.description && (
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {project.description}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Link
              href={`/projects/${id}/defects`}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Defects
            </Link>
            <Link
              href={`/projects/${id}/test-plans`}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Test Plans
            </Link>
            <Link
              href={`/projects/${id}/test-runs`}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Test Runs
            </Link>
            <Link
              href={`/projects/${id}/requirements`}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Requirements
            </Link>
            <Link
              href={`/projects/${id}/preconditions`}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Preconditions
            </Link>
            <Link
              href={`/projects/${id}/reports`}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Reports
            </Link>
            <Link
              href={`/projects/${id}/settings`}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              ⚙ Settings
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <div className="mint-card mint-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Test Cases</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">{totalCases}</p>
        </div>
        <div className="mint-card mint-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Test Suites</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">{testSuites.length}</p>
        </div>
        <div className="mint-card mint-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Test Runs</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">{testRuns.length}</p>
        </div>
        <div className="mint-card mint-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Active Cases</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {testCases.filter((tc) => tc.status === 'active').length}
          </p>
        </div>
        <div className="mint-card mint-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Completed Runs</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {testRuns.filter((tr) => tr.status === 'completed').length}
          </p>
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[18rem_minmax(0,1fr)]">
        {/* Left Panel — Test Suite Tree */}
        <div className="xl:sticky xl:top-24 xl:self-start">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Suites</h2>
            <div className="flex items-center gap-2">
              {selectedSuiteId !== null && selectedSuiteId > 0 && (
                <button
                  type="button"
                  onClick={handleDeleteSelectedSuite}
                  disabled={suiteDeleteSubmitting}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                >
                  {suiteDeleteSubmitting ? 'Deleting...' : 'Delete Suite'}
                </button>
              )}
              <Link
                href={`/projects/${id}/test-suites/new`}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                + New Suite
              </Link>
            </div>
          </div>
          <div className="mt-3 xl:max-h-[calc(100vh-12rem)] xl:overflow-y-auto">
            {tree ? (
              <TestSuiteTree
                suites={tree.suites}
                unassignedCases={tree.unassignedCases}
                projectId={id}
                selectedSuiteId={selectedSuiteId}
                onSelectSuite={setSelectedSuiteId}
              />
            ) : (
              <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center dark:border-zinc-700">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">No test suites yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Center Panel — Test Case List */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Test Cases</h2>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowMoreMenu((prev) => !prev)}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  aria-haspopup="menu"
                  aria-expanded={showMoreMenu}
                >
                  More
                </button>

                {showMoreMenu && (
                  <div className="absolute right-0 top-full z-20 mt-2 min-w-56 mint-card mint-200 bg-white p-1.5 shadow-lg shadow-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-black/30">
                    <button
                      type="button"
                      onClick={handleCsvExport}
                      disabled={csvExporting}
                      className="flex w-full items-start rounded-lg px-3 py-2 text-left transition-colors hover:bg-zinc-50 disabled:opacity-60 dark:hover:bg-zinc-800"
                    >
                      <span>
                        <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">Export test cases to CSV</span>
                        <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                          Download an import-compatible CSV with title, steps, expected result, status, priority, and suite.
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={openZephyrImportModal}
                      className="flex w-full items-start rounded-lg px-3 py-2 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    >
                      <span>
                        <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">Import from Zephyr XML</span>
                        <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                          Upload a Zephyr export XML file and create test suites, test cases, and steps.
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={openCsvImportModal}
                      className="flex w-full items-start rounded-lg px-3 py-2 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    >
                      <span>
                        <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">Import test cases from CSV</span>
                        <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                          Upload a CSV file with test case fields like title, steps, expected result, status, and priority.
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={openBulkCreateModal}
                      className="flex w-full items-start rounded-lg px-3 py-2 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    >
                      <span>
                        <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">Create test cases in bulk</span>
                        <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                          Paste one title per line and create multiple draft test cases.
                        </span>
                      </span>
                    </button>
                  </div>
                )}
              </div>
              <Link
                href={`/projects/${id}/test-cases/new`}
                className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                + New Test Case
              </Link>
            </div>
          </div>
          {importNotice && (
            <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300">
              {importNotice}
            </div>
          )}
          {csvError && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300">
              {csvError}
            </div>
          )}
          {selectedTestCaseIds.length > 0 && (
            <div className="mt-3 mint-card mint-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                  {selectedTestCaseIds.length} selected ({selectedVisibleCount} visible)
                </p>
                <select
                  value={bulkAssignSuiteId ?? ''}
                  onChange={(event) => setBulkAssignSuiteId(event.target.value ? Number(event.target.value) : null)}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  <option value="">Move to unassigned</option>
                  {flatSuites.map(({ suite, depth }) => (
                    <option key={suite.id} value={suite.id}>
                      {'\u00A0\u00A0'.repeat(depth)}{depth > 0 ? '└ ' : ''}{suite.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleBulkAssignSuite}
                  disabled={bulkAssignSubmitting}
                  className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  {bulkAssignSubmitting ? 'Moving...' : 'Move selected'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBulkDeleteError('');
                    setIsDeleteConfirmModalOpen(true);
                  }}
                  disabled={bulkDeleteSubmitting}
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-100 disabled:opacity-60 dark:border-red-900 dark:bg-red-950 dark:text-red-400 dark:hover:bg-red-900"
                >
                  {bulkDeleteSubmitting ? 'Deleting...' : 'Delete selected'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTestCaseIds([])}
                  disabled={bulkAssignSubmitting || bulkDeleteSubmitting}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Clear
                </button>
              </div>
              {bulkAssignError && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">{bulkAssignError}</p>
              )}
              {bulkDeleteError && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">{bulkDeleteError}</p>
              )}
            </div>
          )}
          <div className="mt-3 space-y-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search test cases by title or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm placeholder-zinc-400 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-600"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
            <TestCaseList
              testCases={testCases}
              projectId={id}
              selectedTestCaseIds={selectedTestCaseIds}
              onToggleTestCase={handleToggleTestCase}
              onToggleAllVisible={handleToggleAllVisible}
            />
            {casesLoading ? (
              <p className="pt-3 text-center text-sm text-zinc-500 dark:text-zinc-400">Loading cases…</p>
            ) : (
              testCases.length < totalCases && (
                <div className="pt-3 text-center">
                  <button
                    type="button"
                    onClick={handleLoadMoreCases}
                    disabled={casesLoadingMore}
                    className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    {casesLoadingMore
                      ? 'Loading more…'
                      : `Load more test cases (${testCases.length} of ${totalCases})`}
                  </button>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {showMoreMenu && (
        <button
          type="button"
          aria-label="Close more menu"
          className="fixed inset-0 z-10 cursor-default bg-transparent"
          onClick={() => setShowMoreMenu(false)}
        />
      )}

      <div
        className={`fixed inset-0 z-30 bg-zinc-950/60 transition-opacity duration-200 ${
          isBulkModalOpen || isCsvModalOpen || isZephyrModalOpen || isDeleteConfirmModalOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => {
          closeBulkCreateModal();
          closeCsvImportModal();
          closeZephyrImportModal();
          if (!bulkDeleteSubmitting) setIsDeleteConfirmModalOpen(false);
        }}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-test-case-title"
        className={`fixed left-1/2 top-1/2 z-40 w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-zinc-200 bg-white shadow-2xl shadow-zinc-900/20 transition-all duration-200 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-black/40 ${
          isBulkModalOpen ? 'opacity-100 scale-100' : 'pointer-events-none opacity-0 scale-95'
        }`}
      >
        <div className="border-b border-zinc-200 px-6 py-5 dark:border-zinc-800">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                Bulk create
              </p>
              <h3 id="bulk-test-case-title" className="mt-1 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                Create test cases in bulk
              </h3>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Paste one title per line. Each title will be created as a draft test case with medium priority.
              </p>
            </div>
            <button
              type="button"
              onClick={closeBulkCreateModal}
              disabled={bulkSubmitting}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Close
            </button>
          </div>
        </div>

        <form onSubmit={handleBulkCreateTestCases} className="space-y-5 px-6 py-5">
          <div>
            <label htmlFor="bulk-test-case-titles" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Test case titles
            </label>
            <textarea
              id="bulk-test-case-titles"
              rows={10}
              value={bulkTitles}
              onChange={(event) => setBulkTitles(event.target.value)}
              className="mt-1 block w-full mint-card zinc-300 bg-white px-4 py-3 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              placeholder={"User can submit a donation\nUser sees validation for missing donor email\nUser can view child sponsorship details"}
            />
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              {bulkTitleCount === 0
                ? 'Add one title per line.'
                : `${bulkTitleCount} test case${bulkTitleCount === 1 ? '' : 's'} ready to create.`}
            </p>
          </div>

          {flatSuites.length > 0 && (
            <div>
              <label htmlFor="bulk-suite" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Assign to test suite <span className="text-zinc-400">(optional)</span>
              </label>
              <select
                id="bulk-suite"
                value={bulkSuiteId ?? ''}
                onChange={(event) => setBulkSuiteId(event.target.value ? Number(event.target.value) : null)}
                className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              >
                <option value="">No suite</option>
                {flatSuites.map(({ suite, depth }) => (
                  <option key={suite.id} value={suite.id}>
                    {'\u00A0\u00A0'.repeat(depth)}{depth > 0 ? '└ ' : ''}{suite.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {bulkError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300">
              {bulkError}
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closeBulkCreateModal}
              disabled={bulkSubmitting}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={bulkSubmitting}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {bulkSubmitting ? 'Creating...' : bulkTitleCount > 1 ? `Create ${bulkTitleCount} test cases` : 'Create test case'}
            </button>
          </div>
        </form>
      </div>

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="zephyr-import-title"
        className={`fixed left-1/2 top-1/2 z-40 w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-zinc-200 bg-white shadow-2xl shadow-zinc-900/20 transition-all duration-200 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-black/40 ${
          isZephyrModalOpen ? 'opacity-100 scale-100' : 'pointer-events-none opacity-0 scale-95'
        }`}
      >
        <div className="border-b border-zinc-200 px-6 py-5 dark:border-zinc-800">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                Zephyr import
              </p>
              <h3 id="zephyr-import-title" className="mt-1 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                Import from Zephyr XML
              </h3>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Version 1 creates missing test suite folders from the Zephyr folder path and imports test cases with their step descriptions, expected results, and test data.
              </p>
            </div>
            <button
              type="button"
              onClick={closeZephyrImportModal}
              disabled={zephyrSubmitting}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Close
            </button>
          </div>
        </div>

        <form onSubmit={handleZephyrImport} className="space-y-5 px-6 py-5">
          <div>
            <label htmlFor="zephyr-file" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Zephyr XML file
            </label>
            <input
              id="zephyr-file"
              type="file"
              accept=".xml,text/xml,application/xml"
              onChange={(event) => setZephyrFile(event.target.files?.[0] ?? null)}
              className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 shadow-sm file:mr-3 file:rounded-md file:border-0 file:bg-zinc-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:file:bg-zinc-100 dark:file:text-zinc-900"
            />
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              Expected export shape: project folders, test cases, and step-based test scripts from Zephyr Scale.
            </p>
          </div>

          {zephyrError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300">
              {zephyrError}
            </div>
          )}

          <div className="mint-card mint-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-300">
            Status mapping: Approved → active, Draft → draft. Priority mapping: High → high, Normal → medium, Low → low.
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closeZephyrImportModal}
              disabled={zephyrSubmitting}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={zephyrSubmitting}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {zephyrSubmitting ? 'Importing...' : 'Import Zephyr XML'}
            </button>
          </div>
        </form>
      </div>

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="csv-import-title"
        className={`fixed left-1/2 top-1/2 z-40 w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-zinc-200 bg-white shadow-2xl shadow-zinc-900/20 transition-all duration-200 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-black/40 ${
          isCsvModalOpen ? 'opacity-100 scale-100' : 'pointer-events-none opacity-0 scale-95'
        }`}
      >
        <div className="border-b border-zinc-200 px-6 py-5 dark:border-zinc-800">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                CSV import
              </p>
              <h3 id="csv-import-title" className="mt-1 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                Import test cases from CSV
              </h3>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                First version supports CSV headers like <span className="font-medium">title</span>, <span className="font-medium">description</span>, <span className="font-medium">steps</span>, <span className="font-medium">expectedResult</span>, <span className="font-medium">status</span>, <span className="font-medium">priority</span>, and <span className="font-medium">suite</span>.
              </p>
            </div>
            <button
              type="button"
              onClick={closeCsvImportModal}
              disabled={csvSubmitting}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Close
            </button>
          </div>
        </div>

        <form onSubmit={handleCsvImport} className="space-y-5 px-6 py-5">
          <div>
            <label htmlFor="csv-file" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              CSV file
            </label>
            <input
              id="csv-file"
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => setCsvFile(event.target.files?.[0] ?? null)}
              className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 shadow-sm file:mr-3 file:rounded-md file:border-0 file:bg-zinc-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:file:bg-zinc-100 dark:file:text-zinc-900"
            />
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              Required: <span className="font-medium">title</span>. Optional: description, steps, expectedResult, status, priority, suite.
            </p>
          </div>

          {csvError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300">
              {csvError}
            </div>
          )}

          <div className="mint-card mint-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-300">
            Example headers: <span className="font-medium">title,description,steps,expectedResult,status,priority,suite</span>
          </div>

          <div className="flex items-center justify-between mint-card mint-200 bg-white px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-900/70">
            <div>
              <p className="font-medium text-zinc-900 dark:text-zinc-100">Need a starting point?</p>
              <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                Download a sample CSV template with supported columns and example rows.
              </p>
            </div>
            <a
              href="/test-case-import-template.csv"
              download
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Download template
            </a>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closeCsvImportModal}
              disabled={csvSubmitting}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={csvSubmitting}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {csvSubmitting ? 'Importing...' : 'Import CSV'}
            </button>
          </div>
        </form>
      </div>

      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-confirm-title"
        className={`fixed left-1/2 top-1/2 z-40 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-zinc-200 bg-white shadow-2xl shadow-zinc-900/20 transition-all duration-200 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-black/40 ${
          isDeleteConfirmModalOpen ? 'opacity-100 scale-100' : 'pointer-events-none opacity-0 scale-95'
        }`}
      >
        <div className="px-6 py-5">
          <h2 id="delete-confirm-title" className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Delete {selectedTestCaseIds.length} test case{selectedTestCaseIds.length !== 1 ? 's' : ''}?
          </h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            This action cannot be undone. {selectedTestCaseIds.length === 1 ? 'This test case will be permanently deleted.' : 'These test cases will be permanently deleted.'}
          </p>

          {bulkDeleteError && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300">
              {bulkDeleteError}
            </div>
          )}

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setIsDeleteConfirmModalOpen(false)}
              disabled={bulkDeleteSubmitting}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleBulkDeleteTestCases}
              disabled={bulkDeleteSubmitting}
              className="rounded-lg border border-red-200 bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60 dark:border-red-900 dark:hover:bg-red-700"
            >
              {bulkDeleteSubmitting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
