import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Gift, Sparkles, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { userApi } from '../api/client';
import { useWallet } from '../contexts/WalletContext';

interface DailyCheckInProps {
    onClose: () => void;
    isOpen: boolean;
    currentStreak: number;
    dailyRewards?: number[];
}

export default function DailyCheckIn({ onClose, isOpen, currentStreak, dailyRewards = [] }: DailyCheckInProps) {
    const [claimedDay, setClaimedDay] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { refreshWallet } = useWallet();

    const defaultRewards = [5000, 10000, 15000, 25000, 35000, 50000, 100000];
    const rewardValues = dailyRewards.length > 0 ? dailyRewards : defaultRewards;

    const REWARDS = rewardValues.map((amount, i) => ({
        day: i + 1,
        amount: i === rewardValues.length - 1 ? '🎁 Box' : `Rp ${amount.toLocaleString('id-ID')}`,
        isBig: i === rewardValues.length - 1,
        rawAmount: amount
    }));

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl relative overflow-hidden"
                >
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200 z-10 transition-colors"
                    >
                        <X size={16} />
                    </button>

                    {/* Header */}
                    <div className="bg-gradient-to-br from-amber-400 to-orange-500 p-6 pt-8 text-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc4JyBoZWlnaHQ9JzgnPgo8cmVjdCB3aWR0aD0nOCcgaGVpZ2h0PSc4JyBmaWxsPScjZmZmJyBmaWxsLW9wYWNpdHk9JzAuMScvPgo8cGF0aCBkPSdNMCAwaDh2OEgweicgZmlsbD0nbm9uZScvPgo8L3N2Zz4=')] opacity-20"></div>
                        <Gift size={40} className="text-white mx-auto mb-2 drop-shadow-md" />
                        <h2 className="text-2xl font-black text-white drop-shadow-md">Bonus Harian</h2>
                        <p className="text-orange-100 text-sm font-medium mt-1">Sisa 1x Misi Aktif Hari Ini</p>
                    </div>

                    <div className="p-6">
                        <p className="text-center text-slate-500 text-xs mb-6 px-4">
                            Login 7 hari berturut-turut untuk membuka <strong>Mistery Box</strong> berisi Rp {(REWARDS[REWARDS.length - 1]?.rawAmount || 100000).toLocaleString('id-ID')}!
                        </p>

                        <div className="grid grid-cols-4 gap-2 mb-4">
                            {REWARDS.slice(0, 4).map((reward) => {
                                const isChecked = reward.day <= currentStreak;
                                const isToday = reward.day === currentStreak + 1;
                                const isClaimedToday = claimedDay === reward.day;

                                return (
                                    <div key={reward.day}
                                        className={cn(
                                            "rounded-xl border flex flex-col items-center justify-center p-2 h-20 relative overflow-hidden transition-all duration-300",
                                            isChecked ? "bg-emerald-50 border-emerald-200" :
                                                (isToday && !isClaimedToday) ? "bg-amber-50 border-amber-300 ring-2 ring-amber-300/50 shadow-sm" :
                                                    (isToday && isClaimedToday) ? "bg-emerald-500 border-emerald-600 text-white" : "bg-slate-50 border-slate-100"
                                        )}
                                    >
                                        {isChecked ? (
                                            <Check size={24} className="text-emerald-500" />
                                        ) : (isToday && isClaimedToday) ? (
                                            <Check size={24} className="text-white" />
                                        ) : (
                                            <>
                                                {isToday && !isClaimedToday && (
                                                    <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                                                )}
                                                <span className={cn("text-xs font-bold", (isToday && !isClaimedToday) ? "text-amber-600" : "text-slate-400")}>H-{reward.day}</span>
                                                <span className={cn("text-[10px] font-black mt-1 text-center leading-tight", (isToday && !isClaimedToday) ? "text-slate-900" : "text-slate-400")}>
                                                    {reward.amount}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                )
                            })}
                        </div>

                        <div className="grid grid-cols-3 gap-2 mb-6">
                            {REWARDS.slice(4).map((reward) => (
                                <div key={reward.day}
                                    className={cn(
                                        "rounded-xl border flex flex-col items-center justify-center p-3 relative overflow-hidden transition-all duration-300",
                                        reward.isBig ? "bg-gradient-to-br from-purple-500 to-indigo-600 border-purple-400 text-white shadow-md shadow-purple-500/20" : "bg-slate-50 border-slate-100"
                                    )}
                                >
                                    {reward.isBig ? (
                                        <>
                                            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc4JyBoZWlnaHQ9JzgnPgo8cmVjdCB3aWR0aD0nOCcgaGVpZ2h0PSc4JyBmaWxsPScjZmZmJyBmaWxsLW9wYWNpdHk9JzAuMScvPgo8cGF0aCBkPSdNMCAwaDh2OEgweicgZmlsbD0nbm9uZScvPgo8L3N2Zz4=')] opacity-20"></div>
                                            <Sparkles size={16} className="text-yellow-300 mb-1 drop-shadow-sm" />
                                            <span className="text-xs font-black shadow-sm tracking-wide">MYSTERY</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="text-xs font-bold text-slate-400">H-{reward.day}</span>
                                            <span className="text-[10px] font-black mt-1 text-slate-400">
                                                {reward.amount}
                                            </span>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={async () => {
                                try {
                                    setIsSubmitting(true);

                                    // Tanam Cookie Affiliate dengan membuka link Shopee Sponsor saat user klik
                                    try {
                                        const sponsorLink = 'https://s.shopee.co.id/5q44JlvHfE'; 
                                        if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.openLink) {
                                            (window as any).Telegram.WebApp.openLink(sponsorLink);
                                        }
                                    } catch (err) {
                                        console.error("Gagal membuka sponsor", err);
                                    }

                                    const res = await userApi.claimDaily();
                                    if (res.success) {
                                        setClaimedDay(currentStreak);
                                        await refreshWallet();
                                        setTimeout(() => onClose(), 2500); // Auto close after success
                                    }
                                } catch (e) {
                                    console.error("Claim failed", e);
                                } finally {
                                    setIsSubmitting(false);
                                }
                            }}
                            disabled={claimedDay !== null || isSubmitting}
                            className={cn(
                                "w-full py-3.5 rounded-xl font-bold transition-all shadow-md relative overflow-hidden flex flex-col items-center justify-center",
                                (claimedDay !== null || isSubmitting)
                                    ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                    : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white leading-tight"
                            )}
                        >
                            <span className="text-[15px]">{isSubmitting ? "Memproses..." : claimedDay !== null ? "Berhasil Diklaim! 💸" : "Klaim Saldo & Kunjungi Sponsor"}</span>
                            {claimedDay === null && !isSubmitting && (
                                <span className="text-[10px] opacity-85 font-medium mt-0.5">*Membuka aplikasi Shopee</span>
                            )}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
