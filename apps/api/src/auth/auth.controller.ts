import { Controller, Post, Headers, UseGuards, Request, Injectable, UnauthorizedException } from '@nestjs/common';
import { TelegramAuthGuard } from './telegram-auth/telegram-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('auth')
export class AuthController {
    constructor(private prisma: PrismaService) { }

    @Post('telegram/login')
    @UseGuards(TelegramAuthGuard)
    async login(@Request() req: any, @Headers('x-start-param') startParam: string) {
        const telegramUser = req.user;

        // Check if user already exists
        let user = await this.prisma.user.findUnique({
            where: { telegramId: BigInt(telegramUser.id) },
            include: { wallet: true }
        });

        // If new user, create their account + wallet
        if (!user) {
            // Decode startParam for referral check ('ref_{id}')
            let referredById: string | null = null;
            if (startParam && startParam.startsWith('ref_')) {
                const inviterId = startParam.split('_')[1];
                const inviter = await this.prisma.user.findUnique({
                    where: { id: inviterId }
                });
                if (inviter) referredById = inviter.id;
            }

            user = await this.prisma.user.create({
                data: {
                    telegramId: BigInt(telegramUser.id),
                    username: telegramUser.username || null,
                    firstName: telegramUser.first_name || null,
                    lastName: telegramUser.last_name || null,
                    referralCode: `ref_${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
                    referredById: referredById,
                    wallet: {
                        create: { balance: 0.0 }
                    }
                },
                include: { wallet: true }
            });

            // Update Daily login
        } else {
            user = await this.prisma.user.update({
                where: { id: user.id },
                data: { lastLogin: new Date() },
                include: { wallet: true }
            });
        }

        // Convert BigInt to string before sending JSON response
        const safeUser = JSON.parse(JSON.stringify(user, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));

        return {
            message: 'Login successful',
            user: safeUser,
            wallet: safeUser.wallet,
            token: 'generate_jwt_here_later_if_needed_for_web_admin' // TMA uses initData natively as stateless token
        };
    }
}
