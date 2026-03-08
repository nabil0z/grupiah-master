require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function wipeForLaunch() {
    console.log('⚠️  GRUPIAH DATABASE WIPE FOR LAUNCH');
    console.log('====================================\n');

    // Show what will be PRESERVED
    const configs = await prisma.platformConfig.count();
    const tasks = await prisma.task.count();
    console.log(`✅ AKAN DIPERTAHANKAN:`);
    console.log(`   - PlatformConfig: ${configs} pengaturan`);
    console.log(`   - Custom Tasks: ${tasks} tugas\n`);

    // Show what will be DELETED
    const users = await prisma.user.count();
    console.log(`🗑️  AKAN DIHAPUS:`);
    console.log(`   - Users: ${users}`);
    console.log(`   - Dan SEMUA data terkait (wallet, mutasi, withdrawal, dll)\n`);

    // Countdown
    console.log('⏳ Menghapus dalam 5 detik... (CTRL+C untuk batal)');
    await new Promise(r => setTimeout(r, 5000));

    console.log('\n🔄 Proses penghapusan dimulai...\n');

    // Order matters! Delete child tables first (foreign key constraints)
    const del1 = await prisma.userOfferClick.deleteMany();
    console.log(`   ✓ UserOfferClick: ${del1.count} dihapus`);

    const del2 = await prisma.userBadge.deleteMany();
    console.log(`   ✓ UserBadge: ${del2.count} dihapus`);

    const del3 = await prisma.userBoost.deleteMany();
    console.log(`   ✓ UserBoost: ${del3.count} dihapus`);

    const del4 = await prisma.userTask.deleteMany();
    console.log(`   ✓ UserTask: ${del4.count} dihapus`);

    const del5 = await prisma.walletMutation.deleteMany();
    console.log(`   ✓ WalletMutation: ${del5.count} dihapus`);

    const del6 = await prisma.withdrawal.deleteMany();
    console.log(`   ✓ Withdrawal: ${del6.count} dihapus`);

    const del7 = await prisma.wallet.deleteMany();
    console.log(`   ✓ Wallet: ${del7.count} dihapus`);

    const del8 = await prisma.user.deleteMany();
    console.log(`   ✓ User: ${del8.count} dihapus`);

    const del9 = await prisma.offerScore.deleteMany();
    console.log(`   ✓ OfferScore: ${del9.count} dihapus`);

    const del10 = await prisma.offerCompletion.deleteMany();
    console.log(`   ✓ OfferCompletion: ${del10.count} dihapus`);

    const del11 = await prisma.fakeWithdrawHistory.deleteMany();
    console.log(`   ✓ FakeWithdrawHistory: ${del11.count} dihapus`);

    const del12 = await prisma.auditLog.deleteMany();
    console.log(`   ✓ AuditLog: ${del12.count} dihapus`);

    const del13 = await prisma.badge.deleteMany();
    console.log(`   ✓ Badge: ${del13.count} dihapus`);

    console.log('\n====================================');
    console.log(`✅ WIPE SELESAI!`);
    console.log(`📋 Custom Tasks & Settings TIDAK DIHAPUS.`);
    console.log(`🚀 Database siap untuk launch!\n`);
}

wipeForLaunch()
    .catch(e => { console.error('❌ ERROR:', e); process.exit(1); })
    .finally(() => prisma.$disconnect());
