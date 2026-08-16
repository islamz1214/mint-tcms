import { IsString, IsOptional, MinLength, IsNumber } from 'class-validator';

export class CreateTestSuiteDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  parentId?: number | null;
}
