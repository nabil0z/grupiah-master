import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminConfigModule } from '../admin/config/admin-config.module';

@Module({
    imports: [PrismaModule, AdminConfigModule],
    controllers: [UsersController]
})
export class UsersModule { }
