import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { RequirementPriority, RequirementStatus } from '../entities/requirement.entity';

export class CreateRequirementDto {
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(32)
  key?: string;

  @IsString()
  @MinLength(3)
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(RequirementStatus)
  @IsOptional()
  status?: RequirementStatus;

  @IsEnum(RequirementPriority)
  @IsOptional()
  priority?: RequirementPriority;

  @IsString()
  @IsOptional()
  externalSystem?: string;

  @IsString()
  @IsOptional()
  externalId?: string;

  @IsString()
  @IsOptional()
  externalUrl?: string;
}
