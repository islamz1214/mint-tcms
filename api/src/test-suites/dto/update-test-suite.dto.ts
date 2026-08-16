import { PartialType } from '@nestjs/mapped-types';
import { CreateTestSuiteDto } from './create-test-suite.dto';

export class UpdateTestSuiteDto extends PartialType(CreateTestSuiteDto) {}
