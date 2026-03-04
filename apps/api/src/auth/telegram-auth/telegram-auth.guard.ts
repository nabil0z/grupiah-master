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
    // Extract hash from URL params
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');

    if (!hash) {
      console.log('[AUTH] No hash found in initData');
      return false;
    }

    // Create secret key (same for both approaches)
    const secretKey = createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    // --- APPROACH 1: Using decoded values (URLSearchParams) ---
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

    if (hash1 === hash) {
      console.log('[AUTH] HMAC valid (decoded approach)');
      return true;
    }

    // --- APPROACH 2: Using raw URL-encoded pairs ---
    const rawPairs = initData.split('&')
      .filter(pair => !pair.startsWith('hash='))
      .sort();
    const rawCheckString = rawPairs.join('\n');

    const hash2 = createHmac('sha256', secretKey)
      .update(rawCheckString)
      .digest('hex');

    if (hash2 === hash) {
      console.log('[AUTH] HMAC valid (raw approach)');
      return true;
    }

    console.log('[AUTH] Expected hash:', hash.substring(0, 16) + '...');
    console.log('[AUTH] Decoded hash:', hash1.substring(0, 16) + '...');
    console.log('[AUTH] Raw hash:', hash2.substring(0, 16) + '...');
    console.log('[AUTH] Token (first 10):', botToken.substring(0, 10) + '...');
    console.log('[AUTH] Decoded check (80):', decodedCheckString.substring(0, 80));
    console.log('[AUTH] Raw check (80):', rawCheckString.substring(0, 80));

    return false;
  }
}
