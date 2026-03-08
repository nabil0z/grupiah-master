import { useState, useEffect } from 'react';
import { ChevronLeft, Bell, Globe, Shield, LogOut, Moon, Volume2, Film, Plus, X, Trash2, Syringe, Clock, Link2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { userApi } from '../api/client';

export default function SettingsPage() {
    const navigate = useNavigate();
    const tgUser = typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user;

    const [notifications, setNotifications] = useState(true);
    const [sound, setSound] = useState(true);
    const [darkMode, setDarkMode] = useState(false);

    // Creator state
    const [creatorData, setCreatorData] = useState<any>(null);
    const [creatorLoading, setCreatorLoading] = useState(true);
    const [channels, setChannels] = useState<{ platform: string, channel: string }[]>([{ platform: 'TIKTOK', channel: '' }]);
    const [applying, setApplying] = useState(false);
    const [saving, setSaving] = useState(false);
    const [injecting, setInjecting] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const [toast, setToast] = useState('');

    useEffect(() => {
        userApi.getCreatorStatus().then(data => {
            setCreatorData(data);
            if (data.creatorChannels?.length) setChannels(data.creatorChannels);
        }).catch(() => { }).finally(() => setCreatorLoading(false));
    }, []);

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

    const handleApply = async () => {
        const validChannels = channels.filter(c => c.channel.trim());
        if (!validChannels.length) return showToast('Isi minimal 1 channel!');
        setApplying(true);
        try {
            await userApi.applyCreator(validChannels);
            showToast('Lamaran terkirim! ✅');
            const data = await userApi.getCreatorStatus();
            setCreatorData(data);
        } catch (e: any) {
            showToast(e?.response?.data?.message || 'Gagal mengirim lamaran');
        } finally { setApplying(false); }
    };

    const handleSaveSettings = async (wdMode?: string, delay?: number) => {
        setSaving(true);
        try {
            await userApi.updateCreatorSettings({ wdMode, marketingDelaySeconds: delay });
            showToast('Pengaturan disimpan! ✅');
            const data = await userApi.getCreatorStatus();
            setCreatorData(data);
        } catch { showToast('Gagal menyimpan'); }
        finally { setSaving(false); }
    };

    const handleInject = async () => {
        setInjecting(true);
        try {
            const res = await userApi.injectDemo();
            showToast(res.message || 'Demo data injected! ✅');
        } catch { showToast('Gagal inject demo'); }
        finally { setInjecting(false); }
    };

    const handleReset = async () => {
        if (!confirm('Hapus semua data demo? Saldo akan direset ke Rp 0.')) return;
        setResetting(true);
        try {
            const res = await userApi.resetDemo();
            showToast(res.message || 'Demo direset! ✅');
        } catch { showToast('Gagal reset demo'); }
        finally { setResetting(false); }
    };

    const copyReferral = () => {
        const link = `https://t.me/GRupiah_bot/app?startapp=ref_${creatorData?.referralCode || ''}`;
        navigator.clipboard.writeText(link).then(() => showToast('Link disalin! 📋'));
    };

    const PLATFORMS = ['TIKTOK', 'YOUTUBE', 'INSTAGRAM'];

    return (
        <div className="pb-24 min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <div className="bg-white pt-6 pb-6 px-4 shadow-sm border-b border-gray-100 flex items-center justify-between sticky top-0 z-50">
                <button onClick={() => navigate(-1)} className="p-2 bg-gray-50 rounded-full text-gray-600 hover:bg-gray-100 transition-colors">
                    <ChevronLeft size={24} />
                </button>
                <h1 className="text-lg font-black text-gray-900 absolute left-1/2 -translate-x-1/2">
                    Pengaturan
                </h1>
                <div className="w-10"></div>
            </div>

            {/* Profile Brief */}
            <div className="bg-white p-6 mt-4 mx-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                <img
                    src={tgUser?.photo_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=fallback"}
                    alt="Profile"
                    className="w-16 h-16 rounded-full bg-slate-100 object-cover border-2 border-gray-100 p-0.5"
                />
                <div>
                    <h2 className="text-lg font-black text-gray-900">
                        {tgUser?.first_name ? `${tgUser.first_name} ${tgUser.last_name || ''}`.trim() : "TMA User"}
                    </h2>
                    <p className="text-sm text-gray-500 font-medium">@{tgUser?.username || "unknown"}</p>
                </div>
            </div>

            {/* Preferences */}
            <div className="px-4 mt-6 space-y-4">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
                    <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                                <Bell size={20} className="text-blue-500" />
                            </div>
                            <span className="font-bold text-gray-700 text-sm">Notifikasi Push</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={notifications} onChange={() => setNotifications(!notifications)} />
                            <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                    </div>

                    <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
                                <Volume2 size={20} className="text-amber-500" />
                            </div>
                            <span className="font-bold text-gray-700 text-sm">Suara Aplikasi</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={sound} onChange={() => setSound(!sound)} />
                            <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                    </div>

                    <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center">
                                <Moon size={20} className="text-slate-500" />
                            </div>
                            <span className="font-bold text-gray-700 text-sm">Mode Gelap</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={darkMode} onChange={() => setDarkMode(!darkMode)} />
                            <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-800"></div>
                        </label>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
                    <button className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
                                <Globe size={20} className="text-indigo-500" />
                            </div>
                            <span className="font-bold text-gray-700 text-sm">Bahasa</span>
                        </div>
                        <span className="text-xs font-bold text-gray-400">Indonesia</span>
                    </button>
                    <button className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                                <Shield size={20} className="text-emerald-500" />
                            </div>
                            <span className="font-bold text-gray-700 text-sm">Kebijakan Privasi</span>
                        </div>
                    </button>
                </div>

                {/* ========== Creator Program Section ========== */}
                {!creatorLoading && creatorData && (
                    <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl shadow-sm border border-violet-200 overflow-hidden">
                        <div className="p-4 border-b border-violet-100 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
                                <Film size={20} className="text-violet-600" />
                            </div>
                            <div>
                                <h3 className="font-black text-gray-900 text-sm">
                                    {creatorData.creatorStatus === 'APPROVED' ? '🎬 Creator Mode Aktif' : '🎬 Jadi Creator GRupiah'}
                                </h3>
                                {creatorData.creatorStatus === 'APPROVED' && (
                                    <span className="text-xs text-emerald-600 font-bold">✅ Aktif</span>
                                )}
                            </div>
                        </div>

                        <div className="p-4 space-y-3">
                            {/* NONE — Not eligible */}
                            {creatorData.creatorStatus === 'NONE' && !creatorData.eligible && (
                                <div className="text-sm text-gray-600 space-y-2">
                                    <p className="font-bold text-gray-700">🔒 Belum memenuhi syarat:</p>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${creatorData.eligibility.currentDays >= creatorData.eligibility.minDays ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                                            {creatorData.eligibility.currentDays >= creatorData.eligibility.minDays ? '✅' : '❌'} Akun {creatorData.eligibility.currentDays}/{creatorData.eligibility.minDays} hari
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${creatorData.eligibility.currentTasks >= creatorData.eligibility.minTasks ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                                            {creatorData.eligibility.currentTasks >= creatorData.eligibility.minTasks ? '✅' : '❌'} Tugas {creatorData.eligibility.currentTasks}/{creatorData.eligibility.minTasks} selesai
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* NONE — Eligible, show form */}
                            {creatorData.creatorStatus === 'NONE' && creatorData.eligible && (
                                <>
                                    <p className="text-xs text-gray-500">
                                        ⚠️ Mode demo: semua fitur berjalan normal untuk konten, termasuk WD (receipt terkirim, tapi uang tidak dikirim).
                                    </p>
                                    <p className="text-xs font-bold text-gray-600 mb-1">Platform & Channel:</p>
                                    {channels.map((ch, i) => (
                                        <div key={i} className="flex gap-2 items-center">
                                            <select value={ch.platform} onChange={e => { const c = [...channels]; c[i].platform = e.target.value; setChannels(c); }}
                                                className="w-28 text-xs border border-gray-200 rounded-lg px-2 py-2 bg-white font-bold text-gray-700">
                                                {PLATFORMS.map(p => <option key={p} value={p}>{p === 'TIKTOK' ? 'TikTok' : p === 'YOUTUBE' ? 'YouTube' : 'Instagram'}</option>)}
                                            </select>
                                            <input value={ch.channel} onChange={e => { const c = [...channels]; c[i].channel = e.target.value; setChannels(c); }}
                                                placeholder="@username" className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white" />
                                            {channels.length > 1 && (
                                                <button onClick={() => setChannels(channels.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600">
                                                    <X size={16} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    <button onClick={() => setChannels([...channels, { platform: 'TIKTOK', channel: '' }])}
                                        className="text-xs font-bold text-violet-600 flex items-center gap-1 hover:text-violet-800">
                                        <Plus size={14} /> Tambah Platform
                                    </button>
                                    <button onClick={handleApply} disabled={applying}
                                        className="w-full py-3 bg-violet-600 text-white rounded-xl font-bold text-sm hover:bg-violet-700 transition-colors disabled:opacity-50">
                                        {applying ? 'Mengirim...' : '📩 Kirim Lamaran'}
                                    </button>
                                </>
                            )}

                            {/* REJECTED — can re-apply */}
                            {creatorData.creatorStatus === 'REJECTED' && (
                                <p className="text-sm text-red-600 font-bold">❌ Lamaran ditolak. Kamu bisa mengajukan lagi setelah beberapa saat.</p>
                            )}

                            {/* PENDING */}
                            {creatorData.creatorStatus === 'PENDING' && (
                                <div className="text-center py-4">
                                    <div className="text-3xl mb-2">⏳</div>
                                    <p className="text-sm font-bold text-gray-700">Lamaran sedang direview admin</p>
                                    <p className="text-xs text-gray-500 mt-1">Kamu akan menerima notifikasi setelah disetujui.</p>
                                </div>
                            )}

                            {/* APPROVED — Creator Settings */}
                            {creatorData.creatorStatus === 'APPROVED' && (
                                <>
                                    {/* WD Mode */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-gray-700">🏦 Mode WD</span>
                                        </div>
                                        <select value={creatorData.wdMode || 'AUTO'} onChange={e => handleSaveSettings(e.target.value, undefined)} disabled={saving}
                                            className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white font-bold text-gray-700">
                                            <option value="AUTO">Otomatis</option>
                                            <option value="MANUAL">Manual</option>
                                        </select>
                                    </div>

                                    {/* Delay */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Clock size={16} className="text-gray-500" />
                                            <span className="text-sm font-bold text-gray-700">Delay Task</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <input type="number" min={5} max={600} value={creatorData.marketingDelaySeconds || 30}
                                                onChange={e => handleSaveSettings(undefined, parseInt(e.target.value))}
                                                className="w-16 text-xs text-center border border-gray-200 rounded-lg px-2 py-2 bg-white font-bold" />
                                            <span className="text-xs text-gray-500 font-bold">detik</span>
                                        </div>
                                    </div>

                                    {/* Inject / Reset */}
                                    <div className="flex gap-2">
                                        <button onClick={handleInject} disabled={injecting}
                                            className="flex-1 py-2.5 bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 hover:bg-emerald-600 disabled:opacity-50">
                                            <Syringe size={14} /> {injecting ? 'Injecting...' : 'Inject Demo'}
                                        </button>
                                        <button onClick={handleReset} disabled={resetting}
                                            className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 hover:bg-red-600 disabled:opacity-50">
                                            <Trash2 size={14} /> {resetting ? 'Resetting...' : 'Reset Demo'}
                                        </button>
                                    </div>

                                    {/* Referral Link */}
                                    <button onClick={copyReferral} className="w-full py-2.5 bg-violet-100 text-violet-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-violet-200">
                                        <Link2 size={14} /> Salin Link Referral
                                    </button>

                                    {/* Guide */}
                                    <button onClick={() => setShowGuide(!showGuide)} className="w-full text-left text-xs font-bold text-violet-600 hover:text-violet-800">
                                        📋 {showGuide ? 'Tutup' : 'Buka'} Panduan Bikin Konten
                                    </button>
                                    {showGuide && (
                                        <div className="bg-white rounded-xl p-3 text-xs text-gray-600 space-y-1.5 border border-violet-100">
                                            <p className="font-bold text-gray-800">Cara membuat konten GRupiah:</p>
                                            <p>1. Klik <b>"Inject Demo"</b> untuk menambah data demo</p>
                                            <p>2. Mulai <b>rekam layar</b> HP kamu 🔴</p>
                                            <p>3. Buka halaman <b>Earn</b> → kerjakan offer</p>
                                            <p>4. Tunggu beberapa detik → saldo bertambah otomatis</p>
                                            <p>5. Buka <b>Wallet</b> → ajukan penarikan</p>
                                            <p>6. Tunjukkan popup <b>berhasil!</b></p>
                                            <p>7. <b>Stop rekam</b> → upload ke TikTok/YouTube</p>
                                            <p>8. Gunakan hashtag <b>#GRupiah</b></p>
                                            <p>9. Setelah selesai → klik <b>"Reset Demo"</b></p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Quit Button */}
                <button className="w-full mt-6 bg-red-50 text-red-600 font-bold py-4 rounded-xl flex items-center justify-center gap-2 border border-red-100 hover:bg-red-100 transition-colors">
                    <LogOut size={20} />
                    <span>Keluar Sesi</span>
                </button>
            </div>

            {/* Toast */}
            {toast && (
                <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-xl text-sm font-bold shadow-lg z-[999] animate-bounce">
                    {toast}
                </div>
            )}
        </div>
    );
}
