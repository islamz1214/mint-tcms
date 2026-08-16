'use client';

import { useEffect, useState } from 'react';
import { ApiError, get, post } from '@/lib/api';
import { serializeStepInputs } from '@/lib/test-case-steps';
import type { AiTestCaseGenerationResponse, Project, SuggestedAiTestCase } from '@/lib/types';

type TestCaseStatus = 'draft' | 'active' | 'archived';
type TestCasePriority = 'low' | 'medium' | 'high';

// Convert an AI-suggested test case into the structured payload the test-case
// API expects, so generated steps land in the proper `steps` field (and show up
// in the editor's step table) rather than being dumped into `description`. Each
// generated step carries its own expected result, which we preserve per step.
function buildTestCasePayload(
  tc: SuggestedAiTestCase,
  status: TestCaseStatus,
  priority: TestCasePriority,
) {
  const stepInputs = tc.steps.map((step) => ({
    action: step.action,
    testData: '',
    expectedResult: step.expectedResult,
  }));
  // Fall back to the case-level expected result on the final step if the AI
  // didn't provide a per-step one anywhere.
  if (stepInputs.length > 0 && tc.expectedResult?.trim() && stepInputs.every((s) => !s.expectedResult)) {
    stepInputs[stepInputs.length - 1].expectedResult = tc.expectedResult.trim();
  }
  const serialized = serializeStepInputs(stepInputs, false);

  return {
    title: tc.title,
    description: '',
    steps: serialized.steps,
    expectedResult: serialized.expectedResult ?? tc.expectedResult,
    status,
    priority,
  };
}

