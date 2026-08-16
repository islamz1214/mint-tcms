import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiService } from './ai.service';
import { CreateAiPlanDto } from './dto/create-ai-plan.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Roles(UserRole.ADMIN, UserRole.TEST_MANAGER, UserRole.TESTER)
  @Post('test-cases')
  generateTestCases(@Body() createAiPlanDto: CreateAiPlanDto, @Request() _req: any) {
    return this.aiService.generateTestCases(createAiPlanDto.prompt);
  }
}
