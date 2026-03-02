import { useState } from 'react';
import { ChevronLeft, Bell, Globe, Shield, LogOut, Moon, Volume2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SettingsPage() {
    const navigate = useNavigate();
    const tgUser = typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user;

    const [notifications, setNotifications] = useState(true);
    const [sound, setSound] = useState(true);
    const [darkMode, setDarkMode] = useState(false);

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
                <div className="w-10"></div> {/* Spacer for centering */}
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

                {/* Quit Button */}
                <button className="w-full mt-6 bg-red-50 text-red-600 font-bold py-4 rounded-xl flex items-center justify-center gap-2 border border-red-100 hover:bg-red-100 transition-colors">
                    <LogOut size={20} />
                    <span>Keluar Sesi</span>
                </button>
            </div>
        </div>
    );
}
