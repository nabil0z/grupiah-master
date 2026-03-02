import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TelegramAuthGuard implements CanActivate {
  constructor(private prisma: PrismaService) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('tma ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const initData = authHeader.split(' ')[1];

    // Bypass for local development testing
    if (initData === 'mock_token' && process.env.NODE_ENV !== 'production') {
      request.user = { id: 'mock-user-123', telegramId: 123456789n, username: 'mock_dev' };

      let dbUser = await this.prisma.user.findUnique({
        where: { telegramId: 123456789n }
      });

      if (!dbUser) {
        dbUser = await this.prisma.user.create({
          data: {
            telegramId: 123456789n,
            username: 'mock_dev',
            role: 'SUPER_ADMIN',
            referralCode: 'DEV_MOCK_123'
          }
        });
      }

      request.dbUser = dbUser;
      return true;
    }

    const botToken = process.env.BOT_TOKEN;
    const adminBotToken = process.env.ADMIN_BOT_TOKEN;

    if (!botToken && !adminBotToken) {
      throw new Error('BOT_TOKEN / ADMIN_BOT_TOKEN is not configured');
    }

    try {
      // Try validating against the User Bot Token first
      let isValid = false;
      if (botToken) {
        isValid = this.verifyTelegramWebAppData(initData, botToken);
      }

      // If it fails (or doesn't exist), try the Admin Bot Token
      if (!isValid && adminBotToken) {
        isValid = this.verifyTelegramWebAppData(initData, adminBotToken);
      }

      if (!isValid) {
        throw new UnauthorizedException('Invalid Telegram initData signature for any known bots');
      }

      // Parse user data from initData string
      const urlParams = new URLSearchParams(initData);
      const userStr = urlParams.get('user');

      if (!userStr) {
        throw new UnauthorizedException('User data missing from initData');
      }

      const telegramUser = JSON.parse(decodeURIComponent(userStr));

      // Attach parsed raw telegram user
      request.user = telegramUser;

      // Fetch from DB
      const dbUser = await this.prisma.user.findUnique({
        where: { telegramId: BigInt(telegramUser.id) }
      });

      if (dbUser) {
        request.dbUser = dbUser;
      }

      return true;
    } catch (e) {
      throw new UnauthorizedException('Authentication failed');
    }
  }

  private verifyTelegramWebAppData(initData: string, botToken: string): boolean {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');

    if (!hash) return false;

    urlParams.delete('hash');

    const paramsList: string[] = [];
    urlParams.forEach((value, key) => {
      paramsList.push(`${key}=${value}`);
    });

    // Sort parameters alphabetically
    paramsList.sort();

    const dataCheckString = paramsList.join('\n');

    // Create secret key
    const secretKey = createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    // Calculate final hash
    const calculatedHash = createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    return calculatedHash === hash;
  }
}
