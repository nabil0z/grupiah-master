import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
  providers: [AppService],
})
export class AppModule { }
