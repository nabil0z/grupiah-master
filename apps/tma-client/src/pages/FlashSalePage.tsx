import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, ChevronRight, Flame, Settings, Gift, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authApi, userApi, tasksApi } from '../api/client';
import { useWallet } from '../contexts/WalletContext';
import { Users, Loader2 } from 'lucide-react';

const FlashSalePage = () => {
    const [timeLeft, setTimeLeft] = useState(14500); // approx 4 hours
    const { balance } = useWallet();
    const [targetWithdrawal, setTargetWithdrawal] = useState<number>(500000);
    const [isLoading, setIsLoading] = useState(true);
    const [tasks, setTasks] = useState<any[]>([]);
    const [fetchError, setFetchError] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState(0);
    const [bannerConfig, setBannerConfig] = useState<{ imageUrl: string, linkUrl: string }>({ imageUrl: '', linkUrl: '' });
    const [referralBonus, setReferralBonus] = useState<{ show: boolean, amount: number }>({ show: false, amount: 0 });
    const navigate = useNavigate();

    // Flash Sale Countdown & Auth Simulator
    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        // Fetch Online Stats
        import('../api/client').then(({ miscApi }) => {
            miscApi.getOnlineStats()
                .then(data => setOnlineUsers(data.onlineCount || 0))
                .catch(err => console.error("Failed to fetch online stats:", err));
        });

        // Boot Sequence: Login -> Fetch Profile + Flash Tasks with Auto-Retry
        const bootAuth = async () => {
            try {
                await authApi.login();

                // Fetch profile immediately (don't wait for flash tasks)
                userApi.getProfile().then(profile => {
                    setTargetWithdrawal(Number(profile?.appConfig?.minWithdraw || 500000));
                    if (profile?.appConfig?.bannerImageUrl) {
                        setBannerConfig({
                            imageUrl: profile.appConfig.bannerImageUrl,
                            linkUrl: profile.appConfig.bannerLinkUrl || ''
                        });
                    }
                    // Show referral bonus bar for invited users who haven't completed first task
                    if (profile?.referredById && !profile?.isReferralActive) {
                        setReferralBonus({
                            show: true,
                            amount: Number(profile?.appConfig?.refDownline || 250)
                        });
                    }
                }).catch(() => { });

                // Auto-retry flash tasks up to 3 times with 3s delay
                const MAX_RETRIES = 3;
                for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                    try {
                        console.log(`[FlashSalePage] Fetching flash tasks (attempt ${attempt}/${MAX_RETRIES})...`);
                        const data = await tasksApi.getFlashTasks(attempt > 1); // force refresh on retry
                        if (Array.isArray(data) && data.length > 0) {
                            setTasks(data);
                            setIsLoading(false);
                            return; // Success! Exit early
                        }
                    } catch (err) {
                        console.warn(`[FlashSalePage] Attempt ${attempt} failed:`, err);
                    }
                    // Wait 3 seconds before retrying (unless it's the last attempt)
                    if (attempt < MAX_RETRIES) {
                        await new Promise(r => setTimeout(r, 3000));
                    }
                }
                // All retries exhausted
                console.error('[FlashSalePage] All retry attempts exhausted');
                setFetchError(true);
            } catch (error) {
                console.error('Failed to boot auth:', error);
                setFetchError(true);
            } finally {
                setIsLoading(false);
            }
        };

        bootAuth();

        return () => {
            clearInterval(timer);
        }
    }, []);

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const progress = (balance / targetWithdrawal) * 100;

    return (
        <div className="min-h-screen bg-gray-50 pb-24">

            {/* 1. E-Commerce Style Header Banner */}
            <div className="flash-gradient-bg px-5 pt-8 pb-12 rounded-b-[2rem] text-white shadow-lg relative overflow-hidden">
                {/* Decorative Circles */}
                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
                <div className="absolute bottom-0 left-0 -ml-12 -mb-12 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl"></div>

                <div className="flex justify-between items-start relative z-10">
                    <div>
                        <p className="text-white/80 text-sm font-medium mb-1">Saldo Tersedia</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-xl font-bold">Rp</span>
                            <motion.h1
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="text-4xl font-extrabold tracking-tight"
                            >
                                {isLoading ? '...' : balance.toLocaleString('id-ID')}
                            </motion.h1>
                        </div>
                    </div>
                </div>

                {/* Settings Link Overlay */}
                <div className="absolute top-4 right-5 flex gap-2 z-20">
                    <div className="bg-black/10 hover:bg-black/20 transition-colors p-2 rounded-full cursor-pointer backdrop-blur-sm border border-white/10" onClick={() => navigate('/settings')}>
                        <Settings size={20} className="text-white opacity-80" />
                    </div>
                </div>

                {/* E-commerce Progress Bar (The Impossible Hurdle) */}
                <div className="mt-6 bg-white/20 rounded-2xl p-4 backdrop-blur-sm border border-white/20">
                    <div className="flex justify-between text-xs font-medium mb-2">
                        <span>Progress Withdraw</span>
                        <span>Rp {targetWithdrawal.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="w-full bg-black/20 rounded-full h-3 mb-1 overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                            className="bg-gradient-to-r from-yellow-300 to-[#FFD100] h-3 rounded-full relative"
                        >
                            <div className="absolute top-0 right-0 bottom-0 left-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMikiIHN0cm9rZS13aWR0aD0iNCIgZmlsbD0ibm9uZSI+PHBhdGggZD0iTTAgNDBMMDAgME00MCA0MEwwIDBMMDAgME0wIDQwTDQwIDAiLz48L2c+PC9zdmc+')] opacity-50"></div>
                        </motion.div>
                    </div>
                    <p className="text-[10px] text-white/90 text-center mt-2">
                        🔥 Selesaikan <strong className="text-yellow-300">5 Tugas Lagi</strong> untuk membuka brankas!
                    </p>
                </div>
            </div>

            {/* Referral Bonus Announcement Bar */}
            {referralBonus.show && (
                <div className="px-5 -mt-5 mb-4 relative z-20">
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-3.5 shadow-md flex items-center gap-3 relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-20 h-20 bg-white opacity-10 rounded-full -mr-6 -mt-6 blur-lg"></div>
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm shrink-0">
                            <Gift size={22} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-white font-bold text-xs">🎁 Bonus Referral Aktif!</p>
                            <p className="text-white/90 text-[10px] mt-0.5 leading-tight">
                                Selesaikan 1 tugas pertama → kamu dapat <strong>+Rp {referralBonus.amount.toLocaleString('id-ID')}</strong> bonus!
                            </p>
                        </div>
                        <button onClick={() => setReferralBonus(prev => ({ ...prev, show: false }))} className="text-white/60 hover:text-white p-1 shrink-0">
                            <X size={16} />
                        </button>
                    </motion.div>
                </div>
            )}

            {/* Telegram Star Boost Banner */}
            <div className="px-5 -mt-6 mb-6 relative z-20">
                <motion.div
                    onClick={() => navigate('/boost')}
                    whileTap={{ scale: 0.97 }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-gradient-to-br from-indigo-900 via-purple-900 to-violet-800 rounded-2xl p-4 shadow-lg border border-indigo-500/30 cursor-pointer relative overflow-hidden"
                >
                    {/* Decorative glow */}
                    <div className="absolute -top-6 -right-6 w-24 h-24 bg-yellow-400/15 rounded-full blur-2xl"></div>
                    <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-indigo-400/20 rounded-full blur-xl"></div>

                    <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-yellow-400/20 to-amber-500/20 rounded-xl flex items-center justify-center backdrop-blur-sm border border-yellow-400/30">
                                <span className="text-2xl">⭐</span>
                            </div>
                            <div>
                                <h3 className="font-black text-white text-sm">Telegram Stars Boost</h3>
                                <p className="text-indigo-200 text-[11px] mt-0.5">Pendapatan hingga <strong className="text-yellow-300">10x Lipat</strong> + Min WD turun!</p>
                            </div>
                        </div>
                        <div className="bg-white text-indigo-900 text-[11px] font-black px-3.5 py-2 rounded-full shadow-md shrink-0">
                            Lihat ⭐
                        </div>
                    </div>

                    {/* Mini tier badges */}
                    <div className="flex gap-2 mt-3 relative z-10">
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-700/30 text-amber-300 border border-amber-600/30">🥉 X2 · 50⭐</span>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-400/20 text-slate-200 border border-slate-400/30">🥈 X5 · 200⭐</span>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-300 border border-yellow-400/30">🥇 X10 · 500⭐</span>
                    </div>
                </motion.div>
            </div>

            {/* 1.5. Dynamic Banner from Admin Settings */}
            {bannerConfig.imageUrl && (
                <div className="px-5 mb-6 relative z-20">
                    <motion.div
                        whileTap={{ scale: 0.98 }}
                        onClick={() => bannerConfig.linkUrl && window.open(bannerConfig.linkUrl, '_blank')}
                        className={`w-full rounded-xl overflow-hidden shadow-sm border border-gray-100 ${bannerConfig.linkUrl ? 'cursor-pointer' : ''}`}
                    >
                        <img
                            src={bannerConfig.imageUrl}
                            alt="Promo Banner"
                            className="w-full h-auto object-cover rounded-xl"
                            style={{ maxHeight: '120px', objectFit: 'cover' }}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                    </motion.div>
                </div>
            )}

            {/* 2. Flash Sale Section */}
            <div className="px-5 relative z-20">
                <div className="flex items-center justify-between mb-3 px-1 text-slate-500 text-xs font-semibold">
                    <div className="flex items-center gap-1.5 bg-green-100 text-emerald-600 px-2 py-1 rounded-full border border-emerald-200 shadow-sm transition-all">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <Users size={12} />
                        {onlineUsers.toLocaleString('id-ID')} Users Online
                    </div>
                    <p>Kuota Terbatas!</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Flame size={20} className="text-[var(--color-flash-red)] animate-pulse" fill="currentColor" />
                            <h2 className="text-lg font-bold text-gray-900">FLASH TASK</h2>
                        </div>
                        <div className="flex items-center gap-1.5 bg-red-50 text-[var(--color-flash-red)] px-2.5 py-1 rounded-lg border border-red-100">
                            <Clock size={14} />
                            <span className="text-xs font-bold font-mono">{formatTime(timeLeft)}</span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-10 space-y-3">
                                <Loader2 className="w-8 h-8 text-[var(--color-flash-red)] animate-spin" />
                                <p className="text-sm font-medium text-gray-500 animate-pulse">Mencari tugas terbaik...</p>
                            </div>
                        ) : tasks.length > 0 ? (
                            tasks.slice(0, 3).map((task: any, index: number) => {
                                const rewardNum = Number(task.reward) || 0;
                                const bonusPercent = index === 0 ? 50 : index === 1 ? 30 : 20;
                                const displayQuota = index === 0 ? 3 : index === 1 ? 8 : 12;

                                return (
                                    <motion.div
                                        key={`flash-task-${task.id || task.externalId || index}`}
                                        whileTap={{ scale: 0.98 }}
                                        className="flex items-center p-3 rounded-xl border border-gray-100 bg-gray-50/50 relative overflow-hidden group"
                                    >
                                        {/* Bonus Tag */}
                                        <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg">
                                            +{bonusPercent}% BONUS
                                        </div>

                                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-3 shrink-0">
                                            {task.iconUrl || task.logoUrl ? (
                                                <img src={task.iconUrl || task.logoUrl} alt="icon" className="w-8 h-8 rounded-md" />
                                            ) : (
                                                <span className="text-2xl">🎮</span>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0 pr-2">
                                            <h3 className="text-sm font-bold text-gray-900 truncate">{task.title}</h3>
                                            <div className="flex items-center gap-1.5 mt-1">
                                                <span className="text-sm font-extrabold flash-gradient-text">+ Rp {rewardNum.toLocaleString('id-ID')}</span>
                                                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">🔥 High Pay</span>
                                            </div>
                                            <div className="w-2/3 bg-gray-200 rounded-full h-1.5 mt-2">
                                                <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${80 + Math.random() * 15}%` }}></div>
                                            </div>
                                            <p className="text-[9px] text-gray-500 mt-1">Tersedia untuk {displayQuota} orang lagi!</p>
                                        </div>

                                        <button
                                            onClick={() => navigate('/earn')}
                                            className="bg-gradient-to-r from-[var(--color-flash-orange)] to-[var(--color-flash-red)] text-white text-xs font-bold px-4 py-2 rounded-full shadow-md hover:shadow-lg transition-all shrink-0"
                                        >
                                            KLAIM
                                        </button>
                                    </motion.div>
                                )
                            })
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 space-y-3">
                                <p className="text-sm text-gray-500">{fetchError ? 'Gagal memuat task. Coba lagi.' : 'Tidak ada task tersedia saat ini.'}</p>
                                <button
                                    onClick={async () => {
                                        setIsLoading(true);
                                        setFetchError(false);
                                        try {
                                            const data = await tasksApi.getFlashTasks(true);
                                            if (Array.isArray(data) && data.length > 0) {
                                                setTasks(data);
                                            } else {
                                                setFetchError(true);
                                            }
                                        } catch {
                                            setFetchError(true);
                                        } finally {
                                            setIsLoading(false);
                                        }
                                    }}
                                    className="bg-gradient-to-r from-[var(--color-flash-orange)] to-[var(--color-flash-red)] text-white text-xs font-bold px-6 py-2 rounded-full shadow-md"
                                >
                                    🔄 Muat Ulang
                                </button>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => navigate('/earn')}
                        className="w-full mt-4 flex items-center justify-center gap-1 text-sm font-bold text-[var(--color-flash-orange)] py-2 hover:bg-orange-50 rounded-lg transition-colors">
                        Lihat Semua Task <ChevronRight size={16} />
                    </button>
                </div>
            </div>

        </div>
    );
};

export default FlashSalePage;
