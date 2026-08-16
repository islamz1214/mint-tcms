import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { OpenAiCompatibleAiProvider } from './providers/openai-compatible-ai.provider';

@Module({
  controllers: [AiController],
  providers: [AiService, OpenAiCompatibleAiProvider],
})
export class AiModule {}
