import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdatePreconditionDto {
	@IsString()
	@IsOptional()
	@MinLength(2)
	name?: string;

	@IsString()
	@IsOptional()
	@MinLength(2)
	content?: string;
}
