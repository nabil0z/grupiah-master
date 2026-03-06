import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { PrismaModule } from '../prisma/prisma.module';
import { TaskProviderFactory } from './task-provider.factory';
import { WebhooksController } from './webhooks.controller';
import { AdminConfigModule } from '../admin/config/admin-config.module';
import { OGAdsAdapter, AdBlueMediaAdapter, CPAGripAdapter } from '@grupiah/provider-adapters';

@Module({
  imports: [PrismaModule, AdminConfigModule],
  controllers: [TasksController, WebhooksController],
  providers: [TasksService, TaskProviderFactory, OGAdsAdapter, AdBlueMediaAdapter, CPAGripAdapter],
  exports: [TasksService]
})
export class TasksModule { }
