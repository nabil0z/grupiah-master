import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { AdminConfigService } from './admin-config.service';
import { TelegramAuthGuard } from '../../auth/telegram-auth.guard'; // Adjust path if needed

@Controller('admin/settings')
// @UseGuards(TelegramAuthGuard) // Protect with Admin guard later
export class AdminConfigController {
    constructor(private readonly configService: AdminConfigService) { }

    @Get()
    async getAllConfigs() {
        return this.configService.getAllConfigs();
    }

    @Put()
    async updateConfigs(@Body() configs: Record<string, string>) {
        return this.configService.updateConfigs(configs);
    }
}
