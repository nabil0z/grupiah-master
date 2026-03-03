import { useState, useEffect } from 'react';
import { Trophy, Crown, Loader2 } from 'lucide-react';
import { userApi } from '../api/client';

export default function LeaderboardPage() {
    const [activeTab, setActiveTab] = useState<'earnings' | 'referrals'>('earnings');
    const [leaderboardData, setLeaderboardData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    const tgUser = typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user;

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                // Fetch the dual-leaderboard payload from api
                const data = await userApi.getLeaderboard();
                setLeaderboardData(data);
            } catch (err) {
                console.error("Failed to load leaderboard", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchLeaderboard();
    }, []);

    const topUsers = leaderboardData?.[activeTab]?.top || [];
    const currentUser = leaderboardData?.[activeTab]?.me || null;

    return (
        <div className="pb-24 min-h-screen bg-gray-50 flex flex-col">
            {/* Header Banner */}
            <div className="bg-gradient-to-br from-amber-400 to-orange-500 h-56 rounded-b-[2.5rem] relative overflow-hidden shadow-lg shrink-0 pt-8 px-6">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc4JyBoZWlnaHQ9JzgnPgo8cmVjdCB3aWR0aD0nOCcgaGVpZ2h0PSc4JyBmaWxsPScjZmZmJyBmaWxsLW9wYWNpdHk9JzAuMSIvPgo8cGF0aCBkPSdNMCAwaDh2OEgweicgZmlsbD0nbm9uZScvPgo8L3N2Zz4=')] opacity-20" />
                <div className="relative z-10 flex flex-col items-center text-white mt-4">
                    <Trophy size={48} className="drop-shadow-md mb-2 text-yellow-100" />
                    <h1 className="text-3xl font-black drop-shadow-md tracking-tight uppercase">
                        {activeTab === 'earnings' ? 'Sultan Mingguan' : 'Sultan Referral'}
                    </h1>
                    <p className="text-sm font-medium opacity-90 mt-1">
                        {activeTab === 'earnings' ? 'Kejar terus cuanmu dan jadilah #1!' : 'Undang pasukanmu dan kuasai tahta!'}
                    </p>
                </div>
            </div>

            {/* Tab Toggles */}
            <div className="flex bg-white rounded-xl shadow-sm p-1.5 mx-4 mt-[-20px] mb-4 z-20 relative">
                <button
                    onClick={() => setActiveTab('earnings')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'earnings' ? 'bg-amber-500 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    Rank Saldo
                </button>
                <button
                    onClick={() => setActiveTab('referrals')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'referrals' ? 'bg-amber-500 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    Rank Referral
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 px-4 relative z-20">

                {/* Top 3 Podium (Simplified) */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-6 flex justify-between items-end pb-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-full blur-3xl opacity-50 -mr-10 -mt-10 pointer-events-none" />

                    {/* Rank 2 */}
                    {topUsers[1] && (
                        <div className="flex flex-col items-center flex-1">
                            <div className="relative">
                                <img src={topUsers[1].avatar} alt="Avatar" className="w-14 h-14 rounded-full border-4 border-gray-200 bg-gray-100 z-10 relative" />
                                <div className="absolute -bottom-2 -right-2 bg-gray-300 w-6 h-6 rounded-full flex items-center justify-center border-2 border-white z-20 shadow-sm">
                                    <span className="text-[10px] font-bold text-gray-700">2</span>
                                </div>
                            </div>
                            <p className="text-[10px] font-bold mt-3 text-gray-700 truncate w-16 text-center">{topUsers[1].name}</p>
                            <p className="text-[9px] text-gray-500 font-mono mt-0.5">{topUsers[1].amount}</p>
                        </div>
                    )}

                    {/* Rank 1 */}
                    {topUsers[0] && (
                        <div className="flex flex-col items-center flex-1 -mt-4 z-10 relative">
                            <Crown size={24} className="text-yellow-500 drop-shadow-sm mb-1" />
                            <div className="relative">
                                <img src={topUsers[0].avatar} alt="Avatar" className="w-20 h-20 rounded-full border-4 border-yellow-400 bg-yellow-50 z-10 relative shadow-md" />
                                <div className="absolute -bottom-2 -right-0 left-0 mx-auto w-8 h-8 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 flex items-center justify-center border-2 border-white z-20 shadow-md">
                                    <span className="text-xs font-black text-white">1</span>
                                </div>
                            </div>
                            <p className="text-xs font-black mt-4 text-gray-900 truncate w-20 text-center">{topUsers[0].name}</p>
                            <p className="text-[10px] text-amber-600 font-bold font-mono mt-0.5">{topUsers[0].amount}</p>
                        </div>
                    )}

                    {/* Rank 3 */}
                    {topUsers[2] && (
                        <div className="flex flex-col items-center flex-1">
                            <div className="relative">
                                <img src={topUsers[2].avatar} alt="Avatar" className="w-14 h-14 rounded-full border-4 border-orange-200 bg-orange-50 z-10 relative" />
                                <div className="absolute -bottom-2 -right-2 bg-orange-300 w-6 h-6 rounded-full flex items-center justify-center border-2 border-white z-20 shadow-sm">
                                    <span className="text-[10px] font-bold text-orange-800">3</span>
                                </div>
                            </div>
                            <p className="text-[10px] font-bold mt-3 text-gray-700 truncate w-16 text-center">{topUsers[2].name}</p>
                            <p className="text-[9px] text-gray-500 font-mono mt-0.5">{topUsers[2].amount}</p>
                        </div>
                    )}
                </div>

                {/* Current User Rank (Sticky look) */}
                {currentUser && (
                    <div className="bg-slate-900 rounded-2xl p-4 shadow-md mb-4 flex items-center gap-4 text-white">
                        <div className="w-8 flex justify-center font-black text-slate-400">
                            {currentUser.rank}
                        </div>
                        <img src={tgUser?.photo_url || currentUser.avatar} alt="You" className="w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-700 object-cover" />
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-sm text-white truncate">{tgUser?.first_name || currentUser.name}</h3>
                            <p className="text-xs text-slate-400 truncate">{tgUser?.username ? `@${tgUser.username}` : currentUser.username}</p>
                        </div>
                        <div className="text-right shrink-0">
                            <p className="font-bold text-emerald-400 text-sm font-mono">{currentUser.amount}</p>
                        </div>
                    </div>
                )}

                {/* Rest of the List */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
                    {isLoading ? (
                        <div className="p-8 flex justify-center text-emerald-500">
                            <Loader2 className="animate-spin" />
                        </div>
                    ) : (
                        topUsers.slice(3).map((user: any) => (
                            <div key={user.rank} className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                                <div className="w-8 flex justify-center font-bold text-gray-400">
                                    {user.rank}
                                </div>
                                <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200" />
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-gray-900 text-sm truncate">{user.name}</h3>
                                    <p className="text-[11px] text-gray-500 mt-0.5 truncate">{user.username}</p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="font-bold text-gray-700 text-sm font-mono">{user.amount}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
