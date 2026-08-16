import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TestCasesService } from './test-cases.service';
import { CreateTestCaseDto } from './dto/create-test-case.dto';
import { UpdateTestCaseDto } from './dto/update-test-case.dto';
import { BulkAssignSuiteDto } from './dto/bulk-assign-suite.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ImportTestCasesResponseDto } from './dto/import-test-cases-response.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ALL_USER_ROLES, UserRole } from '../users/entities/user.entity';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...ALL_USER_ROLES)
@Controller('projects/:projectId/test-cases')
export class TestCasesController {
  constructor(private readonly testCasesService: TestCasesService) {}

  @Roles(UserRole.ADMIN, UserRole.TEST_MANAGER)
  @Post()
  create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateTestCaseDto,
    @Request() req: any,
  ) {
    return this.testCasesService.create(+projectId, dto, req.user.id);
  }

  @Roles(UserRole.ADMIN, UserRole.TEST_MANAGER)
  @Post('import/csv')
  @UseInterceptors(FileInterceptor('file'))
  importCsv(
    @Param('projectId') projectId: string,
    @UploadedFile() file: { buffer: Buffer } | undefined,
    @Request() req: any,
  ): Promise<ImportTestCasesResponseDto> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('CSV file is required');
    }

    return this.testCasesService.importCsv(+projectId, file.buffer.toString('utf8'), req.user.id);
  }

  @Roles(UserRole.ADMIN, UserRole.TEST_MANAGER)
  @Post('import/zephyr-xml')
  @UseInterceptors(FileInterceptor('file'))
  importZephyrXml(
    @Param('projectId') projectId: string,
    @UploadedFile() file: { buffer: Buffer } | undefined,
    @Request() req: any,
  ): Promise<ImportTestCasesResponseDto> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Zephyr XML file is required');
    }

    return this.testCasesService.importZephyrXml(+projectId, file.buffer.toString('utf8'), req.user.id);
  }

  @Get()
  findAll(
    @Param('projectId') projectId: string,
    @Request() req: any,
    @Query() query: Record<string, string | string[] | undefined>,
  ) {
    const limit = this.parseIntQuery(query.limit);
    const offset = this.parseIntQuery(query.offset);
    const suiteIds =
      typeof query.suiteIds === 'string' && query.suiteIds.trim()
        ? query.suiteIds
            .split(',')
            .map((value) => Number(value))
            .filter((value) => Number.isFinite(value))
        : undefined;
    const rawUnassigned = query.unassigned;
    const unassigned = rawUnassigned === 'true' || rawUnassigned == '1';

    return this.testCasesService.findAll(+projectId, req.user.id, {
      limit,
      offset,
      q: typeof query.q === 'string' ? query.q : undefined,
      suiteIds,
      unassigned,
    });
  }

  private parseIntQuery(value: string | string[] | undefined): number | undefined {
    if (typeof value !== 'string') return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
  }

  @Get('export/csv')
  async exportCsv(
    @Param('projectId') projectId: string,
    @Request() req: any,
    @Res({ passthrough: true }) res: any,
  ) {
    const csv = await this.testCasesService.exportCsv(+projectId, req.user.id);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="project-${projectId}-test-cases.csv"`);
    return csv;
  }

  @Get(':id')
  findOne(@Param('projectId') projectId: string, @Param('id') id: string, @Request() req: any) {
    return this.testCasesService.findOne(+id, +projectId, req.user.id);
  }

  @Get(':id/revisions')
  findRevisions(@Param('projectId') projectId: string, @Param('id') id: string, @Request() req: any) {
    return this.testCasesService.findRevisions(+id, +projectId, req.user.id);
  }

  @Roles(UserRole.ADMIN, UserRole.TEST_MANAGER)
  @Post(':id/revisions/:revisionId/restore')
  restoreRevision(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Param('revisionId') revisionId: string,
    @Request() req: any,
  ) {
    return this.testCasesService.restoreRevision(+id, +projectId, +revisionId, req.user.id);
  }

  @Roles(UserRole.ADMIN, UserRole.TEST_MANAGER)
  @Patch('bulk/assign-suite')
  bulkAssignSuite(
    @Param('projectId') projectId: string,
    @Body() dto: BulkAssignSuiteDto,
    @Request() req: any,
  ) {
    return this.testCasesService.bulkAssignSuite(+projectId, dto, req.user.id);
  }

  @Roles(UserRole.ADMIN, UserRole.TEST_MANAGER)
  @Patch(':id')
  update(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTestCaseDto,
    @Request() req: any,
  ) {
    return this.testCasesService.update(+id, +projectId, dto, req.user.id);
  }

  @Roles(UserRole.ADMIN, UserRole.TEST_MANAGER)
  @Delete(':id')
  remove(@Param('projectId') projectId: string, @Param('id') id: string, @Request() req: any) {
    return this.testCasesService.remove(+id, +projectId, req.user.id);
  }
}
