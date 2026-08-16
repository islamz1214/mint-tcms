---
agent: ask
model: GPT-5.3-Codex
description: Implement a feature end-to-end with API/UI tests and docs updates
---

You are working in the Mint TCMS monorepo.

Implement the following feature request end-to-end:

Feature name:
<fill here>

Business goal:
<fill here>

Requirements:
<fill here>

Constraints:
<fill here>

Definition of done:
1. Implement backend changes needed for the feature.
2. Implement frontend/UI changes needed for the feature.
3. Add or update API tests for happy path, validation failures, and authorization.
4. Add or update UI tests for primary flows and critical error states.
5. Update API documentation with endpoints, payloads, responses, and examples.
6. Update UI/user documentation for how to use the feature.
7. Run relevant tests and report results.
8. Do not mark the task complete if any required test suite was not executed.
9. Do not mark the task complete if API docs and UI docs file paths are not explicitly listed.

Execution rules:
- Keep changes minimal, focused, and consistent with existing architecture.
- Follow existing patterns and naming conventions.
- Do not break existing endpoints or UI flows unless explicitly requested.
- If requirements are ambiguous, make the safest assumption and document it.
- If a required test cannot run, stop and report the exact blocker and command output.
- If no API docs or UI docs existed, create them in the most appropriate existing docs location.

Validation gates (must pass):
1. Required test commands are executed and included verbatim in the final response.
2. Test outcomes include pass/fail counts and any failing test names.
3. API docs updates list exact modified files.
4. UI docs updates list exact modified files.
5. If a gate fails, return status as BLOCKED instead of DONE.

Output format:
1. Status: DONE or BLOCKED.
2. Summary of implemented changes.
3. File-by-file change list.
4. Test commands executed.
5. Test results (with counts/failures).
6. API documentation updates (exact file paths).
7. UI documentation updates (exact file paths).
8. Follow-up risks or TODOs.