export default function AgentFeaturePanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiTestCaseGenerationResponse | null>(null);
  const [selectedCases, setSelectedCases] = useState<Set<number>>(new Set());
  const [status, setStatus] = useState<TestCaseStatus>('draft');
  const [priority, setPriority] = useState<TestCasePriority>('medium');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createNotice, setCreateNotice] = useState<string | null>(null);
  const [createdProjectId, setCreatedProjectId] = useState<number | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen && projects.length === 0) {
      get<Project[]>('/projects')
        .then(setProjects)
        .catch(() => {});
    }
  }, [isOpen, projects.length]);

  function toggleCase(index: number) {
    setSelectedCases((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  async function handleCreateInProject() {
    if (!selectedProjectId || !result) return;
    const targetProjectId = selectedProjectId;
    const cases = result.generation.testCases.filter((_, idx) => selectedCases.has(idx));
    if (cases.length === 0) {
      setCreateError('Select at least one test case to create.');
      return;
    }

    setIsCreating(true);
    setCreateError(null);
    setCreateNotice(null);
    setCreatedProjectId(null);

    const outcomes = await Promise.allSettled(
      cases.map((tc) =>
        post<unknown>(
          `/projects/${targetProjectId}/test-cases`,
          buildTestCasePayload(tc, status, priority),
        ),
      ),
    );

    const created = outcomes.filter((o) => o.status === 'fulfilled').length;
    const failed = outcomes.length - created;

    if (created > 0) {
      setCreateNotice(
        `Created ${created} test case(s)${failed > 0 ? `, ${failed} failed` : ''}.`,
      );
      setCreatedProjectId(targetProjectId);
      setPrompt('');
      setResult(null);
      setSelectedCases(new Set());
    }
    if (failed > 0 && created === 0) {
      setCreateError('Failed to create test cases. Please try again.');
    } else if (failed > 0) {
      setCreateError(`${failed} test case(s) could not be created.`);
    }

    setIsCreating(false);
  }

  async function handleGenerateTestCases() {
    if (!prompt.trim()) {
      setError('Please enter a user story before generating test cases.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setCreateError(null);
    setCreateNotice(null);
    setCreatedProjectId(null);

    try {
      const response = await post<AiTestCaseGenerationResponse>('/ai/test-cases', { prompt: prompt.trim() });
      setResult(response);
      // Pre-select every generated case so the default action mirrors the old
      // "create all" behaviour; users can deselect the ones they don't want.
      setSelectedCases(new Set(response.generation.testCases.map((_, idx) => idx)));
    } catch (err) {
      if (err instanceof ApiError) {
        const message = typeof err.body?.message === 'string' ? err.body.message : 'Failed to generate AI test cases.';
        setError(message);
      } else {
        setError('Failed to generate AI test cases.');
      }
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <>
      <button
        type="button"
        aria-controls="agent-feature-tray"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full border border-zinc-300/80 bg-white/95 px-4 py-2.5 text-sm font-semibold text-zinc-800 shadow-md shadow-zinc-900/10 backdrop-blur transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900/95 dark:text-zinc-100 dark:shadow-black/30 dark:hover:bg-zinc-800 dark:focus-visible:ring-zinc-500"
      >
        ✨ Mint AI
      </button>

      <div
        className={`fixed inset-0 z-40 bg-zinc-950/60 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      <aside
        id="agent-feature-tray"
        role="dialog"
        aria-modal="true"
        aria-labelledby="agent-feature-title"
        aria-hidden={!isOpen}
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-lg flex-col border-l border-zinc-200 bg-white shadow-2xl transition-transform duration-300 dark:border-zinc-800 dark:bg-zinc-950 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-500 dark:text-rose-400">AI Agent</p>
              <h3 id="agent-feature-title" className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                ✨ Mint AI
              </h3>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Paste a user story and generate QA test cases. This feature currently accepts only user-story prompts.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-md border border-zinc-200 p-2 text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-100"
              aria-label="Close tray"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <label htmlFor="agent-prompt" className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            User story prompt
          </label>
          <textarea
            id="agent-prompt"
            rows={12}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-500 focus:border-rose-400 focus:ring-2 focus:ring-rose-400/30 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            placeholder="As a customer, I want to reset my password via email so that I can recover account access when I forget it."
          />
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            Format required: As a ..., I want to ..., so that ...
          </p>

          {createNotice && createdProjectId && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300">
              <span>{createNotice}</span>
              <a
                href={`/projects/${createdProjectId}`}
                className="font-semibold underline underline-offset-2 hover:no-underline"
              >
                View in project →
              </a>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          )}

          {result && (
            <div className="mt-5 space-y-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
              <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                <span className="rounded-full border border-zinc-300 px-2 py-0.5 dark:border-zinc-700">Provider: {result.provider}</span>
                <span className="rounded-full border border-zinc-300 px-2 py-0.5 dark:border-zinc-700">Model: {result.model}</span>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{result.generation.title}</h4>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{result.generation.summary}</p>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                    Suggested test cases ({selectedCases.size}/{result.generation.testCases.length})
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedCases((prev) =>
                        prev.size === result.generation.testCases.length
                          ? new Set()
                          : new Set(result.generation.testCases.map((_, idx) => idx)),
                      )
                    }
                    className="text-xs font-medium text-rose-600 hover:text-rose-500 dark:text-rose-400"
                  >
                    {selectedCases.size === result.generation.testCases.length ? 'Deselect all' : 'Select all'}
                  </button>
                </div>
                <ul className="mt-2 space-y-3 text-sm text-zinc-700 dark:text-zinc-300">
                  {result.generation.testCases.map((item, idx) => (
                    <li key={`${item.title}-${idx}`}>
                      <label className="flex cursor-pointer gap-3 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
                        <input
                          type="checkbox"
                          checked={selectedCases.has(idx)}
                          onChange={() => toggleCase(idx)}
                          className="mt-1 h-4 w-4 shrink-0 rounded border-zinc-300 text-rose-600 focus:ring-rose-400 dark:border-zinc-600 dark:bg-zinc-800"
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-zinc-900 dark:text-zinc-100">{item.title}</p>
                          <ol className="mt-2 space-y-2">
                            {item.steps.map((step, stepIdx) => (
                              <li key={stepIdx} className="text-zinc-700 dark:text-zinc-300">
                                <span className="font-medium">{stepIdx + 1}.</span> {step.action}
                                {step.expectedResult && (
                                  <span className="mt-0.5 block pl-4 text-xs text-zinc-500 dark:text-zinc-400">
                                    Expected: {step.expectedResult}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ol>
                          {item.expectedResult && (
                            <p className="mt-2 text-zinc-600 dark:text-zinc-400">Overall: {item.expectedResult}</p>
                          )}
                        </div>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>

              {result.generation.notes.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Notes</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
                    {result.generation.notes.map((item, idx) => (
                      <li key={`${item}-${idx}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-4 space-y-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
                <label htmlFor="ai-project-select" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Create in project
                </label>
                <select
                  id="ai-project-select"
                  value={selectedProjectId ?? ''}
                  onChange={(e) => setSelectedProjectId(e.target.value ? Number(e.target.value) : null)}
                  className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                >
                  <option value="">Select a project...</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="ai-status-select" className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      Status
                    </label>
                    <select
                      id="ai-status-select"
                      value={status}
                      onChange={(e) => setStatus(e.target.value as TestCaseStatus)}
                      className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    >
                      <option value="draft">Draft</option>
                      <option value="active">Active</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="ai-priority-select" className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      Priority
                    </label>
                    <select
                      id="ai-priority-select"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as TestCasePriority)}
                      className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>

                {createError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300">
                    {createError}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleCreateInProject}
                  disabled={!selectedProjectId || isCreating || selectedCases.size === 0}
                  className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  {isCreating ? 'Creating...' : `Create ${selectedCases.size} Test Case(s)`}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:text-zinc-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleGenerateTestCases}
              disabled={isGenerating}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isGenerating ? 'Generating...' : '✨ Run'}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
