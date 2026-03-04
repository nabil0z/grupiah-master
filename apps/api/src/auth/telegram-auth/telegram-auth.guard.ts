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
        console.log('[AUTH] User bot validation result:', isValid);
      }

      // If it fails (or doesn't exist), try the Admin Bot Token
      if (!isValid && adminBotToken) {
        isValid = this.verifyTelegramWebAppData(initData, adminBotToken);
        console.log('[AUTH] Admin bot validation result:', isValid);
      }

      if (!isValid) {
        console.error('[AUTH] HMAC validation failed for ALL bot tokens');
        throw new UnauthorizedException('Invalid Telegram initData signature for any known bots');
      }

      // Parse user data from initData string
      const urlParams = new URLSearchParams(initData);
      const userStr = urlParams.get('user');

      if (!userStr) {
        console.error('[AUTH] No user field in initData. Keys:', [...new URLSearchParams(initData).keys()]);
        throw new UnauthorizedException('User data missing from initData');
      }

      const telegramUser = JSON.parse(decodeURIComponent(userStr));
      console.log('[AUTH] Telegram user parsed:', telegramUser.id, telegramUser.username);

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
      console.error('[AUTH] Authentication error:', e?.message || e);
      throw new UnauthorizedException('Authentication failed');
    }
  }

  private verifyTelegramWebAppData(initData: string, botToken: string): boolean {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');

    if (!hash) {
      console.log('[AUTH] No hash found in initData');
      return false;
    }

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

    console.log('[AUTH] Expected hash:', hash.substring(0, 16) + '...');
    console.log('[AUTH] Calculated hash:', calculatedHash.substring(0, 16) + '...');
    console.log('[AUTH] Token used (first 10):', botToken.substring(0, 10) + '...');
    console.log('[AUTH] Data check string (first 80):', dataCheckString.substring(0, 80));

    return calculatedHash === hash;
  }
}
