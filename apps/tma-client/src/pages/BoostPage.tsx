import { useState, useEffect } from 'react';
import { Zap, Star, ShieldCheck, Loader2 } from 'lucide-react';
import { userApi } from '../api/client';

export default function BoostPage() {
    const [activeBoost, setActiveBoost] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isBuying, setIsBuying] = useState(false);

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
        setIsBuying(true);
        try {
            // 1. Get invoice URL from API
            const result = await userApi.buyBoost({ multiplierRate: multiplier, purchasedStar: stars });
            const invoiceUrl = result.invoiceUrl;

            if (!invoiceUrl) {
                alert('Gagal membuat invoice. Coba lagi.');
                return;
            }

            // 2. Open Telegram Stars payment popup
            if (window.Telegram?.WebApp?.openInvoice) {
                window.Telegram.WebApp.openInvoice(invoiceUrl, async (status: string) => {
                    if (status === 'paid') {
                        // 3. Payment success — refresh boost status
                        try {
                            const data = await userApi.getActiveBoost();
                            setActiveBoost(data);
                        } catch (e) {
                            // Boost mungkin belum ter-create oleh bot, retry setelah 2 detik
                            setTimeout(async () => {
                                try {
                                    const data = await userApi.getActiveBoost();
                                    setActiveBoost(data);
                                } catch (_) { }
                            }, 2000);
                        }
                        alert(`🎉 Pembayaran Berhasil! Boost X${multiplier} sudah aktif.`);
                    } else if (status === 'cancelled') {
                        // User cancelled — do nothing
                    } else {
                        alert('Pembayaran gagal. Silakan coba lagi.');
                    }
                    setIsBuying(false);
                });
            } else {
                alert('Fitur ini hanya tersedia di dalam Telegram App.');
                setIsBuying(false);
            }
        } catch (err) {
            alert('Gagal memproses boost. Coba lagi nanti.');
            setIsBuying(false);
        }
    };
    return (
        <div className="pb-24 min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-br from-indigo-600 to-blue-700 pt-10 pb-12 px-6 rounded-b-[2.5rem] relative overflow-hidden shrink-0 shadow-lg text-center">
                <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl"></div>

                <div className="relative z-10 text-center">
                    <div className="w-16 h-16 mx-auto bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md mb-3 border border-white/30 shadow-inner">
                        <Zap size={32} className="text-yellow-300 drop-shadow-md" />
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight drop-shadow-md">Tingkatkan Pendapatan!</h1>
                    <p className="text-indigo-100 text-sm mt-2 opacity-90 px-4 leading-relaxed">
                        Gunakan Telegram Stars untuk melipatgandakan seluruh penghasilan Offerwall Anda secara instan.
                    </p>
                </div>
            </div>

            <div className="flex-1 px-4 -mt-8 relative z-20">
                {/* Current Active Boost */}
                <div className={`rounded-2xl p-5 shadow-sm border flex items-center gap-4 mb-6 ${activeBoost ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-100'}`}>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${activeBoost ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                        {isLoading ? <Loader2 className="animate-spin" /> : <ShieldCheck size={24} />}
                    </div>
                    <div className="flex-1">
                        <h3 className={`font-bold text-sm ${activeBoost ? 'text-indigo-900' : 'text-gray-900'}`}>Status Boost Aktif</h3>
                        <p className={`text-xs mt-1 ${activeBoost ? 'text-indigo-700 font-medium' : 'text-gray-500'}`}>
                            {isLoading ? 'Sedang mengecek...' : activeBoost ? `Multipler X${activeBoost.multiplierRate} Aktif Hingga ${new Date(activeBoost.expiresAt).toLocaleString('id-ID')}` : 'Belum ada paket Boost yang berjalan.'}
                        </p>
                    </div>
                </div>

                <h3 className="font-bold text-gray-900 px-2 mb-3">Pilihan Paket Premium</h3>

                {/* Boost Packages */}
                <div className="space-y-4">
                    {/* x2 Boost */}
                    <div className="bg-white rounded-2xl shadow-sm border border-orange-200 overflow-hidden relative">
                        <div className="absolute top-0 right-0 bg-gradient-to-l from-orange-400 to-amber-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg tracking-wider uppercase shadow-sm">
                            Paling Populer
                        </div>
                        <div className="p-5">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h4 className="font-black text-lg text-gray-900 flex items-center gap-2">
                                        Double Cuan <span className="text-amber-500 font-black">X2</span>
                                    </h4>
                                    <p className="text-xs text-gray-500 mt-1">Aktif selama 24 Jam Pertama</p>
                                </div>
                                <Zap className="text-amber-500 opacity-20" size={40} />
                            </div>

                            <button
                                onClick={() => handleBuyBoost(2.0, 50)}
                                disabled={isBuying}
                                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-shadow shadow-md relative overflow-hidden group">
                                <div className="absolute inset-0 bg-white/20 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out"></div>
                                {isBuying ? <Loader2 size={18} className="animate-spin" /> : <Star size={18} className="text-yellow-300 drop-shadow-sm" />}
                                Beli dengan 50 Stars
                            </button>
                        </div>
                    </div>

                    {/* x5 Boost */}
                    <div className="bg-slate-900 rounded-2xl shadow-lg border border-slate-700 overflow-hidden relative text-white">
                        <div className="absolute top-0 right-0 bg-gradient-to-l from-purple-500 to-fuchsia-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg tracking-wider uppercase shadow-sm">
                            Sultan Mode
                        </div>
                        <div className="p-5">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h4 className="font-black text-lg text-white flex items-center gap-2">
                                        Mega Cuan <span className="text-fuchsia-400 font-black">X5</span>
                                    </h4>
                                    <p className="text-xs text-slate-400 mt-1">Aktif selama 3 Hari Non-Stop</p>
                                </div>
                                <Zap className="text-fuchsia-400 opacity-20" size={40} />
                            </div>

                            <button
                                onClick={() => handleBuyBoost(5.0, 200)}
                                disabled={isBuying}
                                className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-600 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors">
                                {isBuying ? <Loader2 size={18} className="animate-spin" /> : <Star size={18} className="text-yellow-300 drop-shadow-sm" />}
                                Beli dengan 200 Stars
                            </button>
                        </div>
                    </div>
                </div>

                {/* Info Text */}
                <div className="mt-6 bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 text-blue-800 text-xs">
                    <ShieldCheck size={16} className="shrink-0 mt-0.5" />
                    <p className="leading-relaxed">Pembelian menggunakan fitur pembayaran in-app Telegram resmi. Bonus pengali akan langsung aktif di seluruh jaringan Offerwall setelah transaksi sukses.</p>
                </div>
            </div>
        </div>
    );
}
