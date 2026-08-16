import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateAiPlanDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(4000)
  prompt!: string;
}
