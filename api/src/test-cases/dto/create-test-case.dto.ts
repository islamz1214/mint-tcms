import { IsString, IsOptional, IsEnum, MinLength, IsNumber, ValidateIf } from 'class-validator';
import { TestCaseStatus, TestCasePriority } from '../entities/test-case.entity';

export class CreateTestCaseDto {
  @IsString()
  @MinLength(3)
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  precondition?: string;

  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsNumber()
  @IsOptional()
  preconditionId?: number | null;

  @IsString()
  @IsOptional()
  steps?: string;

  @IsString()
  @IsOptional()
  expectedResult?: string;

  @IsEnum(TestCaseStatus)
  @IsOptional()
  status?: TestCaseStatus;

  @IsEnum(TestCasePriority)
  @IsOptional()
  priority?: TestCasePriority;

  @IsNumber()
  @IsOptional()
  testSuiteId?: number;
}
