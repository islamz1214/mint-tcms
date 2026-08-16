import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProvider, AiTestCaseGenerationResponse } from './ai.types';
import { OpenAiCompatibleAiProvider } from './providers/openai-compatible-ai.provider';

@Injectable()
export class AiService {
  private readonly provider: AiProvider;

  constructor(
    config: ConfigService,
    openAiCompatibleProvider: OpenAiCompatibleAiProvider,
  ) {
    const selectedProvider = (config.get<string>('AI_PROVIDER') ?? 'openai-compatible').toLowerCase();

    switch (selectedProvider) {
      case 'openai-compatible':
      case 'groq':
      default:
        this.provider = openAiCompatibleProvider;
        break;
    }
  }

  async generateTestCases(prompt: string): Promise<AiTestCaseGenerationResponse> {
    this.assertPromptIsUserStory(prompt);

    const generation = await this.provider.generateTestCasesFromUserStory(prompt);

    return {
      provider: this.provider.providerName,
      model: this.provider.modelName,
      generation,
    };
  }

  private assertPromptIsUserStory(prompt: string): void {
    const normalized = prompt.toLowerCase();
    const hasAsA = /\bas\s+a\b/.test(normalized) || /\bas\s+an\b/.test(normalized);
    const hasIWant = /\bi\s+want\s+to\b/.test(normalized) || /\bi\s+need\s+to\b/.test(normalized);
    const hasSoThat = /\bso\s+that\b/.test(normalized);

    if (!(hasAsA && hasIWant && hasSoThat)) {
      throw new BadRequestException(
        'This AI feature currently only generates test cases from user stories. Use format: "As a ..., I want to ..., so that ...".',
      );
    }
  }
}
