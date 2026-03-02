import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, TrendingUp, Target, Boxes } from 'lucide-react';
import { cn } from '../lib/utils';
import { tasksApi } from '../api/client';

export default function EarnPage() {
    const [activeTab, setActiveTab] = useState<'OGAds' | 'AdBlueMedia' | 'Custom'>('OGAds');
    const [tasks, setTasks] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchTasks = async () => {
            try {
                const data = await tasksApi.getAvailable();
                setTasks(data);
            } catch (error) {
                console.error("Failed to fetch tasks", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchTasks();
    }, []);

    const ogadsTasks = tasks.filter(t => t.provider === 'OGADS');
    const adBlueTasks = tasks.filter(t => t.provider === 'ADBLUEMEDIA');
    const customTasks = tasks.filter(t => t.provider === 'CUSTOM');

    const tabs = [
        { id: 'OGAds', label: 'Survei Premium' },
        { id: 'AdBlueMedia', label: 'Tugas Ekstra' },
        { id: 'Custom', label: 'Tugas VIP' },
    ];

    return (
        <div className="pb-24 min-h-screen bg-gray-50 flex flex-col">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-[var(--color-flash-red)] to-pink-600 h-48 rounded-b-3xl relative overflow-hidden shadow-lg shrink-0">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc4JyBoZWlnaHQ9JzgnPgo8cmVjdCB3aWR0aD0nOCcgaGVpZ2h0PSc4JyBmaWxsPScjZmZmJyBmaWxsLW9wYWNpdHk9JzAuMScvPgo8cGF0aCBkPSdNMCAwaDh2OEgweicgZmlsbD0nbm9uZScvPgo8L3N2Zz4=')] opacity-20"></div>
                <div className="p-6 relative z-10 text-white flex flex-col justify-end h-full h-full pb-8">
                    <h1 className="text-3xl font-black mb-1 drop-shadow-md">Tugas Harian</h1>
                    <p className="text-sm font-medium opacity-90">Selesaikan tugas & dapatkan saldo instan!</p>
                </div>
            </div>

            {/* Main Content Area - Scrollable */}
            <div className="flex-1 overflow-y-auto px-4 -mt-6 z-20">
                {/* Categories / Tabs */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-1.5 flex gap-1 mb-6">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={cn(
                                "flex-1 py-2 text-sm font-bold rounded-lg transition-colors",
                                activeTab === tab.id
                                    ? "bg-[var(--color-flash-orange)] text-white shadow"
                                    : "text-gray-500 hover:bg-gray-50"
                            )}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Task List Content */}
                <div className="space-y-4">
                    {activeTab === 'OGAds' && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                            <p className="text-xs text-center text-gray-500 mb-4 font-medium uppercase tracking-widest">Sponsored by OGAds</p>
                            {isLoading ? (
                                <p className="text-center text-sm text-gray-400">Loading tasks...</p>
                            ) : ogadsTasks.length === 0 ? (
                                <p className="text-center text-sm text-gray-400">Belum ada tugas tersedia hari ini.</p>
                            ) : (
                                ogadsTasks.map((task) => (
                                    <div key={task.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4 mb-3 relative overflow-hidden group">
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-400 to-blue-600"></div>
                                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
                                            {task.logoUrl ? (
                                                <img src={task.logoUrl} alt={task.title} className="w-full h-full object-cover" />
                                            ) : (
                                                <TrendingUp size={24} />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-gray-900 text-sm truncate">{task.title}</h3>
                                            <p className="text-xs text-gray-500 mt-0.5 truncate">{task.description}</p>
                                            <div className="flex items-center gap-1 mt-1.5">
                                                <span className="text-[10px] font-bold text-[var(--color-flash-red)] bg-red-50 px-2 py-0.5 rounded-full">
                                                    + Rp {Number(task.reward).toLocaleString('id-ID')}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => window.open(task.providerUrl, '_blank')}
                                            className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-full shadow-md transition-transform group-hover:scale-105"
                                        >
                                            <Play size={16} fill="white" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </motion.div>
                    )}

                    {activeTab === 'AdBlueMedia' && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                            <p className="text-xs text-center text-gray-500 mb-4 font-medium uppercase tracking-widest">Sponsored by AdBlueMedia</p>
                            {isLoading ? (
                                <p className="text-center text-sm text-gray-400">Loading tasks...</p>
                            ) : adBlueTasks.length === 0 ? (
                                <p className="text-center text-sm text-gray-400">Belum ada tugas tersedia hari ini.</p>
                            ) : (
                                adBlueTasks.map((task) => (
                                    <div key={task.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4 relative overflow-hidden group mb-3">
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-400 to-purple-600"></div>
                                        <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
                                            {task.logoUrl ? (
                                                <img src={task.logoUrl} alt={task.title} className="w-full h-full object-cover" />
                                            ) : (
                                                <Target size={24} />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-gray-900 text-sm truncate">{task.title}</h3>
                                            <p className="text-xs text-gray-500 mt-0.5 truncate">{task.description}</p>
                                            <div className="flex items-center gap-1 mt-1.5">
                                                <span className="text-[10px] font-bold text-[var(--color-flash-red)] bg-red-50 px-2 py-0.5 rounded-full">
                                                    + Rp {Number(task.reward).toLocaleString('id-ID')}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => window.open(task.providerUrl, '_blank')}
                                            className="shrink-0 bg-purple-600 hover:bg-purple-700 text-white p-2.5 rounded-full shadow-md transition-transform group-hover:scale-105"
                                        >
                                            <Play size={16} fill="white" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </motion.div>
                    )}

                    {activeTab === 'Custom' && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                            <p className="text-xs text-center text-gray-500 mb-4 font-medium uppercase tracking-widest">Tugas Spesial</p>
                            {isLoading ? (
                                <p className="text-center text-sm text-gray-400">Loading tasks...</p>
                            ) : customTasks.length === 0 ? (
                                <p className="text-center text-sm text-gray-400">Belum ada tugas custom hari ini.</p>
                            ) : (
                                customTasks.map((task) => (
                                    <div key={task.id} className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-2xl p-4 border border-amber-200 shadow-sm relative overflow-hidden mb-3">
                                        <div className="absolute top-0 right-0 p-2">
                                            <div className="flex gap-1">
                                                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-ping"></span>
                                            </div>
                                        </div>
                                        <div className="flex gap-3 items-start">
                                            {/* Replaced the original icon div with the new conditional rendering */}
                                            <div className="p-3 bg-gray-100/50 rounded-xl relative group-hover:bg-amber-100/10 transition-colors">
                                                <div className="absolute inset-0 bg-amber-200/20 blur-md rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                                {task.logoUrl ? (
                                                    <img src={task.logoUrl} alt={task.title} className="w-6 h-6 object-cover rounded-md relative z-10" />
                                                ) : (
                                                    <Boxes className="w-6 h-6 text-amber-500 relative z-10 group-hover:scale-110 transition-transform" />
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="font-bold text-gray-900 text-sm mb-1">{task.title}</h3>
                                                <p className="text-xs text-gray-600 leading-relaxed mb-3">
                                                    {task.description}
                                                </p>
                                                <div className="flex justify-between items-center mt-2">
                                                    <span className="font-black text-amber-600 text-sm">Rp {Number(task.reward).toLocaleString('id-ID')}</span>
                                                    <button className="text-xs font-bold bg-white text-amber-600 border border-amber-200 px-3 py-1.5 rounded-full hover:bg-amber-50">
                                                        Kerjakan
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
}
