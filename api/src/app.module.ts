import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ProjectsModule } from './projects/projects.module';
import { TestCasesModule } from './test-cases/test-cases.module';
import { TestRunsModule } from './test-runs/test-runs.module';
import { TestSuitesModule } from './test-suites/test-suites.module';
import { AiModule } from './ai/ai.module';
import { RequirementsModule } from './requirements/requirements.module';
import { TestPlansModule } from './test-plans/test-plans.module';
import { DefectsModule } from './defects/defects.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { PreconditionsModule } from './preconditions/preconditions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // available in every module without re-importing
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get<string>('DB_USER'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        autoLoadEntities: true,
        synchronize: true,
      }),
    }),
    UsersModule,
    AuthModule,
    ProjectsModule,
    TestCasesModule,
    TestRunsModule,
    TestSuitesModule,
    AiModule,
    RequirementsModule,
    TestPlansModule,
    DefectsModule,
    AttachmentsModule,
    OrganizationsModule,
    PreconditionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
