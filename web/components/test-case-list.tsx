'use client';

import Link from 'next/link';
import type { TestCase } from '@/lib/types';

/* ─── colour maps ────────────────────────────────── */
const statusColors: Record<string, string> = {
  active: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400',
  draft: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400',
  archived: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
};

const priorityColors: Record<string, string> = {
  high: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400',
  medium: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400',
  low: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
};

/* ─── Test case list table ───────────────────────── */
interface TestCaseListProps {
  testCases: TestCase[];
  projectId: string;
  selectedTestCaseIds: number[];
  onToggleTestCase: (testCaseId: number) => void;
  onToggleAllVisible: () => void;
}

export default function TestCaseList({
  testCases,
  projectId,
  selectedTestCaseIds,
  onToggleTestCase,
  onToggleAllVisible,
}: TestCaseListProps) {
  const selectedSet = new Set(selectedTestCaseIds);
  const allVisibleSelected = testCases.length > 0 && testCases.every((tc) => selectedSet.has(tc.id));

  if (testCases.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center dark:border-zinc-700">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No test cases found in this folder.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 dark:bg-zinc-900">
          <tr>
            <th className="w-12 px-4 py-2.5 text-left">
              <input
                type="checkbox"
                aria-label="Select all visible test cases"
                checked={allVisibleSelected}
                onChange={onToggleAllVisible}
                className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </th>
            <th className="px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Key</th>
            <th className="px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Title</th>
            <th className="px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Status</th>
            <th className="px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Priority</th>
            <th className="px-4 py-2.5 text-right font-medium text-zinc-500 dark:text-zinc-400">Created</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
          {testCases.map((tc) => (
            <tr key={tc.id} className="transition-colors hover:bg-mint-50 dark:hover:bg-zinc-900">
              <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                <input
                  type="checkbox"
                  aria-label={`Select ${tc.title}`}
                  checked={selectedSet.has(tc.id)}
                  onChange={() => onToggleTestCase(tc.id)}
                  className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
                />
              </td>
              <td className="px-4 py-3 font-mono text-xs uppercase tracking-wide text-zinc-600 dark:text-zinc-300">
                {tc.key ?? '—'}
              </td>
              <td className="px-4 py-3">
                <Link
                  href={`/projects/${projectId}/test-cases/${tc.id}`}
                  className="font-medium text-zinc-900 hover:underline dark:text-zinc-50"
                >
                  {tc.title}
                </Link>
              </td>
              <td className="px-4 py-3">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[tc.status]}`}>
                  {tc.status}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${priorityColors[tc.priority]}`}>
                  {tc.priority}
                </span>
              </td>
              <td className="px-4 py-3 text-right text-zinc-500 dark:text-zinc-400">
                {new Date(tc.createdAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
