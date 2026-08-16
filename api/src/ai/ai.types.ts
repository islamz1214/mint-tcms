export interface GeneratedTestStep {
  action: string;
  expectedResult: string;
}

export interface GeneratedTestCase {
  title: string;
  steps: GeneratedTestStep[];
  expectedResult: string;
}

export interface AiTestCaseGeneration {
  title: string;
  summary: string;
  inputType: 'user_story';
  testCases: GeneratedTestCase[];
  notes: string[];
}

export interface AiTestCaseGenerationResponse {
  provider: string;
  model: string;
  generation: AiTestCaseGeneration;
}

export interface AiProvider {
  readonly providerName: string;
  readonly modelName: string;
  generateTestCasesFromUserStory(prompt: string): Promise<AiTestCaseGeneration>;
}
