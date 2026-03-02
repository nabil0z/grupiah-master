import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, ChevronRight, Flame, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authApi, userApi, tasksApi } from '../api/client';
import { Users } from 'lucide-react';

const TARGET_WITHDRAWAL = 500000; // Rp 500.000

const FlashSalePage = () => {
    const [timeLeft, setTimeLeft] = useState(14500); // approx 4 hours
    const [balance, setBalance] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(true);
    const [tasks, setTasks] = useState<any[]>([]);
    const [onlineUsers, setOnlineUsers] = useState(12435);
    const navigate = useNavigate();

    // Flash Sale Countdown & Auth Simulator
    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        // Boot Sequence: Login -> Fetch Profile
        const bootAuth = async () => {
            try {
                // We send empty startParam here, but ideally we extract it from URL in App.tsx
                await authApi.login();
                const [profileInfo, tasksData] = await Promise.all([
                    userApi.getProfile(),
                    tasksApi.getAvailable()
                ]);
                setBalance(Number(profileInfo.wallet?.balance || 0));
                setTasks(tasksData);
            } catch (error) {
                console.error('Failed to boot auth:', error);
                setBalance(0); // Fallback to mock text if API fails
            } finally {
                setIsLoading(false);
            }
        };

        bootAuth();

        // Fake Online Users Randomizer (9k - 15k)
        const onlineInterval = setInterval(() => {
            setOnlineUsers(prev => {
                const fluctuation = Math.floor(Math.random() * 201) - 100; // -100 to +100
                let newTotal = prev + fluctuation;
                if (newTotal < 9000) newTotal = 9000 + Math.random() * 200;
                if (newTotal > 15000) newTotal = 15000 - Math.random() * 200;
                return Math.floor(newTotal);
            });
        }, 3500);

        return () => {
            clearInterval(timer);
            clearInterval(onlineInterval);
        }
    }, []);

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const progress = (balance / TARGET_WITHDRAWAL) * 100;

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

                {/* Profile Link Overlay */}
                <div className="absolute top-4 right-5 bg-black/10 hover:bg-black/20 transition-colors p-2 rounded-full cursor-pointer z-20 backdrop-blur-sm border border-white/10" onClick={() => navigate('/settings')}>
                    <Settings size={20} className="text-white opacity-80" />
                </div>

                {/* E-commerce Progress Bar (The Impossible Hurdle) */}
                <div className="mt-6 bg-white/20 rounded-2xl p-4 backdrop-blur-sm border border-white/20">
                    <div className="flex justify-between text-xs font-medium mb-2">
                        <span>Progress Withdraw</span>
                        <span>Rp {TARGET_WITHDRAWAL.toLocaleString('id-ID')}</span>
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

            {/* Telegram Star Boost Banner */}
            <div className="px-5 -mt-6 mb-6 relative z-20">
                <motion.div
                    onClick={() => navigate('/boost')}
                    whileTap={{ scale: 0.98 }}
                    className="bg-gradient-to-r from-indigo-900 to-violet-800 rounded-2xl p-4 shadow-lg border border-indigo-700/50 flex items-center justify-between cursor-pointer"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/20">
                            <span className="text-2xl">⭐</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-sm">Telegram Stars Boost</h3>
                            <p className="text-indigo-200 text-xs mt-0.5">Pendapatan Task <strong>2x Lipat</strong>!</p>
                        </div>
                    </div>
                    <div className="bg-white text-indigo-900 text-xs font-black px-4 py-2 rounded-full shadow-md">
                        Mulai
                    </div>
                </motion.div>
            </div>

            {/* 1.5. Ad Provider Banner Space (e.g Monetag, Adsterra, PropellerAds) */}
            <div className="px-5 mb-6 relative z-20">
                <div className="bg-slate-200 w-full h-16 sm:h-20 rounded-xl flex flex-col items-center justify-center border border-slate-300 shadow-inner relative overflow-hidden group cursor-pointer">
                    <span className="text-slate-400 text-xs font-bold font-mono tracking-widest mb-1 shadow-sm">ADVERTISEMENT</span>
                    <span className="text-slate-500 text-[10px] italic group-hover:opacity-0 transition-opacity">Space for Monetag / Adsterra Banner</span>
                    <div className="absolute inset-0 bg-blue-500/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-blue-600 text-xs font-bold">Tempat Pasang Script Iklan Banner 320x50</span>
                    </div>
                </div>
            </div>

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
                            <p className="text-center text-sm text-gray-400 py-4">Memuat tugas...</p>
                        ) : (tasks.length > 0 ? tasks.slice(0, 3) : [
                            { id: 'm1', title: 'Main Rise of Kingdoms', reward: 50000, currentQuota: 12 },
                            { id: 'm2', title: 'Daftar & Verifikasi Bank Jago', reward: 75000, currentQuota: 8 },
                            { id: 'm3', title: 'Follow Instagram Grupiah', reward: 15000, currentQuota: 3 }
                        ]).map((task) => {
                            const fakeOldPrice = (Number(task.reward) * 1.5).toLocaleString('id-ID'); // Make the current reward look like a big discount
                            return (
                                <motion.div
                                    key={task.id}
                                    whileTap={{ scale: 0.98 }}
                                    className="flex items-center p-3 rounded-xl border border-gray-100 bg-gray-50/50 relative overflow-hidden group"
                                >
                                    {/* Discount Tag */}
                                    <div className="absolute top-0 right-0 bg-[var(--color-flash-red)] text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg">
                                        HOT
                                    </div>

                                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-3 shrink-0">
                                        {task.iconUrl ? (
                                            <img src={task.iconUrl} alt="icon" className="w-8 h-8 rounded-md" />
                                        ) : (
                                            <span className="text-2xl">🎮</span>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0 pr-2">
                                        <h3 className="text-sm font-bold text-gray-900 truncate">{task.title}</h3>
                                        <div className="flex items-center mt-1">
                                            <span className="text-xs text-gray-400 line-through mr-1.5">Rp {fakeOldPrice}</span>
                                            <span className="text-sm font-extrabold flash-gradient-text">Rp {Number(task.reward).toLocaleString('id-ID')}</span>
                                        </div>
                                        <div className="w-2/3 bg-gray-200 rounded-full h-1.5 mt-2">
                                            <div className="bg-[var(--color-flash-red)] h-1.5 rounded-full" style={{ width: `${80 + Math.random() * 15}%` }}></div>
                                        </div>
                                        <p className="text-[9px] text-gray-500 mt-1">Tersedia untuk {task.currentQuota || '20+'} orang lagi!</p>
                                    </div>

                                    <button
                                        onClick={() => navigate('/earn')}
                                        className="bg-gradient-to-r from-[var(--color-flash-orange)] to-[var(--color-flash-red)] text-white text-xs font-bold px-4 py-2 rounded-full shadow-md hover:shadow-lg transition-all shrink-0"
                                    >
                                        KLAIM
                                    </button>
                                </motion.div>
                            )
                        })}
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
