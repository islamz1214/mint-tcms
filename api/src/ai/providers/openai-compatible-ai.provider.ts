import { BadGatewayException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProvider, AiTestCaseGeneration, GeneratedTestCase, GeneratedTestStep } from '../ai.types';

interface ChatCompletionMessage {
  content?: string;
}

interface ChatCompletionChoice {
  message?: ChatCompletionMessage;
}

interface ChatCompletionResponse {
  choices?: ChatCompletionChoice[];
}

@Injectable()
export class OpenAiCompatibleAiProvider implements AiProvider {
  readonly providerName: string;
  readonly modelName: string;
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.providerName = this.config.get<string>('AI_PROVIDER') ?? 'openai-compatible';
    this.modelName = this.config.get<string>('AI_MODEL') ?? 'openai/gpt-oss-20b';
    this.baseUrl = (this.config.get<string>('AI_BASE_URL') ?? 'https://api.groq.com/openai/v1').replace(/\/$/, '');
  }

  async generateTestCasesFromUserStory(prompt: string): Promise<AiTestCaseGeneration> {
    const apiKey = this.config.get<string>('AI_API_KEY');

    if (!apiKey) {
      throw new ServiceUnavailableException('AI provider is not configured. Set AI_API_KEY.');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.modelName,
          temperature: 0.2,
          messages: [
            {
              role: 'system',
              content:
                'You are an expert QA assistant that generates test cases from a user story. Return JSON only with keys: title, summary, inputType, testCases, notes. inputType must be exactly "user_story". testCases must be an array of objects with keys title, steps, expectedResult. Every test case title must start with "Verify". steps must be an array of objects, each with keys action (the action to perform for that step) and expectedResult (the expected result for that specific step). The top-level expectedResult is the overall expected outcome for the whole test case. Every step must have its own non-empty expectedResult. notes must be an array of concise strings. Do not include any additional keys.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const bodyText = await response.text();
        throw new BadGatewayException(`AI provider request failed: ${response.status} ${bodyText}`);
      }

      const data = (await response.json()) as ChatCompletionResponse;
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new BadGatewayException('AI provider returned an empty response');
      }

      const parsed = this.parseJsonContent(content) as Partial<AiTestCaseGeneration>;

      const normalized: AiTestCaseGeneration = {
        title: typeof parsed.title === 'string' ? parsed.title : 'AI-generated test cases',
        summary: typeof parsed.summary === 'string' ? parsed.summary : 'Test cases generated from the provided user story.',
        inputType: 'user_story',
        testCases: Array.isArray(parsed.testCases)
          ? parsed.testCases
              .map((item) => this.normalizeSuggestedCase(item))
              .filter((item): item is GeneratedTestCase => item !== null)
              .slice(0, 12)
          : [],
        notes: Array.isArray(parsed.notes) ? parsed.notes.filter((v): v is string => typeof v === 'string') : [],
      };

      return normalized;
    } catch (error) {
      if (error instanceof BadGatewayException || error instanceof ServiceUnavailableException) {
        throw error;
      }

      throw new BadGatewayException('Failed to generate AI test cases');
    } finally {
      clearTimeout(timeout);
    }
  }

  private parseJsonContent(content: string): unknown {
    const trimmed = content.trim();

    try {
      return JSON.parse(trimmed);
    } catch {
      const withoutFences = trimmed.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
      const firstBrace = withoutFences.indexOf('{');
      const lastBrace = withoutFences.lastIndexOf('}');

      if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
        throw new BadGatewayException('AI provider returned non-JSON content');
      }

      const jsonSlice = withoutFences.slice(firstBrace, lastBrace + 1);
      return JSON.parse(jsonSlice);
    }
  }

  private normalizeSuggestedCase(item: unknown): GeneratedTestCase | null {
    if (typeof item !== 'object' || item === null) {
      return null;
    }

    const candidate = item as { title?: unknown; steps?: unknown; expectedResult?: unknown };

    if (typeof candidate.title !== 'string' || typeof candidate.expectedResult !== 'string') {
      return null;
    }

    const steps = this.normalizeSteps(candidate.steps, candidate.expectedResult);
    if (steps.length === 0) {
      return null;
    }

    return {
      title: this.normalizeCaseTitle(candidate.title),
      steps,
      expectedResult: candidate.expectedResult,
    };
  }

  // Normalize steps into a structured array where every step carries its own
  // expected result. Accepts the new object form ({ action, expectedResult }),
  // and falls back to legacy string / string[] forms for older AI responses.
  private normalizeSteps(rawSteps: unknown, caseExpectedResult: string): GeneratedTestStep[] {
    const fallbackExpected = caseExpectedResult.trim();

    if (typeof rawSteps === 'string') {
      return rawSteps
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((action) => ({ action, expectedResult: '' }));
    }

    if (!Array.isArray(rawSteps)) {
      return [];
    }

    const steps: GeneratedTestStep[] = [];
    for (const entry of rawSteps) {
      if (typeof entry === 'string') {
        const action = entry.trim();
        if (action) {
          steps.push({ action, expectedResult: '' });
        }
        continue;
      }

      if (typeof entry === 'object' && entry !== null) {
        const stepCandidate = entry as { action?: unknown; expectedResult?: unknown };
        const action = typeof stepCandidate.action === 'string' ? stepCandidate.action.trim() : '';
        const expectedResult =
          typeof stepCandidate.expectedResult === 'string' ? stepCandidate.expectedResult.trim() : '';
        if (action) {
          steps.push({ action, expectedResult });
        }
      }
    }

    // If no step carries an expected result, attach the case-level expected
    // result to the final step so it is not lost downstream.
    if (steps.length > 0 && fallbackExpected && steps.every((step) => !step.expectedResult)) {
      steps[steps.length - 1].expectedResult = fallbackExpected;
    }

    return steps;
  }

  private normalizeCaseTitle(rawTitle: string): string {
    const trimmedTitle = rawTitle.trim();
    if (!trimmedTitle) {
      return 'Verify expected behavior';
    }

    if (/^verify\b/i.test(trimmedTitle)) {
      return trimmedTitle;
    }

    return `Verify ${trimmedTitle.charAt(0).toLowerCase()}${trimmedTitle.slice(1)}`;
  }
}