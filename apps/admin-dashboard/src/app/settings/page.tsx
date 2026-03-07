"use client";

import { useState, useEffect } from 'react';
import { Settings, Save, Smartphone, ShieldCheck, Globe, Database, Loader2 } from 'lucide-react';
import { settingsApi } from '@/lib/api';

export default function SettingsPage() {
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [configs, setConfigs] = useState<Record<string, string>>({
        APP_MIN_WITHDRAW: '500000',
        APP_REF_UPLINE: '500',
        APP_REF_DOWNLINE: '250',
    });

    useEffect(() => {
        settingsApi.getAllConfigs().then(data => {
            setConfigs(prev => ({ ...prev, ...data }));
        }).catch(err => console.error(err)).finally(() => setIsLoading(false));
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await settingsApi.updateConfigs(configs);
            alert("Settings saved successfully!");
        } catch (err) {
            alert("Failed to save settings");
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleChange = (key: string, value: string) => {
        setConfigs({ ...configs, [key]: value });
    };

    return (
        <div className="p-8 max-w-5xl">
            <div className="flex items-center gap-3 mb-8">
                <Settings className="text-emerald-400" size={28} />
                <h1 className="text-2xl font-bold text-white">Master Settings</h1>
                {isLoading && <Loader2 size={24} className="text-slate-500 animate-spin ml-4" />}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Platform Settings */}
                <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-6">
                    <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <Globe size={16} />
                        Platform Configuration
                    </h2>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm text-slate-300">Minimum Withdraw (IDR)</label>
                            <input
                                type="number"
                                value={configs.APP_MIN_WITHDRAW || ''}
                                onChange={(e) => handleChange('APP_MIN_WITHDRAW', e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
                            />
                            <p className="text-xs text-slate-500">Saldo minimal agar user bisa withdraw.</p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-slate-300">Referral Commission (Upline/Pengundang)</label>
                            <input
                                type="number"
                                value={configs.APP_REF_UPLINE || ''}
                                onChange={(e) => handleChange('APP_REF_UPLINE', e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
                            />
                            <p className="text-xs text-slate-500">IDR yang didapat upline saat downline menyelesaikan task flash pertama.</p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-slate-300">Referral Bonus (Downline/Yang Diundang)</label>
                            <input
                                type="number"
                                value={configs.APP_REF_DOWNLINE || ''}
                                onChange={(e) => handleChange('APP_REF_DOWNLINE', e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
                            />
                            <p className="text-xs text-slate-500">IDR tambahan untuk user baru yang mendaftar pakai kode referral.</p>
                        </div>
                    </div>
                </div>

                {/* Security Settings */}
                <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-6">
                    <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <ShieldCheck size={16} />
                        Security & Anti-Fraud
                    </h2>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                            <div>
                                <p className="text-sm text-white font-medium">Verify Proxy/VPN</p>
                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Powered by ProxyCheck.io</p>
                            </div>
                            <div className="w-12 h-6 bg-emerald-500 rounded-full relative shadow-inner">
                                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-slate-300">Max Tasks per IP (Daily)</label>
                            <input type="number" defaultValue="5" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-400" />
                        </div>
                    </div>
                </div>

                {/* Offer Providers */}
                <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-6">
                    <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <Globe size={16} />
                        Offer Providers
                    </h2>

                    <div className="space-y-3">
                        {[
                            { key: 'PROVIDER_OGADS_ENABLED', label: 'OGAds', color: 'bg-yellow-500' },
                            { key: 'PROVIDER_ADBLUEMEDIA_ENABLED', label: 'AdBlueMedia', color: 'bg-blue-500' },
                            { key: 'PROVIDER_CPAGRIP_ENABLED', label: 'CPAGrip', color: 'bg-orange-500' },
                        ].map(p => {
                            const isOn = configs[p.key] !== 'false';
                            return (
                                <div key={p.key} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-3 h-3 rounded-full ${isOn ? p.color : 'bg-slate-600'}`} />
                                        <p className="text-sm text-white font-medium">{p.label}</p>
                                    </div>
                                    <button
                                        onClick={() => handleChange(p.key, isOn ? 'false' : 'true')}
                                        className={`w-12 h-6 rounded-full relative shadow-inner transition-colors ${isOn ? 'bg-emerald-500' : 'bg-slate-700'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isOn ? 'right-1' : 'left-1'}`} />
                                    </button>
                                </div>
                            );
                        })}
                        <p className="text-[10px] text-slate-500">Toggle providers on/off. Changes apply after Save.</p>
                    </div>
                </div>

                {/* Mobile Client Settings */}
                <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-6">
                    <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <Smartphone size={16} />
                        TMA Client Styles
                    </h2>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm text-slate-300">Primary Branding Color (Hex)</label>
                            <div className="flex gap-2">
                                <input type="text" defaultValue="#10B981" className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-400" />
                                <div className="w-10 h-10 rounded-lg bg-emerald-500 border border-slate-700" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Database Maintenance */}
                <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-6">
                    <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <Database size={16} />
                        System Maintenance
                    </h2>

                    <div className="space-y-3">
                        <button className="w-full px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 rounded-xl border border-slate-700 transition-colors uppercase tracking-widest">
                            Clear Cache (Redis)
                        </button>
                        <button className="w-full px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-xs font-bold text-rose-500 rounded-xl border border-rose-500/20 transition-colors uppercase tracking-widest">
                            Wipe Analytic Data
                        </button>
                    </div>
                </div>
            </div>

            <div className="mt-12 pt-8 border-t border-slate-800 flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-12 py-4 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-2xl transition-all shadow-xl shadow-emerald-500/20 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                >
                    {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                    {isSaving ? 'Synchronizing...' : 'Save All Settings'}
                </button>
            </div>
        </div>
    );
}
