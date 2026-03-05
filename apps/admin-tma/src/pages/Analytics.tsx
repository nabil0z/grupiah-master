import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    BarChart3, Zap, Star, Activity, Loader2,
    RefreshCw, MessageCircle, Save
} from 'lucide-react';
import { adminApi } from '../api/adminClient';

function formatRp(amount: number): string {
    if (amount >= 1_000_000) return `Rp ${(amount / 1_000_000).toFixed(1)}jt`;
    if (amount >= 1_000) return `Rp ${(amount / 1_000).toFixed(0)}rb`;
    return `Rp ${amount.toLocaleString('id-ID')}`;
}

export default function Analytics() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [adminGroupId, setAdminGroupId] = useState('');
    const [alertEnabled, setAlertEnabled] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [stats, settings] = await Promise.all([
                adminApi.getDashboardStats(),
                adminApi.getSettings().catch(() => ({}))
            ]);
            setData(stats);
            setAdminGroupId(settings?.ADMIN_GROUP_ID || '');
            setAlertEnabled(settings?.ADMIN_GROUP_ALERTS === 'true');
        } catch (e) {
            console.error('Failed to fetch analytics', e);
        } finally {
            setLoading(false);
        }
    };

    const saveAlertSettings = async () => {
        setSaving(true);
        try {
            await adminApi.updateSettings({
                ADMIN_GROUP_ID: adminGroupId,
                ADMIN_GROUP_ALERTS: alertEnabled ? 'true' : 'false'
            });
        } catch (e) {
            alert('Failed to save');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin mb-3 text-[var(--color-admin-accent)]" />
                <p className="text-sm">Loading analytics...</p>
            </div>
        );
    }

    if (!data) return <div className="p-4 text-center text-red-500">Failed to load</div>;

    const providers = [
        { name: 'OGAds', icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-50', profit: data.profit.today.ogads, yesterdayProfit: data.profit.yesterday.ogads },
        { name: 'AdBlue', icon: Zap, color: 'text-blue-500', bg: 'bg-blue-50', profit: data.profit.today.adblue, yesterdayProfit: data.profit.yesterday.adblue },
        { name: 'Stars', icon: Star, color: 'text-purple-500', bg: 'bg-purple-50', profit: data.profit.today.other, yesterdayProfit: data.profit.yesterday.other },
    ];

    const providerStatsMap = (data.providerStats || []).reduce((acc: any, s: any) => {
        acc[s.provider] = { clicks: s._sum?.clicks || 0, completions: s._sum?.completions || 0 };
        return acc;
    }, {});

    return (
        <div className="p-4 pb-24 max-w-md mx-auto space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <BarChart3 size={20} className="text-[var(--color-admin-accent)]" />
                    <h1 className="text-xl font-black text-gray-900">Analytics</h1>
                </div>
                <button onClick={fetchData} className="p-2 rounded-xl bg-white shadow-sm border border-gray-100">
                    <RefreshCw size={16} className="text-gray-500" />
                </button>
            </div>

            {/* Provider Cards */}
            <div className="space-y-3">
                {providers.map((p) => {
                    const stats = providerStatsMap[p.name.toUpperCase()] || providerStatsMap[p.name.toUpperCase().replace('ADBLUE', 'ADBLUEMEDIA')] || { clicks: 0, completions: 0 };
                    const cr = stats.clicks > 0 ? ((stats.completions / stats.clicks) * 100).toFixed(1) : '0';
                    const pctChange = p.yesterdayProfit > 0
                        ? (((p.profit - p.yesterdayProfit) / p.yesterdayProfit) * 100).toFixed(1)
                        : p.profit > 0 ? '+∞' : '0';
                    const isPositive = p.profit >= p.yesterdayProfit;
                    const Icon = p.icon;

                    return (
                        <motion.div key={p.name} whileTap={{ scale: 0.98 }}
                            className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className={`${p.bg} ${p.color} p-2 rounded-xl`}>
                                        <Icon size={18} />
                                    </div>
                                    <span className="font-bold text-gray-800">{p.name}</span>
                                </div>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                                    {isPositive ? '↑' : '↓'} {pctChange}%
                                </span>
                            </div>
                            <div className="grid grid-cols-4 gap-2 text-center">
                                <div>
                                    <p className="text-lg font-black text-gray-900">{formatRp(p.profit)}</p>
                                    <p className="text-[10px] text-gray-400">Revenue</p>
                                </div>
                                <div>
                                    <p className="text-lg font-black text-gray-900">{stats.clicks}</p>
                                    <p className="text-[10px] text-gray-400">Clicks</p>
                                </div>
                                <div>
                                    <p className="text-lg font-black text-gray-900">{stats.completions}</p>
                                    <p className="text-[10px] text-gray-400">Completions</p>
                                </div>
                                <div>
                                    <p className="text-lg font-black text-gray-900">{cr}%</p>
                                    <p className="text-[10px] text-gray-400">CR</p>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Live Feed */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                    <Activity size={16} className="text-emerald-500" />
                    <h2 className="font-bold text-gray-800">Live Postback Feed</h2>
                </div>
                <div className="max-h-48 overflow-y-auto">
                    {(!data.profit.today.total && !data.profit.yesterday.total) ? (
                        <p className="text-center py-6 text-gray-300 text-sm">No postbacks yet</p>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {/* Placeholder: real feed would come from live postbacks */}
                            <div className="px-4 py-3 flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-700">OGAds Postback</p>
                                    <p className="text-[10px] text-gray-400">Today's total from all providers</p>
                                </div>
                                <span className="text-sm font-bold text-emerald-600">{formatRp(data.profit.today.total)}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Admin Group Alerts */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-center gap-2 mb-3">
                    <MessageCircle size={16} className="text-[var(--color-admin-accent)]" />
                    <h2 className="font-bold text-gray-800">Admin Group Alerts</h2>
                </div>
                <p className="text-xs text-gray-400 mb-3">
                    Kirim notifikasi event penting ke grup admin. Bot harus ada di grup tersebut.
                </p>
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700">Alerts</label>
                        <button
                            onClick={() => setAlertEnabled(!alertEnabled)}
                            className={`relative w-12 h-6 rounded-full transition-colors ${alertEnabled ? 'bg-emerald-500' : 'bg-gray-300'}`}
                        >
                            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${alertEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                        </button>
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 block mb-1">Group/Chat ID</label>
                        <input
                            value={adminGroupId}
                            onChange={(e) => setAdminGroupId(e.target.value)}
                            placeholder="-100123456789"
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-admin-accent)]"
                        />
                    </div>
                    <button
                        onClick={saveAlertSettings}
                        disabled={saving}
                        className="w-full bg-[var(--color-admin-accent)] text-white py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}
