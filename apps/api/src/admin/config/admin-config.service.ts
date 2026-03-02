import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminConfigService {
    constructor(private readonly prisma: PrismaService) { }

    async getAllConfigs(): Promise<Record<string, string>> {
        const configs = await this.prisma.platformConfig.findMany();

        // Transform array of DB rows into a clean { "KEY": "VALUE" } object
        return configs.reduce((acc, config) => {
            acc[config.key] = config.value;
            return acc;
        }, {} as Record<string, string>);
    }

    async updateConfigs(configs: Record<string, string>): Promise<{ message: string, updatedKeys: string[] }> {
        const keys = Object.keys(configs);

        // Using simple loop with upsert since Prisma doesn't support bulk upsert
        for (const key of keys) {
            await this.prisma.platformConfig.upsert({
                where: { key },
                update: { value: configs[key] },
                create: { key, value: configs[key] }
            });
        }

        return {
            message: 'Global settings updated successfully',
            updatedKeys: keys
        };
    }

    // Utility method for other services to quickly grab a specific config without overhead
    async getConfigValue(key: string, defaultValue: string = ''): Promise<string> {
        const config = await this.prisma.platformConfig.findUnique({ where: { key } });
        return config ? config.value : defaultValue;
    }
}
