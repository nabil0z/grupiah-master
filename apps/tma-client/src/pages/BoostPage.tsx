import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Zap, Rocket, Clock, Star, Check, Crown, ChevronRight, Loader2, Shield, Users, TrendingUp } from 'lucide-react';
import { userApi } from '../api/client';

interface BoostInfo {
    multiplierRate: number;
    expiresAt: string;
    purchasedStar: number;
}

const PACKAGES = [
    {
        tier: 'Bronze',
        emoji: '🥉',
        multiplier: 2,
        stars: 50,
        duration: '24 jam',
        gradient: 'from-amber-700 via-amber-600 to-yellow-700',
        headerGradient: 'from-amber-800 to-amber-600',
        borderColor: 'border-amber-400/50',
        activeBorder: 'border-amber-400 ring-2 ring-amber-300/50',
        iconBg: 'bg-amber-500/20',
        priceColor: 'text-amber-300',
        tagline: 'Mulai dari sini! Gandakan semua pendapatan selama 24 jam.',
        benefits: [
            { icon: TrendingUp, text: 'Pendapatan X2', highlight: true },
            { icon: Star, text: 'Daily Login reward X2', highlight: false },
            { icon: TrendingUp, text: 'Min WD → Rp 500.000', highlight: false },
        ],
    },
    {
        tier: 'Silver',
        emoji: '🥈',
        multiplier: 5,
        stars: 200,
        duration: '3 hari',
        gradient: 'from-slate-600 via-blue-700 to-indigo-700',
        headerGradient: 'from-blue-800 to-indigo-700',
        borderColor: 'border-blue-400/50',
        activeBorder: 'border-blue-400 ring-2 ring-blue-300/50',
        iconBg: 'bg-blue-500/20',
        priceColor: 'text-blue-300',
        badge: '⭐ POPULER',
        tagline: 'Favorit grinder serius. 5X cuan + streak aman walau skip sehari.',
        benefits: [
            { icon: TrendingUp, text: 'Pendapatan X5', highlight: true },
            { icon: Star, text: 'Daily Login reward X5', highlight: false },
            { icon: TrendingUp, text: 'Min WD → Rp 250.000', highlight: true },
            { icon: Users, text: 'Referral bonus X2', highlight: false },
            { icon: Shield, text: 'Streak Protection', highlight: false },
        ],
    },
    {
        tier: 'Gold',
        emoji: '🥇',
        multiplier: 10,
        stars: 500,
        duration: '7 hari',
        gradient: 'from-yellow-600 via-amber-500 to-orange-500',
        headerGradient: 'from-yellow-600 to-amber-500',
        borderColor: 'border-yellow-400/60',
        activeBorder: 'border-yellow-400 ring-2 ring-yellow-300/60',
        iconBg: 'bg-yellow-400/20',
        priceColor: 'text-yellow-300',
        badge: '🔥 BEST VALUE',
        isGold: true,
        tagline: 'Paket SULTAN. 10X pendapatan, WD mulai Rp 100rb, dan WD prioritas!',
        benefits: [
            { icon: TrendingUp, text: 'Pendapatan X10', highlight: true },
            { icon: Star, text: 'Daily Login reward X10', highlight: false },
            { icon: TrendingUp, text: 'Min WD → Rp 100.000', highlight: true },
            { icon: Users, text: 'Referral bonus X3', highlight: false },
            { icon: Shield, text: 'Streak Protection', highlight: false },
            { icon: Zap, text: 'Fast Withdrawal — prioritas!', highlight: true },
        ],
    },
];

