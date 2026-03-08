import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdminModule } from './admin/admin.module';
import { PrismaService } from './prisma/prisma.service';
import { AuthModule } from './auth/auth.module';
import { UsersController } from './users/users.controller';
import { UsersService } from './users/users.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { TasksModule } from './tasks/tasks.module';
import { AdminConfigModule } from './admin/config/admin-config.module';
import { ScheduleModule } from '@nestjs/schedule';
import { BroadcastModule } from './broadcast/broadcast.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env']
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,   // 60 seconds window
      limit: 60,    // max 60 requests per window per IP
    }]),
    ScheduleModule.forRoot(),
    AdminModule,
    AuthModule,
    PrismaModule,
    UsersModule,
    TasksModule,
    AdminConfigModule,
    BroadcastModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule { }
