import { useState, useEffect } from 'react';
import { Wallet as WalletIcon, ArrowRightLeft, ShieldAlert, History, HelpCircle, X, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { userApi } from '../api/client';

interface WithdrawalItem {
    id: string;
    amount: number;
    method: string;
    status: string;
    createdAt: string;
}

export default function WalletPage() {
    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
    const [withdrawMethod, setWithdrawMethod] = useState('DANA');
    const [accountName, setAccountName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [withdrawAmount, setWithdrawAmount] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [balance, setBalance] = useState(0);
    const [minWithdraw, setMinWithdraw] = useState(500000);
    const [isLoading, setIsLoading] = useState(true);
    const [withdrawals, setWithdrawals] = useState<WithdrawalItem[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const profile = await userApi.getProfile();
                setBalance(Number(profile?.wallet?.balance) || 0);
                setMinWithdraw(Number(profile?.appConfig?.minWithdraw) || 500000);

                const wdHistory = await userApi.getWithdrawals().catch(() => []);
                setWithdrawals(wdHistory);
            } catch (err) {
                console.error("Failed to fetch wallet", err);
                setBalance(0);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const canWithdraw = balance >= minWithdraw;
    const validAmount = withdrawAmount >= minWithdraw && withdrawAmount <= balance;

    const openWithdrawModal = () => {
        if (canWithdraw) {
            setWithdrawAmount(balance); // Default to full balance
            setIsWithdrawModalOpen(true);
        }
    };

    const handleWithdrawSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await userApi.requestWithdrawal({
                amount: withdrawAmount,
                method: withdrawMethod,
                accountInfo: {
                    name: accountName,
                    number: accountNumber
                }
            });
            setIsSuccess(true);
            setBalance(prev => prev - withdrawAmount); // Optimistic deduction

            setTimeout(() => {
                setIsWithdrawModalOpen(false);
                setIsSuccess(false);
                setAccountName('');
                setAccountNumber('');
            }, 3000);
        } catch (error: any) {
            console.error('Withdrawal failed:', error);
            alert(error?.response?.data?.message || 'Gagal mengajukan penarikan');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="pb-24 min-h-screen bg-gray-50 flex flex-col">
            {/* Wallet Card Header */}
            <div className="bg-slate-900 pt-8 pb-12 px-6 rounded-b-[2.5rem] relative overflow-hidden shrink-0 shadow-lg">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <WalletIcon size={120} className="text-white" />
                </div>

                <div className="relative z-10 flex flex-col items-center">
                    <span className="text-slate-400 font-medium text-sm mb-1 uppercase tracking-widest">Total Saldo Aktif</span>
                    <div className="flex items-start gap-1">
                        <span className="text-white font-black text-2xl mt-1.5">Rp</span>
                        <span className="text-white font-black text-5xl tracking-tight">
                            {isLoading ? '...' : balance.toLocaleString('id-ID')}
                        </span>
                    </div>

                    <div className="mt-6 flex gap-3 w-full max-w-xs">
                        <button
                            onClick={openWithdrawModal}
                            className={`flex-1 font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md ${canWithdraw ? 'bg-white hover:bg-slate-50 text-slate-900' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                        >
                            <ArrowRightLeft size={18} /> {canWithdraw ? 'Tarik Dana' : 'Belum Cukup'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 px-4 -mt-6 relative z-20">
                {/* Status Card based on balance */}
                <div className={`rounded-2xl p-5 shadow-sm border flex items-start gap-4 mb-6 relative overflow-hidden ${canWithdraw ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-gray-100'}`}>
                    {!canWithdraw ? (
                        <>
                            <div className="absolute top-0 right-0 w-16 h-16 bg-red-100 rounded-bl-full flex items-start justify-end p-2 opacity-50">
                                <ShieldAlert size={16} className="text-red-500" />
                            </div>
                            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center shrink-0">
                                <ShieldAlert size={24} />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-900 text-sm mb-1">Status Pencairan</h3>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    Saldo Anda belum mencapai batas minimum <strong className="text-slate-900">Rp {minWithdraw.toLocaleString('id-ID')}</strong>. Terus selesaikan tugas untuk mencairkan dana.
                                </p>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-100 rounded-bl-full flex items-start justify-end p-2 opacity-50">
                                <CheckCircle2 size={16} className="text-emerald-500" />
                            </div>
                            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                                <CheckCircle2 size={24} />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-emerald-900 text-sm mb-1">Pencairan Terbuka!</h3>
                                <p className="text-xs text-emerald-700 leading-relaxed">
                                    Selamat! Saldo Anda sudah melampaui batas minimum. Anda bisa mengajukan penarikan kapan saja.
                                </p>
                            </div>
                        </>
                    )}
                </div>

                <h3 className="font-bold text-gray-900 px-2 mb-3 flex items-center justify-between">
                    <span>Riwayat Transaksi</span>
                    <History size={16} className="text-gray-400" />
                </h3>

                {withdrawals.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-8 text-center bg-gray-50/50">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <History size={20} className="text-gray-400" />
                        </div>
                        <p className="text-sm font-bold text-gray-500">Belum ada transaksi</p>
                        <p className="text-xs text-gray-400 mt-1">Selesaikan tugas untuk mulai menghasilkan.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {withdrawals.map(wd => (
                            <div key={wd.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${wd.status === 'PAID' ? 'bg-emerald-50 text-emerald-500' :
                                    wd.status === 'PENDING' ? 'bg-amber-50 text-amber-500' :
                                        'bg-red-50 text-red-500'
                                    }`}>
                                    {wd.status === 'PAID' ? <CheckCircle2 size={20} /> :
                                        wd.status === 'PENDING' ? <Clock size={20} /> :
                                            <XCircle size={20} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-gray-900 text-sm">Withdraw {wd.method}</h4>
                                    <span className="text-[10px] text-gray-400">
                                        {new Date(wd.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </span>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="font-bold text-sm text-gray-900">Rp {wd.amount.toLocaleString('id-ID')}</p>
                                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${wd.status === 'PAID' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                        wd.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                            'bg-red-50 text-red-700 border-red-200'
                                        }`}>
                                        {wd.status === 'PAID' ? 'Dibayar' : wd.status === 'PENDING' ? 'Menunggu' : 'Ditolak'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="mt-8 text-center text-xs text-gray-400 font-medium flex items-center justify-center gap-1.5 opacity-60">
                    <HelpCircle size={14} /> Butuh Bantuan? Hubungi Support
                </div>
            </div>

            {/* Withdrawal Modal (Bottom Sheet 1-Time Payment) */}
            {isWithdrawModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isSubmitting && setIsWithdrawModalOpen(false)}></div>
                    <div className="bg-white w-full sm:max-w-md rounded-t-[2rem] sm:rounded-[2rem] p-6 relative z-10 animate-in slide-in-from-bottom-full duration-300">

                        {!isSuccess ? (
                            <>
                                <button onClick={() => setIsWithdrawModalOpen(false)} className="absolute top-5 right-5 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200">
                                    <X size={18} />
                                </button>

                                <div className="mb-6">
                                    <h2 className="text-xl font-black text-gray-900">Tarik Dana</h2>
                                    <p className="text-sm text-gray-500 mt-1">Masukkan rekening tujuan (hanya 1x pakai per WD).</p>
                                </div>

                                <form onSubmit={handleWithdrawSubmit} className="space-y-4">
                                    {/* Amount Input */}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Jumlah Penarikan</label>
                                        <div className="relative">
                                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">Rp</span>
                                            <input
                                                type="number"
                                                required
                                                min={minWithdraw}
                                                max={balance}
                                                value={withdrawAmount || ''}
                                                onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                                                placeholder={minWithdraw.toLocaleString('id-ID')}
                                                className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block p-3.5 pl-10 font-bold font-mono"
                                            />
                                        </div>
                                        <div className="flex gap-2 mt-2">
                                            {[
                                                { label: 'Min', value: minWithdraw },
                                                { label: '-100rb', value: balance - 100000 },
                                                { label: '-200rb', value: balance - 200000 },
                                                { label: '-500rb', value: balance - 500000 },
                                                { label: 'Semua', value: balance },
                                            ].filter(opt => opt.value >= minWithdraw && opt.value <= balance).map((opt) => (
                                                <button
                                                    key={opt.label}
                                                    type="button"
                                                    onClick={() => setWithdrawAmount(opt.value)}
                                                    className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg border transition-all ${withdrawAmount === opt.value
                                                        ? 'bg-slate-900 text-white border-slate-900'
                                                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                                                        }`}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                        <p className="text-[10px] text-gray-400 mt-1.5">
                                            Saldo: Rp {balance.toLocaleString('id-ID')} • Min: Rp {minWithdraw.toLocaleString('id-ID')}
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Metode Tujuan</label>
                                        <select
                                            value={withdrawMethod}
                                            onChange={(e) => setWithdrawMethod(e.target.value)}
                                            className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block p-3.5 font-bold"
                                        >
                                            <option value="DANA">DANA (E-Wallet)</option>
                                            <option value="GOPAY">GOPAY (E-Wallet)</option>
                                            <option value="OVO">OVO (E-Wallet)</option>
                                            <option value="BANK_BCA">Bank BCA</option>
                                            <option value="BANK_MANDIRI">Bank Mandiri</option>
                                            <option value="BANK_BRI">Bank BRI</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Nomor Rekening / HP</label>
                                        <input
                                            type="text"
                                            required
                                            value={accountNumber}
                                            onChange={(e) => setAccountNumber(e.target.value)}
                                            placeholder="Contoh: 08123456789"
                                            className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block p-3.5 font-mono"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Nama Pemilik Akun Valid</label>
                                        <input
                                            type="text"
                                            required
                                            value={accountName}
                                            onChange={(e) => setAccountName(e.target.value)}
                                            placeholder="Sesuai KTP / Akun Premium"
                                            className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block p-3.5"
                                        />
                                        <p className="text-[10px] text-red-500 mt-1.5 font-medium leading-tight">
                                            *Peringatan: Cek kembali nama dan nomor rekening. Pihak kami tidak bertanggung jawab jika salah transfer.
                                        </p>
                                    </div>

                                    <div className="pt-2">
                                        <button
                                            type="submit"
                                            disabled={isSubmitting || !validAmount}
                                            className="w-full text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 font-bold rounded-xl text-sm px-5 py-4 text-center transition-all shadow-md flex items-center justify-center gap-2"
                                        >
                                            {isSubmitting ? 'Memproses...' : `Kirim Rp ${withdrawAmount.toLocaleString('id-ID')}`}
                                        </button>
                                    </div>
                                </form>
                            </>
                        ) : (
                            <div className="py-8 flex flex-col items-center text-center">
                                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                                    <CheckCircle2 size={32} className="text-emerald-600" />
                                </div>
                                <h2 className="text-xl font-black text-gray-900">Permintaan Terkirim!</h2>
                                <p className="text-sm text-gray-500 mt-2 px-4 leading-relaxed">
                                    Admin kami sedang memverifikasi transaksi Anda. Harap menunggu hingga proses verifikasi manual selesai.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
