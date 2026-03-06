import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Send, Radio, MessageSquare, Timer, Loader2,
    CheckCircle2, XCircle, Users, Image, Link, Zap, List
} from 'lucide-react';
import { adminApi } from '../api/adminClient';

export default function Broadcast() {
    const [tab, setTab] = useState<'channel' | 'dm' | 'cron'>('channel');
    const [message, setMessage] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [buttonText, setButtonText] = useState('');
    const [buttonUrl, setButtonUrl] = useState('');
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState<any>(null);

    // DM-specific state
    const [dmButtonType, setDmButtonType] = useState<'none' | 'link' | 'deeplink'>('none');
    const [customTasks, setCustomTasks] = useState<any[]>([]);
    const [selectedTaskId, setSelectedTaskId] = useState('');
    const [showDefaultButton, setShowDefaultButton] = useState(true);

    // Fetch tasks when DM tab opens
    useEffect(() => {
        if (tab === 'dm' && customTasks.length === 0) {
            adminApi.getTasks().then(tasks => {
                setCustomTasks(Array.isArray(tasks) ? tasks : []);
            }).catch(console.error);
        }
    }, [tab]);

    // Update buttonUrl when deeplink task changes
    useEffect(() => {
        if (dmButtonType === 'deeplink' && selectedTaskId) {
            setButtonUrl(`https://t.me/GrupiahBot/app?startapp=task_${selectedTaskId}`);
            if (!buttonText.trim()) setButtonText('📝 Kerjakan Sekarang');
        }
    }, [dmButtonType, selectedTaskId]);

    const buildBody = () => {
        const body: any = { content: message };
        if (imageUrl.trim()) body.imageUrl = imageUrl.trim();

        if (tab === 'dm') {
            // DM: handle button based on type selection
            if (dmButtonType !== 'none' && buttonText.trim() && buttonUrl.trim()) {
                body.buttonText = buttonText.trim();
                body.buttonUrl = buttonUrl.trim();
            }
            body.showDefaultButton = showDefaultButton;
        } else {
            // Channel: use standard button fields
            if (buttonText.trim() && buttonUrl.trim()) {
                body.buttonText = buttonText.trim();
                body.buttonUrl = buttonUrl.trim();
            }
        }
        return body;
    };

    const sendToChannel = async () => {
        if (!message.trim()) return alert('Pesan tidak boleh kosong');
        setSending(true); setResult(null);
        try {
            const data = await adminApi.sendToChannel(buildBody());
            setResult({ success: true, message: '✅ Channel broadcast sent!', data });
            setMessage(''); setImageUrl(''); setButtonText(''); setButtonUrl('');
        } catch (e: any) {
            setResult({ success: false, message: e?.response?.data?.message || 'Failed to send' });
        } finally {
            setSending(false);
        }
    };

    const sendDmBlast = async () => {
        if (!message.trim()) return alert('Pesan tidak boleh kosong');
        setSending(true); setResult(null);
        try {
            const data = await adminApi.sendDmBlast(buildBody());
            setResult({ success: true, message: '✅ DM Blast selesai!', data });
            setMessage(''); setImageUrl(''); setButtonText(''); setButtonUrl('');
            setDmButtonType('none'); setSelectedTaskId('');
        } catch (e: any) {
            setResult({ success: false, message: e?.response?.data?.message || 'Failed to send blast' });
        } finally {
            setSending(false);
        }
    };

    const triggerCron = async (hour: number) => {
        setSending(true); setResult(null);
        try {
            const data = await adminApi.triggerCron(hour);
            setResult({ success: true, message: `Cron jam ${hour}:00 WIB triggered!`, data });
        } catch (e: any) {
            setResult({ success: false, message: e?.response?.data?.message || 'Failed to trigger cron' });
        } finally {
            setSending(false);
        }
    };

    const tabs = [
        { id: 'channel' as const, label: 'Channel', icon: Radio },
        { id: 'dm' as const, label: 'DM Blast', icon: Users },
        { id: 'cron' as const, label: 'Auto Cron', icon: Timer },
    ];

    return (
        <div className="p-4 pb-24 max-w-md mx-auto space-y-4">
            <h1 className="text-xl font-black text-gray-900">Broadcast</h1>

            {/* Tab Switcher */}
            <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
                {tabs.map((t) => {
                    const Icon = t.icon;
                    return (
                        <button key={t.id}
                            onClick={() => { setTab(t.id); setResult(null); }}
                            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                                }`}
                        >
                            <Icon size={14} />
                            {t.label}
                        </button>
                    );
                })}
            </div>

            {/* Channel & DM */}
            {(tab === 'channel' || tab === 'dm') && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3"
                >
                    <div className="flex items-center gap-2 mb-1">
                        <MessageSquare size={16} className="text-[var(--color-admin-accent)]" />
                        <h2 className="font-bold text-gray-800">
                            {tab === 'channel' ? 'Kirim ke Channel' : 'Blast ke Semua User'}
                        </h2>
                    </div>
                    {tab === 'dm' && (
                        <p className="text-xs text-yellow-600 bg-yellow-50 px-3 py-2 rounded-lg">
                            ⚠️ DM blast akan dikirim ke SEMUA users yang terdaftar di database.
                        </p>
                    )}

                    {/* Message (HTML) */}
                    <div>
                        <label className="text-xs text-gray-500 block mb-1">Pesan (HTML format)</label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder={'<b>Judul Bold</b>\n<i>Italic text</i>\n<a href="url">Link</a>\n\nPesan biasa...'}
                            rows={5}
                            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-admin-accent)]"
                        />
                        <p className="text-[10px] text-gray-400 mt-1">
                            Tag: {'<b>'} {'<i>'} {'<u>'} {'<code>'} {'<a href="url">text</a>'}
                        </p>
                    </div>

                    {/* Image URL */}
                    <div>
                        <label className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                            <Image size={12} /> Foto URL (opsional)
                        </label>
                        <input
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            placeholder="https://example.com/image.jpg"
                            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-admin-accent)]"
                        />
                    </div>

                    {/* Channel: Simple button fields */}
                    {tab === 'channel' && (
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                                    <Link size={12} /> Teks Tombol
                                </label>
                                <input
                                    value={buttonText}
                                    onChange={(e) => setButtonText(e.target.value)}
                                    placeholder="📱 Buka App"
                                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-admin-accent)]"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">URL Tombol</label>
                                <input
                                    value={buttonUrl}
                                    onChange={(e) => setButtonUrl(e.target.value)}
                                    placeholder="https://t.me/GRupiahBot/app"
                                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-admin-accent)]"
                                />
                            </div>
                        </div>
                    )}

                    {/* DM: Button type selector */}
                    {tab === 'dm' && (
                        <div className="space-y-3">
                            {/* Button Type */}
                            <div>
                                <label className="text-xs text-gray-500 flex items-center gap-1 mb-2">
                                    <Link size={12} /> Tombol Custom (opsional)
                                </label>
                                <div className="flex gap-1 bg-gray-50 rounded-lg p-1">
                                    {[
                                        { id: 'none' as const, label: 'Tanpa', icon: XCircle },
                                        { id: 'link' as const, label: '🔗 Link', icon: Link },
                                        { id: 'deeplink' as const, label: '⚡ Deeplink', icon: Zap },
                                    ].map((opt) => (
                                        <button key={opt.id}
                                            onClick={() => { setDmButtonType(opt.id); setButtonText(''); setButtonUrl(''); setSelectedTaskId(''); }}
                                            className={`flex-1 py-1.5 px-2 rounded-md text-[11px] font-bold transition-all ${dmButtonType === opt.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Manual Link */}
                            {dmButtonType === 'link' && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                    className="grid grid-cols-2 gap-2"
                                >
                                    <input
                                        value={buttonText}
                                        onChange={(e) => setButtonText(e.target.value)}
                                        placeholder="📱 Buka App"
                                        className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-admin-accent)]"
                                    />
                                    <input
                                        value={buttonUrl}
                                        onChange={(e) => setButtonUrl(e.target.value)}
                                        placeholder="https://..."
                                        className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-admin-accent)]"
                                    />
                                </motion.div>
                            )}

                            {/* Deeplink Task Picker */}
                            {dmButtonType === 'deeplink' && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                    className="space-y-2"
                                >
                                    <div>
                                        <label className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                                            <List size={12} /> Pilih Task
                                        </label>
                                        <select
                                            value={selectedTaskId}
                                            onChange={(e) => setSelectedTaskId(e.target.value)}
                                            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-admin-accent)]"
                                        >
                                            <option value="">-- Pilih task --</option>
                                            {customTasks.map((t: any) => (
                                                <option key={t.id} value={t.id}>
                                                    {t.title} (Rp {Number(t.reward || 0).toLocaleString('id-ID')})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <input
                                        value={buttonText}
                                        onChange={(e) => setButtonText(e.target.value)}
                                        placeholder="📝 Kerjakan Sekarang"
                                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-admin-accent)]"
                                    />
                                    {selectedTaskId && (
                                        <p className="text-[10px] text-blue-500 bg-blue-50 px-3 py-1.5 rounded-lg break-all font-mono">
                                            🔗 {buttonUrl}
                                        </p>
                                    )}
                                </motion.div>
                            )}

                            {/* Default Button Toggle */}
                            <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100">
                                <div>
                                    <p className="text-xs font-bold text-gray-700">Tombol Default "Buka Mini App"</p>
                                    <p className="text-[10px] text-gray-400">Tombol standar buka GRupiah TMA</p>
                                </div>
                                <button
                                    onClick={() => setShowDefaultButton(!showDefaultButton)}
                                    className={`w-10 h-6 rounded-full transition-colors relative ${showDefaultButton ? 'bg-emerald-500' : 'bg-gray-300'}`}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${showDefaultButton ? 'left-5' : 'left-1'}`} />
                                </button>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={tab === 'channel' ? sendToChannel : sendDmBlast}
                        disabled={sending}
                        className="w-full bg-[var(--color-admin-accent)] text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
                    >
                        {sending ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                Mengirim...
                            </>
                        ) : (
                            <>
                                <Send size={16} />
                                {tab === 'channel' ? 'Send to Channel' : 'Blast ke Semua'}
                            </>
                        )}
                    </button>
                </motion.div>
            )}

            {/* Quick Cron */}
            {tab === 'cron' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3"
                >
                    <div className="flex items-center gap-2 mb-1">
                        <Timer size={16} className="text-[var(--color-admin-accent)]" />
                        <h2 className="font-bold text-gray-800">Trigger Auto Broadcast</h2>
                    </div>
                    <p className="text-xs text-gray-400 mb-2">
                        Trigger broadcast otomatis seakan jam tertentu. Gambar + teks di-generate otomatis.
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { hour: 9, label: '09:00 WIB', desc: 'Top 10 Earners', emoji: '🌅' },
                            { hour: 15, label: '15:00 WIB', desc: 'Hot Offer', emoji: '☀️' },
                            { hour: 21, label: '21:00 WIB', desc: 'Daily Recap', emoji: '🌙' },
                        ].map((item) => (
                            <button key={item.hour}
                                onClick={() => triggerCron(item.hour)}
                                disabled={sending}
                                className="bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl p-3 text-center transition-colors disabled:opacity-50"
                            >
                                <p className="text-xl mb-1">{item.emoji}</p>
                                <p className="text-xs font-bold text-gray-800">{item.label}</p>
                                <p className="text-[10px] text-gray-400">{item.desc}</p>
                            </button>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Result */}
            {result && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className={`rounded-xl p-4 flex items-start gap-3 ${result.success ? 'bg-emerald-50 border border-emerald-100' : 'bg-red-50 border border-red-100'}`}
                >
                    {result.success ? (
                        <CheckCircle2 size={20} className="text-emerald-500 shrink-0 mt-0.5" />
                    ) : (
                        <XCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
                    )}
                    <div>
                        <p className={`text-sm font-bold ${result.success ? 'text-emerald-700' : 'text-red-700'}`}>{result.message}</p>
                        {result.data?.sent !== undefined && (
                            <div className="mt-1 text-xs text-gray-600 space-y-0.5">
                                <p>✅ Sent: {result.data.sent || 0}</p>
                                <p>❌ Failed: {result.data.failed || 0}</p>
                                <p>📊 Total: {result.data.total || 0}</p>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </div>
    );
}
