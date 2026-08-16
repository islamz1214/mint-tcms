import { PartialType } from '@nestjs/mapped-types';
import { CreateTestPlanDto } from './create-test-plan.dto';

export class UpdateTestPlanDto extends PartialType(CreateTestPlanDto) {}
