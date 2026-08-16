export interface StepInput {
  action: string;
  testData: string;
  expectedResult: string;
}

export interface ParsedStepInputState {
  steps: StepInput[];
  isTestDataEnabled: boolean;
}

const EMPTY_STEP: StepInput = {
  action: '',
  testData: '',
  expectedResult: '',
};

function normalizeStep(step: StepInput, isTestDataEnabled: boolean): StepInput {
  return {
    action: step.action.trim(),
    testData: isTestDataEnabled ? step.testData.trim() : '',
    expectedResult: step.expectedResult.trim(),
  };
}

export function parseStoredTestCaseSteps(
  rawSteps: string | null | undefined,
  fallbackExpected: string | null | undefined,
): ParsedStepInputState {
  if (!rawSteps || !rawSteps.trim()) {
    return {
      steps: [
        {
          ...EMPTY_STEP,
          expectedResult: fallbackExpected?.trim() ?? '',
        },
      ],
      isTestDataEnabled: false,
    };
  }

  // Try JSON format first (new format)
  try {
    const parsed = JSON.parse(rawSteps);
    if (parsed && Array.isArray(parsed.steps)) {
      return {
        steps: parsed.steps.map((step: Record<string, string>) => ({
          action: (step.action ?? '').trim(),
          testData: (step.testData ?? '').trim(),
          expectedResult: (step.expectedResult ?? '').trim(),
        })),
        isTestDataEnabled: parsed.isTestDataEnabled ?? parsed.steps.some((step: Record<string, string>) => (step.testData ?? '').trim().length > 0),
      };
    }
  } catch {
    // fall through to text format parsing
  }

  // Legacy text format
  const blocks = rawSteps
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);
  const structuredBlocks = blocks.filter((block) => /^Step\s+\d+/i.test(block));

  if (structuredBlocks.length > 0) {
    const steps = structuredBlocks.map((block) => {
      const lines = block
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      const actionLine = lines.find((line) => /^Action\s*:/i.test(line));
      const testDataLine = lines.find((line) => /^Test Data\s*:/i.test(line));
      const expectedLine = lines.find((line) => /^Expected Result\s*:/i.test(line));

      return {
        action: actionLine ? actionLine.replace(/^Action\s*:\s*/i, '').trim() : '',
        testData: testDataLine ? testDataLine.replace(/^Test Data\s*:\s*/i, '').trim() : '',
        expectedResult: expectedLine
          ? expectedLine.replace(/^Expected Result\s*:\s*/i, '').trim()
          : '',
      };
    });

    return {
      steps: steps.length > 0 ? steps : [{ ...EMPTY_STEP }],
      isTestDataEnabled: steps.some((step) => step.testData.length > 0),
    };
  }

  const simpleSteps = rawSteps
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (simpleSteps.length === 0) {
    return {
      steps: [
        {
          ...EMPTY_STEP,
          expectedResult: fallbackExpected?.trim() ?? '',
        },
      ],
      isTestDataEnabled: false,
    };
  }

  const fallback = fallbackExpected?.trim() ?? '';
  const expectedLines = fallback
    ? fallback
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
    : [];

  // If expected results are provided line-by-line, map them to matching steps.
  if (expectedLines.length === simpleSteps.length) {
    return {
      steps: simpleSteps.map((action, index) => ({
        action,
        testData: '',
        expectedResult: expectedLines[index] ?? '',
      })),
      isTestDataEnabled: false,
    };
  }

  return {
    steps: simpleSteps.map((action, index) => ({
      action,
      testData: '',
      // Avoid duplicating one shared expected result on every step.
      expectedResult: fallback && index === simpleSteps.length - 1 ? fallback : '',
    })),
    isTestDataEnabled: false,
  };
}

export function serializeStepInputs(
  steps: StepInput[],
  isTestDataEnabled: boolean,
): { steps?: string; expectedResult?: string } {
  const normalizedSteps = steps
    .map((step) => normalizeStep(step, isTestDataEnabled))
    .filter((step) => step.action || step.testData || step.expectedResult);

  if (normalizedSteps.length === 0) {
    return {};
  }

  return {
    steps: JSON.stringify({ steps: normalizedSteps, isTestDataEnabled }),
    expectedResult: undefined,
  };
}