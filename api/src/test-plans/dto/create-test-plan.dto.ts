import {
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { TestPlanStatus, TestPlanType } from '../entities/test-plan.entity';

export class CreateTestPlanDto {
  @IsString()
  @MinLength(3)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  cycleLabel?: string;

  @IsEnum(TestPlanType)
  type: TestPlanType;

  @IsEnum(TestPlanStatus)
  @IsOptional()
  status?: TestPlanStatus;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  testCaseIds: number[];
}
