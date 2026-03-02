import { useState, useEffect } from 'react';
import { Users, Copy, Share2, ChevronRight, TrendingUp } from 'lucide-react';
import { userApi } from '../api/client';

export default function FrensPage() {
    const [referrals, setReferrals] = useState<any[]>([]);
    const [refCode, setRefCode] = useState<string>('loading...');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadFrensData = async () => {
            try {
                const profile = await userApi.getProfile();
                setRefCode(profile.referralCode || 'guest123');

                const refs = await userApi.getReferrals();
                setReferrals(refs);
            } catch (err) {
                console.error("Failed to load frens", err);
                const FAKE_REFERRALS = [
                    { name: "Andi Saputra", reward: "+ Rp 150.000", time: "2 jam lalu", tier: "Gold", isCompleted: true },
                    { name: "Dewi Kirana", reward: "Belum Selesai", time: "5 jam lalu", tier: "Silver", isCompleted: false },
                    { name: "Reza Rahardian", reward: "Belum Selesai", time: "1 hari lalu", tier: "Bronze", isCompleted: false },
                ];
                setReferrals(FAKE_REFERRALS);
                setRefCode('ref_degen99');
            } finally {
                setIsLoading(false);
            }
        };
        loadFrensData();
    }, []);

    const shareUrl = `t.me/GrupiahBot?startapp=${refCode}`;

    const handleWhatsAppShare = () => {
        const text = encodeURIComponent(`Bro, bantuin gue cairin dana di sini dong. Klik link ini 👇\n\nhttps://${shareUrl}`);
        window.open(`https://wa.me/?text=${text}`, '_blank');
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(`https://${shareUrl}`);
        alert('Link disalin!');
    };

    const completedReferralsCount = referrals.filter(r => r.isCompleted).length;

    return (
        <div className="pb-24 min-h-screen bg-gray-50 flex flex-col">
            {/* Heavy Marketing Header */}
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 pt-10 pb-12 px-6 rounded-b-[2.5rem] shadow-lg relative overflow-hidden shrink-0">
                <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl"></div>
                <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-32 h-32 bg-white opacity-10 rounded-full blur-xl"></div>

                <div className="relative z-10 text-center">
                    <div className="w-16 h-16 mx-auto bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md mb-3 border border-white/30 shadow-inner">
                        <Users size={32} className="text-white drop-shadow-md" />
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight drop-shadow-md">Ajak Teman</h1>
                    <h2 className="text-2xl font-extrabold text-yellow-300 drop-shadow-md mt-1">Dapat Rp 150.000!</h2>
                    <p className="text-emerald-50 text-xs mt-3 opacity-90 leading-relaxed px-4">
                        Tidak ada batas! Undang sebanyak-banyaknya. Saldo langsung masuk saat temanmu menyelesaikan 1 Flash Task pertama mereka.
                    </p>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 px-4 -mt-6 relative z-20">

                {/* The Action Box */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col gap-4 mb-6">
                    <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100 flex justify-between items-center">
                        <div>
                            <span className="block text-[10px] text-emerald-600 font-bold uppercase tracking-wider mb-0.5">Link Undangan Anda</span>
                            <span className="font-mono font-bold text-sm text-gray-900">{isLoading ? '...' : shareUrl}</span>
                        </div>
                        <button onClick={handleCopy} className="bg-emerald-500 text-white p-2.5 rounded-lg shadow-sm hover:bg-emerald-600 transition-colors">
                            <Copy size={16} />
                        </button>
                    </div>

                    <button onClick={handleWhatsAppShare} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-shadow shadow-md">
                        <Share2 size={18} />
                        Bagikan ke WhatsApp
                    </button>
                </div>

                {/* Simple Summary */}
                <div className="mb-6 grid grid-cols-2 gap-3">
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-emerald-100 flex flex-col justify-center items-center text-center">
                        <Users size={20} className="text-emerald-500 mb-1" />
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Teman Valid</span>
                        <span className="text-xl font-black text-gray-900">{isLoading ? '-' : completedReferralsCount}</span>
                    </div>
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-emerald-100 flex flex-col justify-center items-center text-center">
                        <TrendingUp size={20} className="text-emerald-500 mb-1" />
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total Hasil Kas</span>
                        <span className="text-xl font-black text-gray-900">
                            {isLoading ? '-' : `Rp ${(completedReferralsCount * 150000).toLocaleString('id-ID')}`}
                        </span>
                    </div>
                </div>

                {/* Live List (Social Proof) */}
                <h3 className="font-bold text-gray-900 px-2 mb-3">Teman yang Bergabung</h3>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
                    {referrals.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 font-medium text-sm">
                            Belum ada teman yang diundang.
                        </div>
                    ) : (
                        referrals.map((ref, idx) => (
                            <div key={idx} className={`p-4 flex justify-between items-center transition-colors ${ref.isCompleted ? 'hover:bg-gray-50' : 'bg-gray-50/50 opacity-75'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border ${ref.isCompleted ? 'bg-emerald-100 text-emerald-600 border-emerald-200' : 'bg-slate-200 text-slate-500 border-slate-300'}`}>
                                        {(ref.name || 'U').charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-sm leading-tight">{ref.name || 'User'}</h4>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded mt-1 inline-block font-medium ${ref.isCompleted ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                            {ref.isCompleted ? 'Selesai Task' : 'Menunggu Task'}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right flex flex-col items-end">
                                    <span className={`font-bold text-sm block ${ref.isCompleted ? 'text-emerald-600' : 'text-slate-400'}`}>
                                        {ref.reward || 'Belum Selesai'}
                                    </span>
                                    <span className="text-[10px] text-gray-400 mt-0.5">{ref.time ? new Date(ref.time).toLocaleDateString('id-ID', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Baru Saja'}</span>
                                </div>
                            </div>
                        ))
                    )}

                    <button className="w-full flex items-center justify-center gap-1 text-xs font-bold text-emerald-600 py-3 hover:bg-emerald-50 transition-colors">
                        Lihat Semua Teman <ChevronRight size={14} />
                    </button>
                </div>

            </div>
        </div>
    );
}
