import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

import { PrismaModule } from '../prisma/prisma.module';
import { AdminConfigModule } from '../admin/config/admin-config.module';

@Module({
  imports: [PrismaModule, AdminConfigModule],
  providers: [AuthService],
  controllers: [AuthController]
})
export class AuthModule { }
