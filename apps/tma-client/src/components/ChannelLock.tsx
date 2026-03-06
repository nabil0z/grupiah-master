import { Lock, ShieldAlert, CheckCircle } from 'lucide-react';

interface ChannelLockProps {
    onVerify: () => void;
    isVerifying: boolean;
    channelInfo?: {
        title?: string;
        memberCount?: number;
        photoUrl?: string | null;
    };
}

function formatMemberCount(count: number): string {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toLocaleString('id-ID');
}

export default function ChannelLock({ onVerify, isVerifying, channelInfo }: ChannelLockProps) {
    const title = channelInfo?.title || 'Grupiah Official';
    const memberCount = channelInfo?.memberCount || 0;
    const photoUrl = channelInfo?.photoUrl || null;

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-6">
            <div className="bg-white rounded-[2rem] p-6 w-full max-w-sm shadow-2xl relative overflow-hidden flex flex-col items-center text-center">
                {/* Animated Background Gradient */}
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-blue-500 to-indigo-600 opacity-20 -z-10 blur-xl"></div>

                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg mb-6 relative">
                    <div className="absolute inset-0 bg-white opacity-20 rounded-full animate-ping"></div>
                    <Lock size={32} className="text-white relative z-10" />
                </div>

                <h2 className="text-2xl font-black text-slate-900 mb-2">Verifikasi Dibutuhkan</h2>
                <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                    Untuk melindungi akunmu dan mengaktifkan fitur penarikan saldo, silakan gabung ke channel resmi kami terlebih dahulu.
                </p>

                <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-6">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 overflow-hidden bg-blue-100 border border-blue-200">
                            {photoUrl ? (
                                <img src={photoUrl} alt={title} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-xl">📢</span>
                            )}
                        </div>
                        <div className="text-left">
                            <h3 className="font-bold text-slate-900 text-sm">{title}</h3>
                            {memberCount > 0 && (
                                <p className="text-xs text-slate-500">{formatMemberCount(memberCount)} Subscribers</p>
                            )}
                        </div>
                    </div>
                    <a href="https://t.me/Grupiah_id" target="_blank" rel="noreferrer" className="block w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2.5 rounded-xl transition-colors shadow-sm text-center text-sm">
                        Gabung Channel
                    </a>
                </div>

                <button
                    onClick={onVerify}
                    disabled={isVerifying}
                    className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md
               ${isVerifying ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}
                >
                    {isVerifying ? (
                        <>
                            <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                            Memverifikasi...
                        </>
                    ) : (
                        <>
                            <CheckCircle size={18} />
                            Saya Sudah Bergabung
                        </>
                    )}
                </button>

                <div className="mt-4 flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                    <ShieldAlert size={12} /> Verifikasi otomatis via Telegram Bot
                </div>
            </div>
        </div>
    );
}
