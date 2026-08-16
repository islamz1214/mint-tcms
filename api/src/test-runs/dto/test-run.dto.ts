import { IsString, IsOptional, IsEnum, MinLength, IsArray, IsNumber } from 'class-validator';
import { TestRunStatus } from '../entities/test-run.entity';

export class CreateTestRunDto {
  @IsString()
  @MinLength(3)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsNumber({}, { each: true })
  testCaseIds: number[];
}

export class UpdateTestRunDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TestRunStatus)
  @IsOptional()
  status?: TestRunStatus;
}
