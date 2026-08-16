'use client';

import { useEffect, useState } from 'react';
import type { TestSuiteTreeNode, TestCase } from '@/lib/types';

/* ─── Icons ──────────────────────────────────────── */
function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform ${open ? 'rotate-90' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function FolderIcon({ open, selected }: { open: boolean; selected?: boolean }) {
  const colorClass = selected ? 'text-zinc-900 dark:text-zinc-50' : 'text-amber-500';
  if (open) {
    return (
      <svg className={`h-4 w-4 shrink-0 ${colorClass}`} fill="currentColor" viewBox="0 0 20 20">
        <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v1H2V6z" />
        <path fillRule="evenodd" d="M2 9h16l-1.5 6.5A2 2 0 0114.56 17H5.44a2 2 0 01-1.94-1.5L2 9z" clipRule="evenodd" />
      </svg>
    );
  }
  return (
    <svg className={`h-4 w-4 shrink-0 ${colorClass}`} fill="currentColor" viewBox="0 0 20 20">
      <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
    </svg>
  );
}

/* ─── Suite node (recursive) ─────────────────────── */
function SuiteNode({
  suite,
  depth = 0,
  selectedSuiteId,
  onSelect,
  expandAllState,
}: {
  suite: TestSuiteTreeNode;
  depth?: number;
  selectedSuiteId: number | null;
  onSelect: (suiteId: number | null) => void;
  expandAllState: boolean | null;
}) {
  const [open, setOpen] = useState(false);
  const totalCases = countCases(suite);
  const isSelected = selectedSuiteId === suite.id;
  const hasChildren = (suite.children?.length ?? 0) > 0;

  useEffect(() => {
    if (expandAllState !== null) {
      setOpen(expandAllState);
    }
  }, [expandAllState]);

  return (
    <div>
      <div
        className={`group flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
          isSelected ? 'bg-zinc-100 dark:bg-zinc-800' : ''
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => onSelect(suite.id)}
      >
        <button
          onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
          className="flex items-center gap-1 p-0"
          aria-label={open ? 'Collapse' : 'Expand'}
        >
          <ChevronIcon open={open} />
        </button>
        <FolderIcon open={open} selected={isSelected} />
        <span
          className={`flex-1 truncate text-sm font-medium ${
            isSelected ? 'text-zinc-900 dark:text-zinc-50' : 'text-zinc-700 dark:text-zinc-300'
          }`}
        >
          {suite.name}
        </span>
        <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
          {totalCases}
        </span>
      </div>

      {open && hasChildren && (
        <div>
          {suite.children?.map((child) => (
            <SuiteNode
              key={child.id}
              suite={child}
              depth={depth + 1}
              selectedSuiteId={selectedSuiteId}
              onSelect={onSelect}
              expandAllState={expandAllState}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Helpers ────────────────────────────────────── */
function countCases(node: TestSuiteTreeNode): number {
  let count = node.testCases?.length ?? 0;
  for (const child of node.children ?? []) {
    count += countCases(child);
  }
  return count;
}

/* ─── Main tree component ────────────────────────── */
interface TestSuiteTreeProps {
  suites: TestSuiteTreeNode[];
  unassignedCases: TestCase[];
  projectId: string;
  selectedSuiteId: number | null;
  onSelectSuite: (suiteId: number | null) => void;
}

export default function TestSuiteTree({
  suites,
  unassignedCases,
  selectedSuiteId,
  onSelectSuite,
}: TestSuiteTreeProps) {
  const [expandAllState, setExpandAllState] = useState<boolean | null>(null);
  const hasSuites = suites.length > 0;
  const hasUnassigned = unassignedCases.length > 0;
  const totalCount = suites.reduce((acc, suite) => acc + countCases(suite), 0) + unassignedCases.length;

  if (!hasSuites && !hasUnassigned) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center dark:border-zinc-700">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No test suites or test cases yet. Create a suite or test case to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      {hasSuites && (
        <div className="flex items-center justify-end gap-2 border-b border-zinc-200 px-2 py-1.5 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setExpandAllState(true)}
            className="text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            Expand all
          </button>
          <button
            type="button"
            onClick={() => setExpandAllState(false)}
            className="text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            Collapse all
          </button>
        </div>
      )}

      {/* "All Test Cases" root item */}
      <div
        className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
          selectedSuiteId === null ? 'bg-zinc-100 dark:bg-zinc-800' : ''
        }`}
        onClick={() => onSelectSuite(null)}
      >
        <FolderIcon open={false} selected={selectedSuiteId === null} />
        <span
          className={`flex-1 truncate text-sm font-medium ${
            selectedSuiteId === null ? 'text-zinc-900 dark:text-zinc-50' : 'text-zinc-700 dark:text-zinc-300'
          }`}
        >
          All test cases
        </span>
        <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
          {totalCount}
        </span>
      </div>

      {hasSuites && (
        <div className="mt-1">
          {suites.map((suite) => (
            <SuiteNode
              key={suite.id}
              suite={suite}
              selectedSuiteId={selectedSuiteId}
              onSelect={onSelectSuite}
              expandAllState={expandAllState}
            />
          ))}
        </div>
      )}

      {/* Unassigned folder */}
      {hasUnassigned && (
        <div
          className={`mt-1 flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
            selectedSuiteId === -1 ? 'bg-zinc-100 dark:bg-zinc-800' : ''
          }`}
          onClick={() => onSelectSuite(-1)}
        >
          <svg className="h-4 w-4 shrink-0 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <span
            className={`flex-1 truncate text-sm font-medium ${
              selectedSuiteId === -1 ? 'text-zinc-900 dark:text-zinc-50' : 'text-zinc-700 dark:text-zinc-300'
            }`}
          >
            Unassigned
          </span>
          <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            {unassignedCases.length}
          </span>
        </div>
      )}
    </div>
  );
}
