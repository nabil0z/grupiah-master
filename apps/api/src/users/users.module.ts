import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminConfigModule } from '../admin/config/admin-config.module';
import { WithdrawalCronService } from './withdrawal-cron.service';

@Module({
    imports: [PrismaModule, AdminConfigModule],
    controllers: [UsersController],
    providers: [WithdrawalCronService]
})
export class UsersModule { }
