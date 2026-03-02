import { useState, useEffect } from 'react';
import { ShieldCheck, LogOut, ChevronRight, User, Settings as SettingsIcon, Bell } from 'lucide-react';
import { userApi } from '../api/client';

export default function ProfilePage() {
    const [profile, setProfile] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    const tgUser = typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user;

    useEffect(() => {
        const loadProfile = async () => {
            try {
                const data = await userApi.getProfile();
                setProfile(data);
            } catch (err) {
                console.error("Failed to load profile", err);
                // Fallback dummy for testing
                setProfile({
                    firstName: "Agus",
                    lastName: "Degen",
                    username: "degen_hunter",
                    referralCode: "ref_degen99"
                });
            } finally {
                setIsLoading(false);
            }
        };
        loadProfile();
    }, []);
    return (
        <div className="pb-24 min-h-screen bg-gray-50 flex flex-col">
            {/* Profile Header */}
            <div className="bg-white pt-12 pb-8 px-6 rounded-b-[2.5rem] shadow-sm border-b border-gray-100 flex flex-col items-center relative overflow-hidden">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 p-1 mb-4 relative shadow-md">
                    <img src={tgUser?.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.username || 'Felix'}`} alt="Profile" className="w-full h-full rounded-full bg-white object-cover" />
                    <div className="absolute bottom-0 right-0 bg-emerald-500 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center shadow-sm">
                        <ShieldCheck size={12} className="text-white" />
                    </div>
                </div>
                <h1 className="text-xl font-black text-gray-900">
                    {isLoading ? '...' : (tgUser?.first_name ? `${tgUser.first_name} ${tgUser.last_name || ''}`.trim() : `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim())}
                </h1>
                <p className="text-sm text-gray-500 font-medium">@{tgUser?.username || profile?.username || ''}</p>

                <div className="mt-6 flex gap-2 w-full max-w-xs">
                    <div className="flex-1 bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                        <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Status</span>
                        <span className="block text-sm font-black text-emerald-600">Terverifikasi</span>
                    </div>
                    <div className="flex-1 bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                        <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Tugas Selesai</span>
                        <span className="block text-sm font-black text-blue-600">42</span>
                    </div>
                </div>
            </div>

            {/* Menu List */}
            <div className="flex-1 px-4 mt-6 space-y-4">

                {/* Settings Group */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
                    <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                                <User size={20} />
                            </div>
                            <span className="font-bold text-gray-700 text-sm">Informasi Akun</span>
                        </div>
                        <ChevronRight size={18} className="text-gray-300" />
                    </button>
                    <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
                                <Bell size={20} />
                            </div>
                            <span className="font-bold text-gray-700 text-sm">Notifikasi</span>
                        </div>
                        <ChevronRight size={18} className="text-gray-300" />
                    </button>
                    <button onClick={() => window.location.href = '/settings'} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center">
                                <SettingsIcon size={20} />
                            </div>
                            <span className="font-bold text-gray-700 text-sm">Pengaturan Lainnya</span>
                        </div>
                        <ChevronRight size={18} className="text-gray-300" />
                    </button>
                </div>

                {/* Referral Group */}
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-md border border-emerald-400 overflow-hidden text-white p-5 relative">
                    <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-white opacity-10 rounded-full blur-xl"></div>
                    <h2 className="font-black text-lg mb-1 relative z-10">Undang Teman</h2>
                    <p className="text-emerald-100 text-xs mb-4 relative z-10">Dapatkan Rp 150.000 untuk setiap teman yang mendaftar dan menyelesaikan 1 Task.</p>

                    <div className="bg-white/20 backdrop-blur-md rounded-xl p-3 flex justify-between items-center border border-white/20 relative z-10">
                        <div>
                            <span className="block text-[10px] text-emerald-100 font-bold uppercase tracking-wider mb-0.5">Sultan Referral</span>
                            <span className="font-mono font-bold text-sm">{isLoading ? '...' : profile?.referralCode}</span>
                        </div>
                        <button className="bg-white text-emerald-700 text-xs font-bold px-4 py-2 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                            Salin Link
                        </button>
                    </div>
                </div>

                {/* Danger Zone */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <button className="w-full flex items-center justify-between p-4 hover:bg-red-50 transition-colors group">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center group-hover:bg-red-100 transition-colors">
                                <LogOut size={20} />
                            </div>
                            <span className="font-bold text-red-600 text-sm">Keluar (Disconnect)</span>
                        </div>
                    </button>
                </div>

            </div>
        </div>
    );
}
