import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, TrendingUp, Target, Boxes, X, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';
import { tasksApi } from '../api/client';

const ExternalTaskCard = ({ task, providerColor }: { task: any; providerColor: 'blue' | 'purple' }) => {
    const [state, setState] = useState<'idle' | 'clicked' | 'verifying'>('idle');

    useEffect(() => {
        if (state === 'clicked') {
            const timer = setTimeout(() => {
                setState('verifying');
            }, 15000);
            return () => clearTimeout(timer);
        }
    }, [state]);

    const handlePlayClick = () => {
        // Record click silently
        tasksApi.recordClick(task.provider, task.externalId || task.id).catch(console.error);

        if (state === 'idle') {
            setState('clicked');
        }
        window.open(task.providerUrl, '_blank');
    };

    const gradient = providerColor === 'blue' ? 'from-blue-400 to-blue-600' : 'from-purple-400 to-purple-600';
    const bgIcon = providerColor === 'blue' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600';
    const btnClass = providerColor === 'blue' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700';

    return (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4 mb-3 relative overflow-hidden group">
            <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${gradient}`}></div>
            <div className={`w-12 h-12 ${bgIcon} rounded-xl flex items-center justify-center shrink-0 overflow-hidden`}>
                {task.logoUrl ? (
                    <img src={task.logoUrl} alt={task.title} className="w-full h-full object-cover" />
                ) : providerColor === 'blue' ? (
                    <TrendingUp size={24} />
                ) : (
                    <Target size={24} />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 text-sm truncate">{task.title}</h3>
                <p className="text-xs text-gray-500 mt-0.5 truncate">{task.description}</p>
                <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                    <span className="text-[10px] font-bold text-[var(--color-flash-red)] bg-red-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                        + Rp {Number(task.reward).toLocaleString('id-ID')}
                    </span>
                    {state === 'verifying' && (
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full flex items-center gap-1 whitespace-nowrap">
                            <Loader2 size={10} className="animate-spin" /> Sedang Verifikasi
                        </span>
                    )}
                </div>
            </div>
            <button
                onClick={handlePlayClick}
                className={`shrink-0 ${btnClass} text-white p-2.5 rounded-full shadow-md transition-transform group-hover:scale-105`}
            >
                {state === 'idle' ? <Play size={16} fill="white" /> : <RefreshCw size={16} />}
            </button>
        </div>
    );
};

export default function EarnPage() {
    const [activeTab, setActiveTab] = useState<'OGAds' | 'AdBlueMedia' | 'Custom'>('OGAds');
    const [tasks, setTasks] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Modal States
    const [selectedTask, setSelectedTask] = useState<any | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [proofText, setProofText] = useState("");
    const [proofFile, setProofFile] = useState<File | null>(null);

    useEffect(() => {
        const fetchTasks = async () => {
            try {
                const data = await tasksApi.getAvailable();
                setTasks(data);

                // Auto-open task if launched from deeplink start_param
                const win = window as any;
                const startParam = win.Telegram?.WebApp?.initDataUnsafe?.start_param;
                if (startParam && startParam.startsWith('task_')) {
                    const targetId = startParam.replace('task_', '');
                    const targetTask = data.find((t: any) => t.id === targetId);
                    if (targetTask) {
                        if (targetTask.provider === 'OGADS') setActiveTab('OGAds');
                        else if (targetTask.provider === 'ADBLUEMEDIA') setActiveTab('AdBlueMedia');
                        else if (targetTask.provider === 'CUSTOM') setActiveTab('Custom');

                        // Small delay before opening to allow tab switch rendering
                        setTimeout(() => setSelectedTask(targetTask), 100);
                    }
                }

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
                            {isLoading ? (
                                <p className="text-center text-sm text-gray-400">Loading tasks...</p>
                            ) : ogadsTasks.length === 0 ? (
                                <p className="text-center text-sm text-gray-400">Belum ada tugas tersedia hari ini.</p>
                            ) : (
                                ogadsTasks.map((task) => (
                                    <ExternalTaskCard key={task.id} task={task} providerColor="blue" />
                                ))
                            )}
                        </motion.div>
                    )}

                    {activeTab === 'AdBlueMedia' && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                            {isLoading ? (
                                <p className="text-center text-sm text-gray-400">Loading tasks...</p>
                            ) : adBlueTasks.length === 0 ? (
                                <p className="text-center text-sm text-gray-400">Belum ada tugas tersedia hari ini.</p>
                            ) : (
                                adBlueTasks.map((task) => (
                                    <ExternalTaskCard key={task.id} task={task} providerColor="purple" />
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
                                                    {task.userSubmissionStatus === 'PENDING' ? (
                                                        <button disabled className="text-xs font-bold bg-gray-100 text-gray-500 border border-gray-200 px-3 py-1.5 rounded-full flex items-center gap-1">
                                                            <Loader2 size={12} className="animate-spin" /> Sedang Diverifikasi
                                                        </button>
                                                    ) : task.userSubmissionStatus === 'APPROVED' ? (
                                                        <button disabled className="text-xs font-bold bg-green-100 text-green-600 border border-green-200 px-3 py-1.5 rounded-full flex items-center gap-1">
                                                            Selesai
                                                        </button>
                                                    ) : (
                                                        <button onClick={() => setSelectedTask(task)} className="text-xs font-bold bg-white text-amber-600 border border-amber-200 px-3 py-1.5 rounded-full hover:bg-amber-50">
                                                            Kerjakan
                                                        </button>
                                                    )}
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

            {/* Task Detail Modal */}
            {selectedTask && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative">
                        <button onClick={() => setSelectedTask(null)} className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 z-10 transition-colors">
                            <X size={16} />
                        </button>

                        <div className="p-6">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center shrink-0 overflow-hidden border border-amber-100">
                                    {selectedTask.logoUrl ? (
                                        <img src={selectedTask.logoUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <Boxes className="text-amber-500" size={24} />
                                    )}
                                </div>
                                <div>
                                    <h2 className="font-bold text-gray-900 text-lg leading-tight">{selectedTask.title}</h2>
                                    <div className="text-sm font-black text-amber-600">Rp {Number(selectedTask.reward).toLocaleString('id-ID')}</div>
                                </div>
                            </div>

                            <p className="text-sm text-gray-600 mb-4">{selectedTask.description}</p>

                            {selectedTask.instructions && (
                                <div className="bg-amber-50 rounded-xl p-3 mb-4 text-sm text-amber-900 border border-amber-100 max-h-32 overflow-y-auto">
                                    <span className="font-bold block mb-1">Cara Mengerjakan:</span>
                                    {selectedTask.instructions.split('\\n').map((line: string, i: number) => (
                                        <div key={i}>{line}</div>
                                    ))}
                                </div>
                            )}

                            {selectedTask.link && (
                                <button onClick={() => window.open(selectedTask.link, '_blank')} className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2.5 rounded-xl mb-4 transition-colors">
                                    Buka Link Tugas
                                </button>
                            )}

                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Upload Bukti Screenshot (Wajib)</label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={e => setProofFile(e.target.files?.[0] || null)}
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none transition-shadow file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-amber-100 file:text-amber-700 hover:file:bg-amber-200 cursor-pointer"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Username / Info Tambahan</label>
                                    <input type="text" value={proofText} onChange={e => setProofText(e.target.value)} placeholder="@username atau email" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none transition-shadow" />
                                    <p className="text-[10px] text-gray-400 mt-1">Harap isi username akun social media yang Anda gunakan</p>
                                </div>
                            </div>

                            <button
                                onClick={async () => {
                                    try {
                                        if (!proofFile) {
                                            alert("Harap pilih gambar screenshot bukti tugas terlebih dahulu.");
                                            return;
                                        }
                                        setIsSubmitting(true);

                                        // Upload to our Backend Relay (Telegram Storage)
                                        const uploadRes = await tasksApi.uploadProof(proofFile);

                                        if (!uploadRes.success) {
                                            throw new Error(uploadRes.message || "Gagal mengupload gambar ke server.");
                                        }

                                        const finalProofUrl = uploadRes.data.link;

                                        await tasksApi.submitTask(selectedTask.id, finalProofUrl, proofText);
                                        setTasks(tasks.map(t => t.id === selectedTask.id ? { ...t, userSubmissionStatus: 'PENDING' } : t));
                                        setSelectedTask(null);
                                        setProofFile(null);
                                        setProofText("");
                                    } catch (e: any) {
                                        alert(e.message || "Gagal mengirim bukti tugas. Silahkan coba lagi.");
                                    } finally {
                                        setIsSubmitting(false);
                                    }
                                }}
                                disabled={isSubmitting}
                                className="w-full text-white bg-amber-500 hover:bg-amber-600 border border-amber-600 font-bold rounded-xl text-sm px-5 py-3.5 text-center transition-all shadow-md mt-6 disabled:bg-amber-300 disabled:border-amber-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <><Loader2 size={18} className="animate-spin" /> Mengupload...</>
                                ) : "Kirim Bukti Tugas"}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
