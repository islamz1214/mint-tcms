import { IsString, MinLength } from 'class-validator';

export class CreatePreconditionDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @MinLength(2)
  content!: string;
}
