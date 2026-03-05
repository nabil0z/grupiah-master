import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TelegramAuthGuard implements CanActivate {
  constructor(private prisma: PrismaService) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader) {
      throw new UnauthorizedException('Missing Authorization header');
    }

    // Admin Dashboard auth via secret key (works in all environments including production)
    if (authHeader.startsWith('admin ')) {
      const secret = authHeader.split(' ')[1];
      const adminSecret = process.env.ADMIN_SECRET;

      if (!adminSecret || secret !== adminSecret) {
        throw new UnauthorizedException('Invalid admin secret');
      }

      // Find or create a dedicated admin user for dashboard access
      let dbUser = await this.prisma.user.findUnique({
        where: { telegramId: 100000000n }
      });

      if (!dbUser) {
        dbUser = await this.prisma.user.create({
          data: {
            telegramId: 100000000n,
            username: 'admin_dashboard',
            firstName: 'Admin',
            role: 'SUPER_ADMIN',
            referralCode: 'ADMIN_DASHBOARD_001'
          }
        });
      }

      request.user = { id: dbUser.telegramId.toString(), telegramId: dbUser.telegramId, username: 'admin_dashboard' };
      request.dbUser = dbUser;
      return true;
    }

    if (!authHeader.startsWith('tma ')) {
      throw new UnauthorizedException('Invalid Authorization header format');
    }

    const initData = authHeader.split(' ')[1];

    // Bypass for local development testing only
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
        throw new UnauthorizedException('Invalid Telegram initData signature');
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
      if (e instanceof UnauthorizedException) throw e;
      throw new UnauthorizedException('Authentication failed');
    }
  }

  private verifyTelegramWebAppData(initData: string, botToken: string): boolean {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');

    if (!hash) return false;

    // Create secret key
    const secretKey = createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    // Approach 1: Using decoded values (URLSearchParams)
    urlParams.delete('hash');
    const decodedParams: string[] = [];
    urlParams.forEach((value, key) => {
      decodedParams.push(`${key}=${value}`);
    });
    decodedParams.sort();
    const decodedCheckString = decodedParams.join('\n');

    const hash1 = createHmac('sha256', secretKey)
      .update(decodedCheckString)
      .digest('hex');

    if (hash1 === hash) return true;

    // Approach 2: Using raw URL-encoded pairs (fallback)
    const rawPairs = initData.split('&')
      .filter(pair => !pair.startsWith('hash='))
      .sort();
    const rawCheckString = rawPairs.join('\n');

    const hash2 = createHmac('sha256', secretKey)
      .update(rawCheckString)
      .digest('hex');

    return hash2 === hash;
  }
}
