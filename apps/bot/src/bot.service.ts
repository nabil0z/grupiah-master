import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BotService {
    constructor(private configService: ConfigService) { }

    getHello(): string {
        return 'Grupiah Bot Service is running!';
    }
}
