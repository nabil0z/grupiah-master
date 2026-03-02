import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { validateInitData } from '@grupiah/utils';

@Injectable()
export class TelegramAuthGuard implements CanActivate {
    constructor(private configService: ConfigService) { }

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const authorization = request.headers['authorization']; // format: "tma <initData>"

        if (!authorization || !authorization.startsWith('tma ')) {
            throw new UnauthorizedException('Missing or invalid Telegram initData');
        }

        const initData = authorization.split(' ')[1];
        const botToken = this.configService.get<string>('BOT_TOKEN');

        if (!botToken) {
            // In development localhost fallback
            if (process.env.NODE_ENV === 'development' && initData === 'mock_token') {
                request.user = { id: 12345678, username: 'mock_user' };
                return true;
            }
            throw new UnauthorizedException('System misconfiguration');
        }

        // Bypass check for local development using Postman/Browser
        if (process.env.NODE_ENV === 'development' && initData === 'mock_token') {
            request.user = { id: 12345678, username: 'mock_user' };
            return true;
        }

        const { isValid, user } = validateInitData(initData, botToken);

        if (!isValid) {
            throw new UnauthorizedException('Invalid Telegram signature');
        }

        request.user = user;
        return true;
    }
}
