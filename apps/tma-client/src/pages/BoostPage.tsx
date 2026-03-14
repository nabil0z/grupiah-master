import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Zap, Shield, Users, Rocket, Clock, Star, Check, Crown, ChevronRight, Loader2 } from 'lucide-react';
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
        color: 'from-amber-700 to-amber-600',
        borderColor: 'border-amber-300',
        bgColor: 'bg-amber-50',
        textColor: 'text-amber-800',
        tagline: 'Mulai dari sini! Gandakan semua pendapatan dan turunkan batas penarikan 50%.',
        benefits: [
            { icon: '💰', text: 'Cuan X2 — Gandakan pendapatan offerwall' },
            { icon: '📉', text: 'Min WD turun ke Rp 500.000' },
            { icon: '🎁', text: 'Daily Login reward X2' },
        ],
    },
    {
        tier: 'Silver',
        emoji: '🥈',
        multiplier: 5,
        stars: 200,
        duration: '3 hari',
        color: 'from-slate-500 to-slate-400',
        borderColor: 'border-slate-300',
        bgColor: 'bg-slate-50',
        textColor: 'text-slate-700',
        badge: '⭐ POPULER',
        tagline: 'Paket favorit grinder serius. 5X cuan + streak aman walau skip sehari.',
        benefits: [
            { icon: '💰', text: 'Cuan X5 — Lipatgandakan 5x pendapatan' },
            { icon: '📉', text: 'Min WD turun ke Rp 250.000' },
            { icon: '🎁', text: 'Daily Login reward X5' },
            { icon: '👥', text: 'Referral bonus X2' },
            { icon: '🛡️', text: 'Streak Protection — aman skip 1 hari' },
        ],
    },
    {
        tier: 'Gold',
        emoji: '🥇',
        multiplier: 10,
        stars: 500,
        duration: '7 hari',
        color: 'from-yellow-500 to-amber-400',
        borderColor: 'border-yellow-400',
        bgColor: 'bg-yellow-50',
        textColor: 'text-yellow-800',
        badge: '🔥 BEST VALUE',
        tagline: 'Paket SULTAN. 10X semua pendapatan, tarik dana cuma Rp 100rb, dan WD prioritas!',
        benefits: [
            { icon: '💰', text: 'Cuan X10 — Pendapatan 10x lipat!' },
            { icon: '📉', text: 'Min WD turun ke Rp 100.000' },
            { icon: '🎁', text: 'Daily Login reward X10' },
            { icon: '👥', text: 'Referral bonus X3' },
            { icon: '🛡️', text: 'Streak Protection — aman skip 1 hari' },
            { icon: '⚡', text: 'Fast Withdrawal — WD diproses prioritas' },
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
                        // Payment success — refresh boost status
                        try {
                            const data = await userApi.getActiveBoost();
                            setActiveBoost(data);
                        } catch {
                            // Boost mungkin belum ter-create oleh bot, retry setelah 2 detik
                            setTimeout(async () => {
                                try {
                                    const data = await userApi.getActiveBoost();
                                    setActiveBoost(data);
                                } catch { }
                            }, 2000);
                        }
                        alert(`🎉 Pembayaran Berhasil! Boost X${multiplier} sudah aktif.`);
                    } else if (status === 'cancelled') {
                        // User cancelled
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

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            {/* Header */}
            <div className="bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 pt-6 pb-10 px-5 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-4 right-4"><Star size={60} /></div>
                    <div className="absolute bottom-4 left-8"><Zap size={40} /></div>
                    <div className="absolute top-12 left-20"><Crown size={30} /></div>
                </div>

                <button onClick={() => navigate(-1)} className="text-white/70 hover:text-white mb-4 flex items-center gap-1 text-sm font-medium relative z-10">
                    <ArrowLeft size={16} /> Kembali
                </button>

                <div className="text-center relative z-10">
                    <h1 className="text-2xl font-black text-white tracking-tight">⚡ Telegram Stars Boost</h1>
                    <p className="text-indigo-200 text-sm mt-1.5 max-w-xs mx-auto leading-relaxed">
                        Tingkatkan pendapatan, turunkan batas WD, dan dapatkan benefit eksklusif.
                    </p>
                </div>
            </div>

            <div className="px-4 -mt-5 relative z-10 space-y-4">
                {/* Active Boost Status */}
                <div className={`rounded-2xl p-5 shadow-sm border flex items-center gap-4 ${activeBoost ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-100'}`}>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${activeBoost ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                        <Rocket size={22} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className={`font-bold text-sm ${activeBoost ? 'text-indigo-900' : 'text-gray-900'}`}>Status Boost</h3>
                        <p className={`text-xs mt-0.5 ${activeBoost ? 'text-indigo-700 font-medium' : 'text-gray-500'}`}>
                            {isLoading ? 'Sedang mengecek...' : activeBoost
                                ? `✅ Boost X${activeBoost.multiplierRate} Aktif — Sisa ${getTimeRemaining(activeBoost.expiresAt)}`
                                : 'Belum ada paket Boost yang berjalan.'}
                        </p>
                    </div>
                    {activeBoost && (
                        <div className="shrink-0">
                            <Clock size={16} className="text-indigo-400" />
                        </div>
                    )}
                </div>

                {/* Package Cards */}
                {PACKAGES.map((pkg) => {
                    const isCurrentBoost = activeBoost?.multiplierRate === pkg.multiplier;
                    const isBuying = buyingTier === pkg.multiplier;

                    return (
                        <div
                            key={pkg.tier}
                            className={`rounded-2xl overflow-hidden shadow-sm border-2 transition-all ${isCurrentBoost ? pkg.borderColor + ' ring-2 ring-offset-1 ring-yellow-400' : 'border-gray-200'}`}
                        >
                            {/* Card Header */}
                            <div className={`bg-gradient-to-r ${pkg.color} px-5 py-4 text-white relative`}>
                                {pkg.badge && (
                                    <span className="absolute top-3 right-3 px-2.5 py-0.5 bg-white/20 backdrop-blur-sm text-white text-[10px] font-black rounded-full uppercase tracking-wider">
                                        {pkg.badge}
                                    </span>
                                )}
                                <div className="flex items-center gap-2.5">
                                    <span className="text-3xl">{pkg.emoji}</span>
                                    <div>
                                        <h3 className="font-black text-lg leading-tight">{pkg.tier}</h3>
                                        <p className="text-white/80 text-xs font-medium">X{pkg.multiplier} · {pkg.stars} ⭐ · {pkg.duration}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Card Body */}
                            <div className="bg-white px-5 py-4 space-y-3">
                                <p className="text-xs text-gray-500 leading-relaxed italic">"{pkg.tagline}"</p>

                                {/* Benefits List */}
                                <div className="space-y-2">
                                    {pkg.benefits.map((b, i) => (
                                        <div key={i} className="flex items-start gap-2.5">
                                            <span className="text-sm shrink-0 mt-0.5">{b.icon}</span>
                                            <span className="text-sm text-gray-700 font-medium leading-tight">{b.text}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* CTA Button */}
                                <button
                                    onClick={() => handleBuyBoost(pkg.multiplier, pkg.stars)}
                                    disabled={isBuying || isCurrentBoost}
                                    className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm ${
                                        isCurrentBoost
                                            ? 'bg-green-100 text-green-700 cursor-default'
                                            : isBuying
                                                ? 'bg-gray-200 text-gray-400'
                                                : `bg-gradient-to-r ${pkg.color} text-white hover:opacity-90 active:scale-[0.98]`
                                    }`}
                                >
                                    {isCurrentBoost ? (
                                        <><Check size={16} /> Aktif Sekarang</>
                                    ) : isBuying ? (
                                        <><Loader2 size={16} className="animate-spin" /> Memproses...</>
                                    ) : (
                                        <><Star size={16} /> Beli {pkg.stars} Stars <ChevronRight size={14} /></>
                                    )}
                                </button>
                            </div>
                        </div>
                    );
                })}

                {/* Info Text */}
                <div className="text-center text-[11px] text-gray-400 px-4 pb-6 leading-relaxed space-y-1 mt-2">
                    <p>⚡ Boost berlaku sejak pembayaran dikonfirmasi.</p>
                    <p>📌 Hanya 1 boost yang aktif dalam satu waktu. Beli baru = ganti yang lama.</p>
                    <p>💳 Pembayaran menggunakan Telegram Stars.</p>
                </div>
            </div>
        </div>
    );
}
