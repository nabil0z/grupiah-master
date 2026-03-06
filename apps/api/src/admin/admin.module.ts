import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaModule } from '../prisma/prisma.module';
import { BroadcastModule } from '../broadcast/broadcast.module';

@Module({
    imports: [PrismaModule, BroadcastModule],
    controllers: [AdminController],
    providers: [AdminService],
})
export class AdminModule { }
