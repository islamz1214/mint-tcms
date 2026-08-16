import { IsEnum, IsOptional, IsString, MaxLength, MinLength, IsUrl } from 'class-validator';
import { DefectPriority, DefectSeverity, DefectSourceType, DefectStatus } from '../entities/defect.entity';

export class CreateDefectDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(DefectStatus)
  status?: DefectStatus;

  @IsOptional()
  @IsEnum(DefectSeverity)
  severity?: DefectSeverity;

  @IsOptional()
  @IsEnum(DefectPriority)
  priority?: DefectPriority;

  @IsOptional()
  @IsString()
  expectedResult?: string;

  @IsOptional()
  @IsString()
  actualResult?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  environment?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  component?: string;

  @IsOptional()
  @IsEnum(DefectSourceType)
  sourceType?: DefectSourceType;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  externalKey?: string;

  @IsOptional()
  @IsUrl()
  externalUrl?: string;
}