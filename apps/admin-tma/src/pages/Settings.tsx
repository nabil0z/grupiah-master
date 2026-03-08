import { useEffect, useState } from 'react';
import { adminApi } from '../api/adminClient';
import { Save, Loader2, AlertCircle, Settings2, ToggleLeft, ToggleRight, Zap, Users, Megaphone, Gift, Wallet, Plus, Minus, ChevronDown, ChevronRight, Timer, Film, CreditCard, ShieldCheck, XCircle, Ban } from 'lucide-react';

export default function Settings() {
    const [configs, setConfigs] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [dailyRewards, setDailyRewards] = useState<number[]>([100, 200, 300, 400, 500, 750, 1500]);
    const [creators, setCreators] = useState<any[]>([]);
    const [creatorLoading, setCreatorLoading] = useState(false);

    useEffect(() => { fetchSettings(); fetchCreators(); }, []);

    const fetchCreators = async () => {
        setCreatorLoading(true);
        try { setCreators(await adminApi.getCreators()); } catch { }
        finally { setCreatorLoading(false); }
    };

    const handleCreatorAction = async (userId: string, action: 'approve' | 'reject' | 'revoke') => {
        try {
            if (action === 'approve') await adminApi.approveCreator(userId);
            else if (action === 'reject') await adminApi.rejectCreator(userId);
            else if (action === 'revoke') {
                if (!confirm('Revoke creator? Saldo akan direset ke 0 dan semua data demo dihapus.')) return;
                await adminApi.revokeCreator(userId);
            }
            setSuccessMsg(`Creator ${action}d! ✅`);
            setTimeout(() => setSuccessMsg(null), 3000);
            fetchCreators();
        } catch { setError(`Gagal ${action} creator`); }
    };

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const data = await adminApi.getSettings();
            setConfigs(data);
            // Parse daily rewards
            try {
                const parsed = JSON.parse(data.DAILY_LOGIN_REWARDS || '[]');
                if (Array.isArray(parsed) && parsed.length > 0) setDailyRewards(parsed);
            } catch { /* keep defaults */ }
            setError(null);
        } catch {
            setError('Gagal memuat settings. Pastikan API jalan.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true); setSuccessMsg(null); setError(null);
            const toSave = { ...configs, DAILY_LOGIN_REWARDS: JSON.stringify(dailyRewards) };
            await adminApi.updateSettings(toSave);
            setSuccessMsg('✅ Settings tersimpan!');
            setTimeout(() => setSuccessMsg(null), 3000);
        } catch {
            setError('Gagal menyimpan settings.');
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (key: string, value: string) => {
        setConfigs(prev => ({ ...prev, [key]: value }));
    };

    const toggleBool = (key: string) => {
        setConfigs(prev => ({ ...prev, [key]: prev[key] === 'true' ? 'false' : 'true' }));
    };

    const updateDailyReward = (index: number, value: number) => {
        setDailyRewards(prev => prev.map((r, i) => i === index ? value : r));
    };

    const addDay = () => {
        const last = dailyRewards[dailyRewards.length - 1] || 0;
        setDailyRewards(prev => [...prev, Math.round(last * 1.5)]);
    };

    const removeDay = () => {
        if (dailyRewards.length > 1) setDailyRewards(prev => prev.slice(0, -1));
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin mb-3 text-[var(--color-admin-accent)]" />
                <p className="text-sm">Loading settings...</p>
            </div>
        );
    }

    const isOn = (key: string) => configs[key] !== 'false';

    return (
        <div className="p-4 pb-24 max-w-md mx-auto space-y-3">
            {/* Header */}
            <div className="flex items-center gap-2">
                <Settings2 size={20} className="text-[var(--color-admin-accent)]" />
                <h1 className="text-xl font-black text-gray-900">Setting</h1>
            </div>

            {error && (
                <div className="p-3 bg-red-50 text-red-600 rounded-xl flex items-start gap-2 text-sm border border-red-100">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {successMsg && (
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl text-sm font-medium text-center border border-emerald-100">
                    {successMsg}
                </div>
            )}

            {/* ─── Offer Providers ─── */}
            <Section icon={Zap} iconColor="text-yellow-500" title="Offer Providers">
                <ToggleRow label="OGAds" on={isOn('PROVIDER_OGADS_ENABLED')} onToggle={() => toggleBool('PROVIDER_OGADS_ENABLED')} dot="bg-yellow-400" />
                <ToggleRow label="AdBlueMedia" on={isOn('PROVIDER_ADBLUEMEDIA_ENABLED')} onToggle={() => toggleBool('PROVIDER_ADBLUEMEDIA_ENABLED')} dot="bg-blue-400" />
                <ToggleRow label="CPAGrip" on={isOn('PROVIDER_CPAGRIP_ENABLED')} onToggle={() => toggleBool('PROVIDER_CPAGRIP_ENABLED')} dot="bg-orange-400" />
            </Section>

            {/* ─── Ekonomi ─── */}
            <Section icon={Wallet} iconColor="text-emerald-500" title="Ekonomi">
                <InputRow label="Offer Multiplier" hint="1 = Normal, 10 = x10" value={configs.GLOBAL_OFFER_MULTIPLIER || ''} onChange={v => handleChange('GLOBAL_OFFER_MULTIPLIER', v)} type="number" />
                <InputRow label="Min. Withdraw" hint="Minimal saldo agar bisa WD (IDR)" value={configs.APP_MIN_WITHDRAW || ''} onChange={v => handleChange('APP_MIN_WITHDRAW', v)} type="number" />
                <InputRow label="Auto-hide Threshold" hint="Clicks tanpa convert → hide offer" value={configs.DEAD_OFFER_CLICK_THRESHOLD || '50'} onChange={v => handleChange('DEAD_OFFER_CLICK_THRESHOLD', v)} type="number" />
            </Section>

            {/* ─── Offer Cooldown ─── */}
            <Section icon={Timer} iconColor="text-cyan-500" title="Offer Cooldown">
                <InputRow label="Cooldown (Menit)" hint="Jeda antar-klik offer yang sama" value={configs.OFFER_COOLDOWN_MINUTES || '30'} onChange={v => handleChange('OFFER_COOLDOWN_MINUTES', v)} type="number" />
                <p className="text-[10px] text-gray-400 leading-relaxed">
                    ⏳ Setelah user klik offer, tombol akan <b>disabled</b> selama durasi ini. Mencegah spam klik ke publisher.
                </p>
            </Section>

            {/* ─── Referral ─── */}
            <Section icon={Users} iconColor="text-blue-500" title="Referral">
                <InputRow label="Bonus Pengundang" hint="IDR, setelah teman selesai 1 task" value={configs.APP_REF_UPLINE || ''} onChange={v => handleChange('APP_REF_UPLINE', v)} type="number" />
                <InputRow label="Bonus Teman Baru" hint="IDR, welcome bonus via referral" value={configs.APP_REF_DOWNLINE || ''} onChange={v => handleChange('APP_REF_DOWNLINE', v)} type="number" />
            </Section>

            {/* ─── Marketing ─── */}
            <Section icon={Megaphone} iconColor="text-orange-500" title="Marketing Mode">
                <InputRow label="Auto-credit Delay" hint="ms. 25000 = 25 detik" value={configs.MARKETING_OFFER_DELAY_MS || ''} onChange={v => handleChange('MARKETING_OFFER_DELAY_MS', v)} type="number" />
            </Section>

            {/* ─── Withdrawal Mode ─── */}
            <Section icon={CreditCard} iconColor="text-teal-500" title="Withdrawal Mode">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-700">Mode WD Global</p>
                        <p className="text-[10px] text-gray-400">AUTO = langsung approve setelah delay</p>
                    </div>
                    <select value={configs.WD_MODE || 'MANUAL'} onChange={e => handleChange('WD_MODE', e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white font-bold">
                        <option value="MANUAL">Manual</option>
                        <option value="AUTO">Otomatis</option>
                    </select>
                </div>
                {configs.WD_MODE === 'AUTO' && (
                    <InputRow label="Auto-Approve Delay" hint="menit" value={configs.WD_AUTO_DELAY_MINUTES || '5'} onChange={v => handleChange('WD_AUTO_DELAY_MINUTES', v)} type="number" />
                )}
            </Section>

            {/* ─── Creator Eligibility ─── */}
            <Section icon={ShieldCheck} iconColor="text-violet-500" title="Creator Eligibility">
                <InputRow label="Min. Usia Akun" hint="hari" value={configs.CREATOR_MIN_DAYS || '14'} onChange={v => handleChange('CREATOR_MIN_DAYS', v)} type="number" />
                <InputRow label="Min. Tugas Selesai" hint="jumlah" value={configs.CREATOR_MIN_TASKS || '5'} onChange={v => handleChange('CREATOR_MIN_TASKS', v)} type="number" />
            </Section>

            {/* ─── Creator Management ─── */}
            <CollapsibleSection icon={Film} iconColor="text-violet-500" title={`Creator Program (${creators.length})`} defaultOpen={false}>
                {creatorLoading ? (
                    <div className="flex justify-center py-4"><Loader2 size={20} className="animate-spin text-gray-400" /></div>
                ) : creators.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">Belum ada lamaran creator.</p>
                ) : (
                    <div className="space-y-3">
                        {creators.map((c: any) => (
                            <div key={c.id} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                                <div className="flex items-center justify-between mb-2">
                                    <div>
                                        <span className="text-sm font-bold text-gray-800">{c.firstName || c.username || 'Unknown'}</span>
                                        {c.username && <span className="text-xs text-gray-400 ml-1">@{c.username}</span>}
                                    </div>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.creatorStatus === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                                            c.creatorStatus === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                                        }`}>
                                        {c.creatorStatus === 'PENDING' ? '⏳ Pending' : '✅ Aktif'}
                                    </span>
                                </div>
                                {/* Channels */}
                                {c.creatorChannels && (() => {
                                    try {
                                        const ch = JSON.parse(c.creatorChannels);
                                        return (
                                            <div className="flex flex-wrap gap-1 mb-2">
                                                {ch.map((item: any, i: number) => (
                                                    <span key={i} className="text-[10px] bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full font-bold">
                                                        {item.platform}: {item.channel}
                                                    </span>
                                                ))}
                                            </div>
                                        );
                                    } catch { return null; }
                                })()}
                                {/* Action Buttons */}
                                <div className="flex gap-2">
                                    {c.creatorStatus === 'PENDING' && (
                                        <>
                                            <button onClick={() => handleCreatorAction(c.id, 'approve')}
                                                className="flex-1 py-1.5 text-[10px] font-bold bg-emerald-500 text-white rounded-lg flex items-center justify-center gap-1">
                                                <ShieldCheck size={12} /> Approve
                                            </button>
                                            <button onClick={() => handleCreatorAction(c.id, 'reject')}
                                                className="flex-1 py-1.5 text-[10px] font-bold bg-red-500 text-white rounded-lg flex items-center justify-center gap-1">
                                                <XCircle size={12} /> Reject
                                            </button>
                                        </>
                                    )}
                                    {c.creatorStatus === 'APPROVED' && (
                                        <button onClick={() => handleCreatorAction(c.id, 'revoke')}
                                            className="flex-1 py-1.5 text-[10px] font-bold bg-red-100 text-red-600 rounded-lg flex items-center justify-center gap-1 border border-red-200">
                                            <Ban size={12} /> Revoke Creator
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CollapsibleSection>

            {/* ─── Daily Check-in (Collapsible) ─── */}
            <CollapsibleSection icon={Gift} iconColor="text-purple-500" title="Daily Check-in Rewards" defaultOpen={false}>
                <div className="space-y-2">
                    {dailyRewards.map((reward, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-gray-400 w-12 shrink-0">Hari {i + 1}</span>
                            <div className="relative flex-1">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">Rp</span>
                                <input
                                    type="number"
                                    value={reward}
                                    onChange={e => updateDailyReward(i, parseInt(e.target.value) || 0)}
                                    className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-right font-mono focus:outline-none focus:ring-2 focus:ring-purple-300 focus:bg-white transition-colors"
                                />
                            </div>
                        </div>
                    ))}
                    <div className="flex gap-2 pt-1">
                        <button onClick={addDay} className="flex-1 flex items-center justify-center gap-1 py-2 text-xs font-bold text-purple-600 bg-purple-50 rounded-lg border border-purple-100 active:scale-95 transition-transform">
                            <Plus size={14} /> Tambah Hari
                        </button>
                        {dailyRewards.length > 1 && (
                            <button onClick={removeDay} className="flex items-center justify-center gap-1 px-4 py-2 text-xs font-bold text-red-500 bg-red-50 rounded-lg border border-red-100 active:scale-95 transition-transform">
                                <Minus size={14} />
                            </button>
                        )}
                    </div>
                </div>
            </CollapsibleSection>

            {/* ─── Broadcast ─── */}
            <Section icon={Megaphone} iconColor="text-indigo-500" title="Broadcast">
                <ToggleRow label="Auto Broadcast" on={isOn('AUTO_POST_ENABLED')} onToggle={() => toggleBool('AUTO_POST_ENABLED')} sub="Kirim otomatis ke channel" />
            </Section>

            {/* Spacer for sticky button */}
            <div className="h-16" />

            {/* ─── Sticky Save Button (above navbar) ─── */}
            <div className="fixed bottom-16 left-0 right-0 p-3 bg-white/90 backdrop-blur-lg border-t border-gray-100 z-40">
                <div className="max-w-md mx-auto">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[var(--color-admin-accent)] text-white text-sm font-bold rounded-xl disabled:opacity-50 shadow-lg active:scale-[0.98] transition-all"
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        {saving ? 'Menyimpan...' : '💾 Simpan Semua Pengaturan'}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ── Sub-components ── */

function Section({ icon: Icon, iconColor, title, children }: { icon: any; iconColor: string; title: string; children: React.ReactNode }) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-50 flex items-center gap-2 bg-gray-50/50">
                <Icon size={14} className={iconColor} />
                <h2 className="font-bold text-gray-700 text-xs uppercase tracking-wider">{title}</h2>
            </div>
            <div className="px-4 py-3 space-y-3">
                {children}
            </div>
        </div>
    );
}

function CollapsibleSection({ icon: Icon, iconColor, title, children, defaultOpen = true }: { icon: any; iconColor: string; title: string; children: React.ReactNode; defaultOpen?: boolean }) {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-4 py-2.5 border-b border-gray-50 flex items-center justify-between bg-gray-50/50 active:bg-gray-100 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Icon size={14} className={iconColor} />
                    <h2 className="font-bold text-gray-700 text-xs uppercase tracking-wider">{title}</h2>
                </div>
                {isOpen ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
            </button>
            {isOpen && (
                <div className="px-4 py-3 space-y-3">
                    {children}
                </div>
            )}
        </div>
    );
}

function ToggleRow({ label, on, onToggle, dot, sub }: { label: string; on: boolean; onToggle: () => void; dot?: string; sub?: string }) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                {dot && <div className={`w-2 h-2 rounded-full ${on ? dot : 'bg-gray-300'}`} />}
                <div>
                    <p className="text-sm font-medium text-gray-700">{label}</p>
                    {sub && <p className="text-[10px] text-gray-400">{sub}</p>}
                </div>
            </div>
            <button onClick={onToggle}>
                {on ? <ToggleRight size={30} className="text-emerald-500" /> : <ToggleLeft size={30} className="text-gray-300" />}
            </button>
        </div>
    );
}

function InputRow({ label, hint, value, onChange, type = 'text' }: { label: string; hint?: string; value: string; onChange: (v: string) => void; type?: string }) {
    return (
        <div className="space-y-1">
            <div className="flex items-baseline justify-between">
                <label className="text-sm font-medium text-gray-700">{label}</label>
                {hint && <span className="text-[10px] text-gray-400">{hint}</span>}
            </div>
            <input
                type={type}
                value={value}
                onChange={e => onChange(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-admin-accent)] focus:bg-white transition-colors"
            />
        </div>
    );
}
