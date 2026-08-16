'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { get, post, ApiError } from '@/lib/api';
import type {
  TestCase,
  TestSuite,
  TestCaseTree,
  CreateTestCaseDto,
  TestCaseStatus,
  TestCasePriority,
  TestSuiteTreeNode,
  Precondition,
} from '@/lib/types';
import { serializeStepInputs, type StepInput } from '@/lib/test-case-steps';
import AutoResizeTextarea from '@/components/auto-resize-textarea';

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

export default function NewTestCasePage() {
  const { id: projectId } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [precondition, setPrecondition] = useState('');
  const [preconditions, setPreconditions] = useState<Precondition[]>([]);
  const [preconditionId, setPreconditionId] = useState<number | null>(null);
  const [steps, setSteps] = useState<StepInput[]>([{ action: '', testData: '', expectedResult: '' }]);
  const [isTestDataEnabled, setIsTestDataEnabled] = useState(false);
  const [status, setStatus] = useState<TestCaseStatus>('draft');
  const [priority, setPriority] = useState<TestCasePriority>('medium');
  const [testSuiteId, setTestSuiteId] = useState<number | undefined>(
    searchParams.get('suiteId') ? Number(searchParams.get('suiteId')) : undefined,
  );
  const [flatSuites, setFlatSuites] = useState<{ suite: TestSuite; depth: number }[]>([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const parsedTitles = title
    .split('\n')
    .map((value) => value.trim())
    .filter(Boolean);

  useEffect(() => {
    Promise.all([
      get<TestCaseTree>(`/projects/${projectId}/test-suites/tree`),
      get<Precondition[]>(`/projects/${projectId}/preconditions`),
    ])
      .then(([tree, preconditionsData]) => {
        setFlatSuites(flattenSuites(tree.suites));
        setPreconditions(preconditionsData);
      })
      .catch(() => {});
  }, [projectId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (parsedTitles.length === 0) {
        setError('Enter at least one test case title');
        return;
      }

      const invalidTitles = parsedTitles.filter((value) => value.length < 3);
      if (invalidTitles.length > 0) {
        setError('Each test case title must be at least 3 characters long');
        return;
      }

      const serializedSteps = serializeStepInputs(steps, isTestDataEnabled);

      for (const currentTitle of parsedTitles) {
        const body: CreateTestCaseDto = {
          title: currentTitle,
          status,
          priority,
        };

        if (description.trim()) body.description = description;
        if (precondition.trim()) body.precondition = precondition;
        if (preconditionId !== null) body.preconditionId = preconditionId;
        body.steps = serializedSteps.steps;
        body.expectedResult = serializedSteps.expectedResult;

        if (testSuiteId) body.testSuiteId = testSuiteId;
        await post<TestCase>(`/projects/${projectId}/test-cases`, body);
      }

      router.push(`/projects/${projectId}`);
    } catch (err) {
      if (err instanceof ApiError) {
        const msg = err.body?.message;
        setError(Array.isArray(msg) ? msg.join(', ') : (msg as string) || 'Failed to create test case(s)');
      } else {
        setError('Something went wrong');
      }
    } finally {
      setSubmitting(false);
    }
  }

  function updateStepField(index: number, field: keyof StepInput, value: string) {
    setSteps((prev) =>
      prev.map((step, i) => (i === index ? { ...step, [field]: value } : step)),
    );
  }

  function addStep() {
    setSteps((prev) => [...prev, { action: '', testData: '', expectedResult: '' }]);
  }

  function removeStep(index: number) {
    setSteps((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length === 0 ? [{ action: '', testData: '', expectedResult: '' }] : next;
    });
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Link
          href={`/projects/${projectId}`}
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          ← Back to project
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          New Test Case
        </h1>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Title
          </label>
          <textarea
            id="title"
            required
            rows={Math.max(1, Math.min(6, parsedTitles.length || 1))}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Status
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as TestCaseStatus)}
              className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Priority
            </label>
            <select
              id="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as TestCasePriority)}
              className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>

        {flatSuites.length > 0 && (
          <div>
            <label htmlFor="suite" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Test Suite <span className="text-zinc-400">(optional)</span>
            </label>
            <select
              id="suite"
              value={testSuiteId ?? ''}
              onChange={(e) => setTestSuiteId(e.target.value ? Number(e.target.value) : undefined)}
              className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            >
              <option value="">No suite</option>
              {flatSuites.map(({ suite: s, depth }) => (
                <option key={s.id} value={s.id}>
                  {'\u00A0\u00A0'.repeat(depth)}{depth > 0 ? '└ ' : ''}{s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Description <span className="text-zinc-400">(optional)</span>
          </label>
          <textarea
            id="description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            placeholder="Describe what this test case verifies"
          />
        </div>

        <div>
          <label htmlFor="reusable-precondition" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Reusable Precondition <span className="text-zinc-400">(optional)</span>
          </label>
          <select
            id="reusable-precondition"
            value={preconditionId ?? ''}
            onChange={(e) => setPreconditionId(e.target.value ? Number(e.target.value) : null)}
            className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          >
            <option value="">No reusable precondition</option>
            {preconditions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          {preconditionId !== null && (
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {preconditions.find((item) => item.id === preconditionId)?.content}
            </p>
          )}
          {preconditions.length === 0 && (
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              No reusable preconditions yet. Create some from the project preconditions page.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="precondition" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Custom Preconditions <span className="text-zinc-400">(optional)</span>
          </label>
          <textarea
            id="precondition"
            rows={3}
            value={precondition}
            onChange={(e) => setPrecondition(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            placeholder="Describe setup or state required before executing this test case"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Steps <span className="text-zinc-400">(optional)</span>
          </label>
          <div className="mt-2 flex items-center gap-2">
            <input
              id="enable-test-data"
              type="checkbox"
              checked={isTestDataEnabled}
              onChange={(e) => setIsTestDataEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800"
            />
            <label htmlFor="enable-test-data" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Enable Test Data field
            </label>
          </div>
          <div className="mt-1 space-y-2">
            {steps.map((step, index) => (
              <div key={`step-${index}`} className="rounded-lg border border-zinc-300 p-3 dark:border-zinc-700">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500 dark:text-zinc-400">
                    Step {index + 1}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeStep(index)}
                    className="rounded-lg border border-zinc-300 px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    aria-label={`Remove step ${index + 1}`}
                  >
                    Remove
                  </button>
                </div>

                <div className={`grid grid-cols-1 items-start gap-3 sm:gap-4 ${isTestDataEnabled ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
                  <div>
                    <label htmlFor={`step-action-${index + 1}`} className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      Action
                    </label>
                    <AutoResizeTextarea
                      data-step-field
                      id={`step-action-${index + 1}`}
                      rows={1}
                      value={step.action}
                      onChange={(e) => updateStepField(index, 'action', e.target.value)}
                      className="mt-1 block w-full resize-none overflow-hidden rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </div>

                  {isTestDataEnabled && (
                    <div>
                      <label htmlFor={`step-test-data-${index + 1}`} className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                        Test Data
                      </label>
                      <AutoResizeTextarea
                        data-step-field
                        id={`step-test-data-${index + 1}`}
                        rows={1}
                        value={step.testData}
                        onChange={(e) => updateStepField(index, 'testData', e.target.value)}
                        className="mt-1 block w-full resize-none overflow-hidden rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                      />
                    </div>
                  )}

                  <div>
                    <label htmlFor={`step-expected-result-${index + 1}`} className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      Expected Result
                    </label>
                    <AutoResizeTextarea
                      data-step-field
                      id={`step-expected-result-${index + 1}`}
                      rows={1}
                      value={step.expectedResult}
                      onChange={(e) => updateStepField(index, 'expectedResult', e.target.value)}
                      className="mt-1 block w-full resize-none overflow-hidden rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </div>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addStep}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              + Add step
            </button>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {submitting ? 'Creating…' : parsedTitles.length > 1 ? `Create ${parsedTitles.length} Test Cases` : 'Create Test Case'}
          </button>
          <Link
            href={`/projects/${projectId}`}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
