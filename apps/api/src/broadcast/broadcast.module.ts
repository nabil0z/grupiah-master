import { Module } from '@nestjs/common';
import { BroadcastCronService } from './broadcast-cron.service';
import { BroadcastService } from './broadcast.service';
import { BroadcastController } from './broadcast.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminConfigModule } from '../admin/config/admin-config.module';

@Module({
    imports: [PrismaModule, AdminConfigModule],
    controllers: [BroadcastController],
    providers: [BroadcastCronService, BroadcastService],
    exports: [BroadcastCronService],
})
export class BroadcastModule { }
