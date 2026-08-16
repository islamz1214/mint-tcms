import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TestResultStatus } from '../entities/test-result.entity';

export class UpdateTestResultDto {
  @IsEnum(TestResultStatus)
  status: TestResultStatus;

  @IsString()
  @IsOptional()
  notes?: string;
}
