import { useEffect, useState } from 'react';
import { adminApi } from '../api/adminClient';
import { Save, Loader2, AlertCircle, Settings2, ToggleLeft, ToggleRight } from 'lucide-react';

export default function Settings() {
    const [configs, setConfigs] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    useEffect(() => { fetchSettings(); }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const data = await adminApi.getSettings();
            setConfigs(data);
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
            await adminApi.updateSettings(configs);
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

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin mb-3 text-[var(--color-admin-accent)]" />
                <p className="text-sm">Loading settings...</p>
            </div>
        );
    }

    const editableKeys = [
        { key: 'PROVIDER_OGADS_ENABLED', label: 'OGAds', type: 'toggle', hint: 'Aktifkan/nonaktifkan OGAds offers' },
        { key: 'PROVIDER_ADBLUEMEDIA_ENABLED', label: 'AdBlueMedia', type: 'toggle', hint: 'Aktifkan/nonaktifkan AdBlueMedia offers' },
        { key: 'PROVIDER_CPAGRIP_ENABLED', label: 'CPAGrip', type: 'toggle', hint: 'Aktifkan/nonaktifkan CPAGrip offers' },
        { key: 'GLOBAL_OFFER_MULTIPLIER', label: 'Offer Multiplier', type: 'number', hint: '1 = Normal, 10 = x10 reward display' },
        { key: 'APP_REF_UPLINE', label: 'Bonus Pengundang (IDR)', type: 'number', hint: 'Bonus untuk yang mengajak setelah teman selesai 1 task' },
        { key: 'APP_REF_DOWNLINE', label: 'Bonus Teman Baru (IDR)', type: 'number', hint: 'Welcome bonus untuk user yang diundang' },
        { key: 'APP_MIN_WITHDRAW', label: 'Min. Withdraw (IDR)', type: 'number', hint: 'Minimal saldo untuk penarikan' },
        { key: 'MARKETING_OFFER_DELAY_MS', label: 'Marketing Delay (ms)', type: 'number', hint: 'Delay auto-credit marketing mode. 25000 = 25 detik' },
        { key: 'DAILY_LOGIN_REWARDS', label: 'Daily Check-in Rewards', type: 'text', hint: 'JSON array rewards per hari. Contoh: [100,200,300,400,500,750,1500]' },
        { key: 'AUTO_POST_ENABLED', label: 'Auto Broadcast', type: 'toggle', hint: 'Broadcast otomatis ke channel' },
    ];

    return (
        <div className="p-4 pb-24 max-w-md mx-auto space-y-4">
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

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                    <h2 className="font-bold text-gray-800">Economy Parameters</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Atur variabel ekonomi platform</p>
                </div>

                <div className="p-4 space-y-5">
                    {editableKeys.map(item => (
                        <div key={item.key}>
                            {item.type === 'toggle' ? (
                                <div className="flex items-center justify-between">
                                    <div>
                                        <label className="text-sm font-medium text-gray-700">{item.label}</label>
                                        {item.hint && <p className="text-[10px] text-gray-400 mt-0.5">{item.hint}</p>}
                                    </div>
                                    <button onClick={() => toggleBool(item.key)}>
                                        {configs[item.key] === 'true' ? (
                                            <ToggleRight size={32} className="text-emerald-500" />
                                        ) : (
                                            <ToggleLeft size={32} className="text-gray-300" />
                                        )}
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    <label className="block text-sm font-medium text-gray-700">{item.label}</label>
                                    <input
                                        type={item.type}
                                        value={configs[item.key] || ''}
                                        onChange={(e) => handleChange(item.key, e.target.value)}
                                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-admin-accent)] focus:bg-white transition-colors"
                                    />
                                    {item.hint && <p className="text-[10px] text-gray-400">{item.hint}</p>}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="p-4 bg-gray-50 border-t border-gray-100">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full bg-[var(--color-admin-accent)] hover:opacity-90 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-sm"
                    >
                        {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        {saving ? 'Menyimpan...' : 'Simpan Setting'}
                    </button>
                </div>
            </div>
        </div>
    );
}
