import { useEffect, useState } from 'react';
import { adminApi } from '../api/adminClient';
import { Save, Loader2, AlertCircle, Settings as SettingsIcon } from 'lucide-react';

export default function Settings() {
    const [configs, setConfigs] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const data = await adminApi.getSettings();
            setConfigs(data);
            setError(null);
        } catch (err: any) {
            console.error('Failed to fetch config', err);
            setError('Failed to fetch settings. Ensure API is running.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setSuccessMsg(null);
            setError(null);

            await adminApi.updateSettings(configs);

            setSuccessMsg('Settings updated successfully!');
            setTimeout(() => setSuccessMsg(null), 3000);
        } catch (err: any) {
            console.error('Failed to save config', err);
            setError('Failed to save settings.');
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (key: string, value: string) => {
        setConfigs(prev => ({ ...prev, [key]: value }));
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin mb-4 text-[var(--color-admin-accent)]" />
                <p>Loading Configurations...</p>
            </div>
        );
    }

    // Keys that the admin should be able to edit directly
    const editableKeys = [
        { key: 'GLOBAL_OFFER_MULTIPLIER', label: 'Global Offer Multiplier (Hidden)', type: 'number', hint: 'Example: 1 = Normal, 10 = x10 inflated reward display.' },
        { key: 'INVITER_BONUS', label: 'Inviter Bonus (Upline)', type: 'number', hint: 'Flat IDR given to the person who invited after downline does 1 task.' },
        { key: 'INVITEE_BONUS', label: 'Invitee Welcome Bonus (Downline)', type: 'number', hint: 'Flat IDR given to new user after completing their first task.' },
        { key: 'REFERRAL_REWARD_AMOUNT', label: 'Referral Cap Amount (Display)', type: 'number', hint: 'Max amount shown on Frens Page (e.g., Rp 150.000).' },
        { key: 'AUTO_POST_ENABLED', label: 'Enable Auto Telegram Broadcast', type: 'text', hint: 'Set to "true" to allow the server to post engaging content automatically.' },
    ];

    return (
        <div className="p-4 pb-24 max-w-md mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-[var(--color-admin-accent)]/10 text-[var(--color-admin-accent)] rounded-xl">
                    <SettingsIcon size={24} />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Platform Settings</h1>
                    <p className="text-sm text-gray-500">Manage global economy variables</p>
                </div>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl flex items-start gap-2 text-sm border border-red-100">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {successMsg && (
                <div className="mb-4 p-3 bg-green-50 text-green-600 rounded-xl flex items-center justify-center font-medium text-sm border border-green-100">
                    {successMsg}
                </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                    <h2 className="font-semibold text-gray-800">Economy Parameters</h2>
                </div>

                <div className="p-4 space-y-6">
                    {editableKeys.map(item => (
                        <div key={item.key} className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">
                                {item.label}
                            </label>
                            <input
                                type={item.type}
                                value={configs[item.key] || ''}
                                onChange={(e) => handleChange(item.key, e.target.value)}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-admin-accent)] focus:bg-white transition-colors"
                            />
                            {item.hint && (
                                <p className="text-xs text-gray-500 mt-1">{item.hint}</p>
                            )}
                        </div>
                    ))}
                </div>

                <div className="p-4 bg-gray-50 border-t border-gray-100">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full bg-[var(--color-admin-accent)] hover:bg-[#3d4bb5] text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
                    >
                        {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        {saving ? 'Saving Changes...' : 'Save Configuration'}
                    </button>
                </div>
            </div>
        </div>
    );
}