export default function BoostPage() {
    const navigate = useNavigate();
    const [activeBoost, setActiveBoost] = useState<BoostInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [buyingTier, setBuyingTier] = useState<number | null>(null);

    useEffect(() => {
        const fetchBoost = async () => {
            try {
                const data = await userApi.getActiveBoost();
                setActiveBoost(data);
            } catch (err) {
                console.error("No active boost", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchBoost();
    }, []);

    const handleBuyBoost = async (multiplier: number, stars: number) => {
        setBuyingTier(multiplier);
        try {
            const result = await userApi.buyBoost({ multiplierRate: multiplier, purchasedStar: stars });

            if (result.invoiceUrl && window.Telegram?.WebApp) {
                window.Telegram.WebApp.openInvoice(result.invoiceUrl, async (status: string) => {
                    if (status === 'paid') {
                        try {
                            const data = await userApi.getActiveBoost();
                            setActiveBoost(data);
                        } catch {
                            setTimeout(async () => {
                                try {
                                    const data = await userApi.getActiveBoost();
                                    setActiveBoost(data);
                                } catch { }
                            }, 2000);
                        }
                        alert(`🎉 Pembayaran Berhasil! Boost X${multiplier} sudah aktif.`);
                    } else if (status === 'failed') {
                        alert('Pembayaran gagal. Silakan coba lagi.');
                    }
                });
            }
        } catch (err: any) {
            console.error('Buy boost error:', err);
            alert('Gagal memproses boost. Coba lagi nanti.');
        } finally {
            setBuyingTier(null);
        }
    };

    const getTimeRemaining = (expiresAt: string) => {
        const diff = new Date(expiresAt).getTime() - Date.now();
        if (diff <= 0) return 'Expired';
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        if (hours >= 24) {
            const days = Math.floor(hours / 24);
            return `${days} hari ${hours % 24} jam`;
        }
        return `${hours} jam ${mins} menit`;
    };

    const getBoostProgress = () => {
        if (!activeBoost) return 0;
        const pkg = PACKAGES.find(p => p.multiplier === activeBoost.multiplierRate);
        if (!pkg) return 0;
        const durationMs = pkg.duration.includes('7') ? 7 * 24 * 3600000 : pkg.duration.includes('3') ? 3 * 24 * 3600000 : 24 * 3600000;
        const expiresMs = new Date(activeBoost.expiresAt).getTime();
        const startMs = expiresMs - durationMs;
        const elapsed = Date.now() - startMs;
        return Math.min(100, Math.max(0, (elapsed / durationMs) * 100));
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            {/* Header */}
            <div className="bg-gradient-to-br from-indigo-950 via-purple-900 to-violet-900 pt-6 pb-12 px-5 relative overflow-hidden">
                {/* Animated background elements */}
                <div className="absolute inset-0">
                    <div className="absolute top-6 right-8 opacity-[0.07]"><Star size={70} /></div>
                    <div className="absolute bottom-8 left-12 opacity-[0.07]"><Zap size={50} /></div>
                    <div className="absolute top-16 left-28 opacity-[0.05]"><Crown size={35} /></div>
                    <div className="absolute -top-8 -right-8 w-32 h-32 bg-yellow-400/10 rounded-full blur-3xl"></div>
                    <div className="absolute -bottom-4 -left-8 w-24 h-24 bg-indigo-400/15 rounded-full blur-2xl"></div>
                </div>

                <button onClick={() => navigate(-1)} className="text-white/60 hover:text-white mb-5 flex items-center gap-1 text-sm font-medium relative z-10 transition-colors">
                    <ArrowLeft size={16} /> Kembali
                </button>

                <div className="text-center relative z-10">
                    <motion.h1
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-2xl font-black text-white tracking-tight"
                    >
                        ⚡ Telegram Stars Boost
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.15 }}
                        className="text-indigo-200/80 text-sm mt-2 max-w-xs mx-auto leading-relaxed"
                    >
                        Tingkatkan pendapatan, turunkan batas WD, dan unlock benefit eksklusif.
                    </motion.p>
                </div>
            </div>

            <div className="px-4 -mt-6 relative z-10 space-y-4">
                {/* Active Boost Status */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className={`rounded-2xl p-4 shadow-sm border-2 ${activeBoost ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-300' : 'bg-white border-gray-100'}`}
                >
                    <div className="flex items-center gap-3.5">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${activeBoost ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md' : 'bg-gray-100 text-gray-400'}`}>
                            <Rocket size={22} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className={`font-bold text-sm ${activeBoost ? 'text-indigo-900' : 'text-gray-800'}`}>Status Boost</h3>
                            <p className={`text-xs mt-0.5 ${activeBoost ? 'text-indigo-700 font-medium' : 'text-gray-400'}`}>
                                {isLoading ? 'Mengecek...' : activeBoost
                                    ? `✅ Boost X${activeBoost.multiplierRate} Aktif — Sisa ${getTimeRemaining(activeBoost.expiresAt)}`
                                    : 'Belum ada boost aktif. Pilih paket di bawah!'}
                            </p>
                            {/* Progress bar for active boost */}
                            {activeBoost && (
                                <div className="w-full bg-indigo-200/60 rounded-full h-1.5 mt-2">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${getBoostProgress()}%` }}
                                        transition={{ duration: 1 }}
                                        className="bg-gradient-to-r from-indigo-500 to-purple-500 h-1.5 rounded-full"
                                    />
                                </div>
                            )}
                        </div>
                        {activeBoost && (
                            <div className="shrink-0">
                                <Clock size={16} className="text-indigo-400" />
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Social Proof */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="flex items-center justify-center gap-2 py-1"
                >
                    <div className="flex -space-x-2">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 border-2 border-white text-[8px] font-bold text-white flex items-center justify-center">
                                {['A', 'R', 'S', 'B'][i - 1]}
                            </div>
                        ))}
                    </div>
                    <p className="text-[11px] text-gray-500 font-medium">
                        🔥 <strong className="text-gray-700">1.200+</strong> pengguna sudah boost minggu ini
                    </p>
                </motion.div>

                {/* Package Cards */}
                {PACKAGES.map((pkg, pkgIndex) => {
                    const isCurrentBoost = activeBoost?.multiplierRate === pkg.multiplier;
                    const isBuying = buyingTier === pkg.multiplier;
                    const isGold = (pkg as any).isGold;

                    return (
                        <motion.div
                            key={pkg.tier}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15 + pkgIndex * 0.1 }}
                            className={`rounded-2xl overflow-hidden shadow-md border-2 transition-all ${isCurrentBoost ? pkg.activeBorder : pkg.borderColor} ${isGold ? 'boost-glow' : ''}`}
                        >
                            {/* Card Header */}
                            <div className={`bg-gradient-to-r ${pkg.gradient} px-5 py-4 text-white relative ${isGold ? 'boost-shimmer' : ''}`}>
                                {pkg.badge && (
                                    <span className="absolute top-3 right-3 px-2.5 py-0.5 bg-white/20 backdrop-blur-sm text-white text-[9px] font-black rounded-full uppercase tracking-wider border border-white/20">
                                        {pkg.badge}
                                    </span>
                                )}
                                <div className="flex items-center gap-3">
                                    <span className="text-3xl drop-shadow-md">{pkg.emoji}</span>
                                    <div>
                                        <h3 className="font-black text-lg leading-tight tracking-tight">{pkg.tier}</h3>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-white/90 text-xs font-bold">X{pkg.multiplier}</span>
                                            <span className="text-white/40">·</span>
                                            <span className={`text-xs font-bold ${pkg.priceColor}`}>{pkg.stars} ⭐</span>
                                            <span className="text-white/40">·</span>
                                            <span className="text-white/70 text-xs">{pkg.duration}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Card Body */}
                            <div className="bg-white px-5 py-4 space-y-3.5">
                                <p className="text-[11px] text-gray-400 leading-relaxed italic">"{pkg.tagline}"</p>

                                {/* Benefits List */}
                                <div className="space-y-2.5">
                                    {pkg.benefits.map((b, i) => {
                                        const Icon = b.icon;
                                        return (
                                            <div key={i} className="flex items-center gap-2.5">
                                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${b.highlight ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                                                    <Icon size={13} />
                                                </div>
                                                <span className={`text-[13px] leading-tight ${b.highlight ? 'text-gray-900 font-bold' : 'text-gray-600 font-medium'}`}>
                                                    {b.text}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* CTA Button */}
                                <motion.button
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() => handleBuyBoost(pkg.multiplier, pkg.stars)}
                                    disabled={isBuying || isCurrentBoost}
                                    className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm mt-1 ${
                                        isCurrentBoost
                                            ? 'bg-emerald-50 text-emerald-600 border-2 border-emerald-200 cursor-default'
                                            : isBuying
                                                ? 'bg-gray-100 text-gray-400 border border-gray-200'
                                                : `bg-gradient-to-r ${pkg.gradient} text-white hover:opacity-90 shadow-md`
                                    }`}
                                >
                                    {isCurrentBoost ? (
                                        <><Check size={16} strokeWidth={3} /> Boost Aktif</>
                                    ) : isBuying ? (
                                        <><Loader2 size={16} className="animate-spin" /> Memproses...</>
                                    ) : (
                                        <><Star size={16} /> Beli {pkg.stars} Stars <ChevronRight size={14} /></>
                                    )}
                                </motion.button>
                            </div>
                        </motion.div>
                    );
                })}

                {/* Info Footer */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm"
                >
                    <h4 className="text-xs font-bold text-gray-700 mb-2.5 flex items-center gap-1.5">
                        <span className="text-base">ℹ️</span> Info Penting
                    </h4>
                    <div className="space-y-2 text-[11px] text-gray-400 leading-relaxed">
                        <p>⚡ Boost berlaku sejak pembayaran dikonfirmasi.</p>
                        <p>📌 Hanya 1 boost yang aktif. Beli baru = ganti yang lama.</p>
                        <p>💳 Pembayaran menggunakan Telegram Stars.</p>
                        <p>💡 Stars bisa dibeli langsung dari Telegram Settings.</p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
