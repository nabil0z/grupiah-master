import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WithdrawStatus } from '@grupiah/database';

@Injectable()
export class AdminService {
    constructor(private prisma: PrismaService) { }
    async approveWithdrawalByPartner(withdrawalId: string, adminTelegramId: number) {
        // 1. Prisma Query: update Withdrawal status to 'PAID'
        const updated = await this.prisma.withdrawal.update({
            where: { id: withdrawalId },
            data: { status: WithdrawStatus.PAID, processedBy: adminTelegramId.toString() }
        });

        // 2. Insert into AuditLog table (ActorType: 'ADMIN')
        await this.prisma.auditLog.create({
            data: {
                actorId: adminTelegramId.toString(),
                actorType: 'ADMIN',
                action: 'WITHDRAWAL_APPROVED',
                entityType: 'Withdrawal',
                entityId: withdrawalId,
                changes: JSON.stringify({ previous: 'PENDING', new: 'PAID' })
            }
        });

        // 3. (Future) Trigger Xendit/Flip Disbursement API

        return {
            status: 'success',
            message: `Withdrawal ${withdrawalId} approved by Admin ${adminTelegramId}`,
            data: updated
        };
    }

    async rejectWithdrawalByPartner(withdrawalId: string, adminTelegramId: number) {
        return await this.prisma.$transaction(async (tx) => {
            const withdrawal = await tx.withdrawal.findUnique({
                where: { id: withdrawalId },
                include: { user: { include: { wallet: true } } }
            });

            if (!withdrawal || withdrawal.status !== WithdrawStatus.PENDING) {
                throw new Error('Withdrawal not found or not PENDING');
            }

            // 1. Update status to REJECTED
            const updated = await tx.withdrawal.update({
                where: { id: withdrawalId },
                data: { status: WithdrawStatus.REJECTED, processedBy: adminTelegramId.toString() }
            });

            // 2. Refund User Wallet Balance
            const walletId = withdrawal.user.wallet?.id;
            if (walletId) {
                await tx.wallet.update({
                    where: { id: walletId },
                    data: { balance: { increment: withdrawal.amount } }
                });

                // 3. Log Refund Mutation
                await tx.walletMutation.create({
                    data: {
                        walletId: walletId,
                        amount: withdrawal.amount,
                        type: 'ADMIN_ADJUSTMENT',
                        description: `Refund for Rejected Withdrawal ${withdrawalId}`
                    }
                });
            }

            // 4. Audit Log
            await tx.auditLog.create({
                data: {
                    actorId: adminTelegramId.toString(),
                    actorType: 'ADMIN',
                    action: 'WITHDRAWAL_REJECTED',
                    entityType: 'Withdrawal',
                    entityId: withdrawalId,
                    changes: JSON.stringify({ reason: 'Admin Rejected and Refunded' })
                }
            });

            return {
                status: 'success',
                message: `Withdrawal ${withdrawalId} REJECTED by Admin. Balance refunded.`,
                data: updated
            };
        });
    }

    async generateFakeFeed(amount: number, method: string) {
        const masks = ['budi_***', 'indah***', '0812****901', 'raja****', 'agung_**', 'dian***'];
        const randomMask = masks[Math.floor(Math.random() * masks.length)];

        // Prisma Query: insert FakeWithdrawHistory 
        const fakeRecord = await this.prisma.fakeWithdrawHistory.create({
            data: {
                maskedUsername: randomMask,
                amount,
                method
            }
        });

        return {
            success: true,
            fakeRecord
        };
    }

    async getPendingList() {
        return this.prisma.withdrawal.findMany({
            where: { status: WithdrawStatus.PENDING },
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { firstName: true, telegramId: true } } } // Include minimal user data for admin review
        });
    }

    async getUsersList() {
        return this.prisma.user.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                wallet: { select: { balance: true } }
            }
        });
    }

    async toggleUserBan(userId: string, adminTelegramId: number) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new Error('User not found');

        const newBanStatus = !user.isBanned;

        const updated = await this.prisma.user.update({
            where: { id: userId },
            data: { isBanned: newBanStatus }
        });

        await this.prisma.auditLog.create({
            data: {
                actorId: adminTelegramId.toString(),
                actorType: 'ADMIN',
                action: newBanStatus ? 'USER_BANNED' : 'USER_UNBANNED',
                entityType: 'User',
                entityId: userId,
                changes: JSON.stringify({ isBanned: newBanStatus })
            }
        });

        return updated;
    }

    async getPendingCustomTasks() {
        return this.prisma.userTask.findMany({
            where: {
                status: 'PENDING',
                task: { type: 'MANUAL' }
            },
            include: {
                user: { select: { username: true, telegramId: true } },
                task: { select: { title: true, reward: true } }
            },
            orderBy: { createdAt: 'asc' }
        });
    }

    async reviewCustomTask(userTaskId: string, action: 'APPROVE' | 'REJECT', adminTelegramId: number) {
        return await this.prisma.$transaction(async (tx) => {
            const userTask = await tx.userTask.findUnique({
                where: { id: userTaskId },
                include: { task: true, user: { include: { wallet: true } } }
            });

            if (!userTask || userTask.status !== 'PENDING') {
                throw new Error('UserTask not found or not PENDING');
            }

            // 1. Update Status
            const newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
            const updated = await tx.userTask.update({
                where: { id: userTaskId },
                data: { status: newStatus as any }
            });

            // 2. Give Reward if Approved
            if (action === 'APPROVE') {
                const rewardAmount = userTask.reward || userTask.task.reward;
                const walletId = userTask.user.wallet?.id;

                if (walletId) {
                    await tx.wallet.update({
                        where: { id: walletId },
                        data: { balance: { increment: rewardAmount } }
                    });

                    await tx.walletMutation.create({
                        data: {
                            walletId: walletId,
                            amount: rewardAmount,
                            type: 'EARN',
                            description: `Approved Manual Task: ${userTask.task.title}`
                        }
                    });
                }
            }

            // 3. Audit Log
            await tx.auditLog.create({
                data: {
                    actorId: adminTelegramId.toString(),
                    actorType: 'ADMIN',
                    action: action === 'APPROVE' ? 'MANUAL_TASK_APPROVED' : 'MANUAL_TASK_REJECTED',
                    entityType: 'UserTask',
                    entityId: userTaskId,
                    changes: JSON.stringify({ previous: 'PENDING', new: newStatus })
                }
            });

            return {
                status: 'success',
                message: `UserTask ${userTaskId} ${newStatus}`,
                data: updated
            };
        });
    }

    async createCustomTask(title: string, description: string, reward: number, adminTelegramId: number) {
        const newTask = await this.prisma.task.create({
            data: {
                provider: 'CUSTOM',
                title,
                description,
                reward,
                type: 'MANUAL',
                isActive: true
            }
        });

        await this.prisma.auditLog.create({
            data: {
                actorId: adminTelegramId.toString(),
                actorType: 'ADMIN',
                action: 'MANUAL_TASK_CREATED',
                entityType: 'Task',
                entityId: newTask.id,
                changes: JSON.stringify({ title, reward })
            }
        });

        return newTask;
    }
}
