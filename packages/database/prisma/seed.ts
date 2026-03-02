import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seeding...');

    const defaultConfigs = [
        { key: 'GLOBAL_OFFER_MULTIPLIER', value: '1' },       // Default 1x (No manipulation)
        { key: 'REFERRAL_REWARD_AMOUNT', value: '150000' },   // Default Rp 150.000
        { key: 'INVITER_BONUS', value: '2000' },              // Task completion bonus for inviter
        { key: 'INVITEE_BONUS', value: '1000' },              // Task completion bonus for invitee
        { key: 'FAKE_WITHDRAW_MIN_AMOUNT', value: '1000000' },
        { key: 'FAKE_WITHDRAW_MAX_AMOUNT', value: '5000000' },
        { key: 'DAILY_LOGIN_REWARDS', value: JSON.stringify([5000, 10000, 15000, 25000, 35000, 50000, 100000]) },
    ];

    for (const config of defaultConfigs) {
        await prisma.platformConfig.upsert({
            where: { key: config.key },
            update: {},
            create: config,
        });
        console.log(`✅ Seeded config: ${config.key} = ${config.value}`);
    }

    console.log('✅ Seeding completed!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
