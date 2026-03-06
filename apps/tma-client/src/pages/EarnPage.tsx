import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Target, Boxes, X, Loader2, RefreshCw, Trophy, Flame, Zap, Star, ChevronRight, ClipboardList } from 'lucide-react';
import { cn } from '../lib/utils';
import { tasksApi } from '../api/client';
import { useNavigate } from 'react-router-dom';

/* ──────── Scoring Algorithm ──────── */
function scoreTask(task: any): number {
    const reward = Number(task.reward) || 0;
    // Normalize reward (higher = better)
    const rewardScore = Math.min(reward / 50000, 1) * 0.5;
    // Provider weight (varied providers rank higher)
    const providerWeight = task.provider === 'OGADS' ? 0.3 : task.provider === 'ADBLUEMEDIA' ? 0.25 : 0.2;
    // Randomize slightly so offers rotate
    const freshness = (Math.random() * 0.15);
    return rewardScore + providerWeight + freshness;
}

/* ──────── Top Featured Card ──────── */
const FeaturedCard = ({ task, rank, onPlay }: { task: any; rank: number; onPlay: () => void }) => {
    const medals = [
        { emoji: '🥇', border: 'border-amber-400', glow: 'shadow-amber-200/50', bg: 'bg-gradient-to-br from-amber-50 to-orange-50', badge: 'bg-amber-500' },
        { emoji: '🥈', border: 'border-gray-300', glow: 'shadow-gray-200/50', bg: 'bg-gradient-to-br from-gray-50 to-slate-50', badge: 'bg-gray-500' },
        { emoji: '🥉', border: 'border-orange-300', glow: 'shadow-orange-200/50', bg: 'bg-gradient-to-br from-orange-50 to-amber-50', badge: 'bg-orange-500' },
    ];
    const m = medals[rank] || medals[2];

    if (rank === 0) {
        // #1 — Large featured card
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className={`${m.bg} rounded-2xl p-4 border-2 ${m.border} shadow-lg ${m.glow} relative overflow-hidden mb-3`}
            >
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-200/20 rounded-full -mr-8 -mt-8 blur-xl"></div>
                <div className={`absolute top-3 left-3 ${m.badge} text-white text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1`}>
                    <Flame size={10} /> TOP OFFER
                </div>
                <div className="flex items-center gap-4 mt-7">
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shrink-0 overflow-hidden shadow-sm border border-gray-100">
                        {task.logoUrl ? (
                            <img src={task.logoUrl} alt={task.title} className="w-full h-full object-cover" />
                        ) : (
                            <Trophy size={28} className="text-amber-500" />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-black text-gray-900 text-base truncate">{task.title}</h3>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{task.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="text-sm font-black text-[var(--color-flash-red)]">
                                + Rp {Number(task.reward).toLocaleString('id-ID')}
                            </span>
                            <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">
                                🔥 High Payout
                            </span>
                        </div>
                    </div>
                    <button onClick={onPlay}
                        className="shrink-0 flash-gradient-bg text-white p-3 rounded-full shadow-md hover:scale-105 transition-transform"
                    >
                        <Play size={18} fill="white" />
                    </button>
                </div>
            </motion.div>
        );
    }

    // #2 & #3 — Small cards side by side
    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + rank * 0.05 }}
            className={`${m.bg} rounded-xl p-3 border ${m.border} shadow-sm relative overflow-hidden`}
        >
            <div className={`${m.badge} text-white text-[9px] font-black px-2 py-0.5 rounded-full inline-flex items-center gap-0.5 mb-2`}>
                {m.emoji} #{rank + 1}
            </div>
            <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                    {task.logoUrl ? (
                        <img src={task.logoUrl} alt={task.title} className="w-full h-full object-cover" />
                    ) : rank === 1 ? (
                        <Target size={20} className="text-gray-500" />
                    ) : (
                        <Star size={20} className="text-orange-400" />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 text-xs truncate">{task.title}</h4>
                    <span className="text-xs font-black text-[var(--color-flash-orange)]">
                        Rp {Number(task.reward).toLocaleString('id-ID')}
                    </span>
                </div>
                <button onClick={onPlay}
                    className="shrink-0 bg-white border border-gray-200 text-gray-600 p-2 rounded-full hover:bg-gray-50 transition-colors"
                >
                    <ChevronRight size={14} />
                </button>
            </div>
        </motion.div>
    );
};

/* ──────── Task Card (unified) ──────── */
const TaskCard = ({ task, onPlay }: { task: any; onPlay: () => void }) => {
    const [state, setState] = useState<'idle' | 'clicked' | 'verifying'>('idle');

    useEffect(() => {
        if (state === 'clicked') {
            const timer = setTimeout(() => setState('verifying'), 15000);
            return () => clearTimeout(timer);
        }
    }, [state]);

    const handleClick = () => {
        tasksApi.recordClick(task.provider, task.externalId || task.id).catch(console.error);
        if (task.provider === 'CUSTOM') {
            onPlay();
        } else {
            if (state === 'idle') setState('clicked');
            window.open(task.providerUrl, '_blank');
        }
    };

    const isAuto = task.provider !== 'CUSTOM';
    const stripeColor = isAuto ? 'from-[var(--color-flash-orange)] to-[var(--color-flash-red)]' : 'from-amber-400 to-amber-600';

    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3.5 relative overflow-hidden group"
        >
            <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${stripeColor}`}></div>
            <div className={`w-11 h-11 ${isAuto ? 'bg-orange-50 text-orange-500' : 'bg-amber-50 text-amber-500'} rounded-xl flex items-center justify-center shrink-0 overflow-hidden`}>
                {task.logoUrl ? (
                    <img src={task.logoUrl} alt={task.title} className="w-full h-full object-cover" />
                ) : isAuto ? (
                    <Zap size={22} />
                ) : (
                    <Boxes size={22} />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 text-sm truncate">{task.title}</h3>
                <p className="text-xs text-gray-500 mt-0.5 truncate">{task.description}</p>
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <span className="text-[10px] font-bold text-[var(--color-flash-red)] bg-red-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                        + Rp {Number(task.reward).toLocaleString('id-ID')}
                    </span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${isAuto ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                        {isAuto ? '🤖 Auto' : '📝 Manual'}
                    </span>
                    {state === 'verifying' && (
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full flex items-center gap-1 whitespace-nowrap">
                            <Loader2 size={10} className="animate-spin" /> Verifikasi
                        </span>
                    )}
                    {task.userSubmissionStatus === 'PENDING' && (
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full flex items-center gap-1 whitespace-nowrap">
                            <Loader2 size={10} className="animate-spin" /> Review
                        </span>
                    )}
                    {task.userSubmissionStatus === 'APPROVED' && (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                            ✅ Selesai
                        </span>
                    )}
                </div>
            </div>
            <button
                onClick={handleClick}
                className={`shrink-0 ${task.userSubmissionStatus === 'APPROVED'
                    ? 'bg-gray-100 text-gray-400'
                    : task.userSubmissionStatus === 'PENDING'
                        ? 'bg-amber-100 text-amber-500'
                        : isAuto
                            ? 'bg-[var(--color-flash-orange)] text-white shadow-md'
                            : 'bg-amber-500 text-white shadow-md'
                    } p-2.5 rounded-full transition-transform group-hover:scale-105`}
                disabled={task.userSubmissionStatus === 'APPROVED'}
            >
                {state === 'idle' ? <Play size={14} fill="currentColor" /> : <RefreshCw size={14} />}
            </button>
        </motion.div>
    );
};

/* ──────── Main EarnPage ──────── */
export default function EarnPage() {
    const [filter, setFilter] = useState<'all' | 'auto' | 'manual'>('all');
    const [allTasks, setAllTasks] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Modal for Custom tasks
    const [selectedTask, setSelectedTask] = useState<any | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [proofText, setProofText] = useState("");
    const [proofFile, setProofFile] = useState<File | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchTasks = async () => {
            try {
                const data = await tasksApi.getAvailable();
                // Score and sort
                const scored = (data || []).map((t: any) => ({ ...t, _score: scoreTask(t) }));
                scored.sort((a: any, b: any) => b._score - a._score);
                setAllTasks(scored);

                // Auto-open from deeplink
                const win = window as any;
                const startParam = win.Telegram?.WebApp?.initDataUnsafe?.start_param;
                if (startParam && startParam.startsWith('task_')) {
                    const targetId = startParam.replace('task_', '');
                    const target = scored.find((t: any) => t.id === targetId);
                    if (target) setTimeout(() => setSelectedTask(target), 100);
                }
            } catch (error) {
                console.error("Failed to fetch tasks", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchTasks();
    }, []);

    // Get top 3 (only non-completed tasks)
    const availableTasks = allTasks.filter((t: any) => t.userSubmissionStatus !== 'APPROVED');
    const top3 = availableTasks.slice(0, 3);

    // Filter ALL tasks (top 3 also appear in the list below)

    const filteredTasks = filter === 'all'
        ? allTasks
        : filter === 'auto'
            ? allTasks.filter((t: any) => t.provider !== 'CUSTOM')
            : allTasks.filter((t: any) => t.provider === 'CUSTOM');

    // Count uses ALL tasks so user sees accurate totals
    const autoCount = allTasks.filter(t => t.provider !== 'CUSTOM').length;
    const manualCount = allTasks.filter(t => t.provider === 'CUSTOM').length;

    const handleTaskPlay = (task: any) => {
        if (task.provider === 'CUSTOM') {
            setSelectedTask(task);
        } else {
            tasksApi.recordClick(task.provider, task.externalId || task.id).catch(console.error);
            window.open(task.providerUrl, '_blank');
        }
    };

    const filters = [
        { id: 'all' as const, label: 'Semua', count: allTasks.length },
        { id: 'auto' as const, label: '🤖 Auto', count: autoCount },
        { id: 'manual' as const, label: '📝 Manual', count: manualCount },
    ];

    return (
        <div className="pb-24 min-h-screen bg-gray-50 flex flex-col">
            {/* Header Banner */}
            <div className="flash-gradient-bg h-44 rounded-b-3xl relative overflow-hidden shadow-lg shrink-0">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc4JyBoZWlnaHQ9JzgnPgo8cmVjdCB3aWR0aD0nOCcgaGVpZ2h0PSc4JyBmaWxsPScjZmZmJyBmaWxsLW9wYWNpdHk9JzAuMScvPgo8cGF0aCBkPSdNMCAwaDh2OEgweicgZmlsbD0nbm9uZScvPgo8L3N2Zz4=')] opacity-20"></div>
                {/* History Button */}
                <div className="absolute top-4 right-5 z-20">
                    <div className="bg-black/10 hover:bg-black/20 transition-colors p-2 rounded-full cursor-pointer backdrop-blur-sm border border-white/10" onClick={() => navigate('/task-history')}>
                        <ClipboardList size={20} className="text-white opacity-80" />
                    </div>
                </div>
                <div className="p-6 relative z-10 text-white flex flex-col justify-end h-full pb-8">
                    <h1 className="text-3xl font-black mb-1 drop-shadow-md">Tugas Harian</h1>
                    <p className="text-sm font-medium opacity-90">Selesaikan tugas & dapatkan saldo instan!</p>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto px-4 -mt-6 z-20">

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <Loader2 className="w-8 h-8 animate-spin mb-3 text-[var(--color-flash-orange)]" />
                        <p className="text-sm">Memuat tugas...</p>
                    </div>
                ) : (
                    <>
                        {/* ── Top 3 Featured ── */}
                        {top3.length > 0 && (
                            <div className="mb-4">
                                {top3[0] && (
                                    <FeaturedCard
                                        task={top3[0]} rank={0}
                                        onPlay={() => handleTaskPlay(top3[0])}
                                    />
                                )}
                                {top3.length >= 2 && (
                                    <div className="grid grid-cols-2 gap-2">
                                        {top3[1] && (
                                            <FeaturedCard
                                                task={top3[1]} rank={1}
                                                onPlay={() => handleTaskPlay(top3[1])}
                                            />
                                        )}
                                        {top3[2] && (
                                            <FeaturedCard
                                                task={top3[2]} rank={2}
                                                onPlay={() => handleTaskPlay(top3[2])}
                                            />
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Filter Tabs ── */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-1.5 flex gap-1 mb-4">
                            {filters.map((f) => (
                                <button
                                    key={f.id}
                                    onClick={() => setFilter(f.id)}
                                    className={cn(
                                        "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                                        filter === f.id
                                            ? "bg-[var(--color-flash-orange)] text-white shadow"
                                            : "text-gray-500 hover:bg-gray-50"
                                    )}
                                >
                                    {f.label} ({f.count})
                                </button>
                            ))}
                        </div>

                        {/* ── Task List ── */}
                        <div className="space-y-2.5">
                            <AnimatePresence mode="popLayout">
                                {filteredTasks.length === 0 ? (
                                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                        className="text-center text-sm text-gray-400 py-10"
                                    >
                                        Tidak ada tugas di kategori ini.
                                    </motion.p>
                                ) : (
                                    filteredTasks.map((task: any) => (
                                        <TaskCard
                                            key={task.id}
                                            task={task}
                                            onPlay={() => handleTaskPlay(task)}
                                        />
                                    ))
                                )}
                            </AnimatePresence>
                        </div>
                    </>
                )}
            </div>

            {/* ── Custom Task Modal ── */}
            {selectedTask && selectedTask.provider === 'CUSTOM' && (
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
                                        type="file" accept="image/*"
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
                                        const uploadRes = await tasksApi.uploadProof(proofFile);
                                        if (!uploadRes.success) throw new Error(uploadRes.message || "Gagal mengupload gambar.");
                                        await tasksApi.submitTask(selectedTask.id, uploadRes.data.link, proofText);
                                        setAllTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, userSubmissionStatus: 'PENDING' } : t));
                                        setSelectedTask(null);
                                        setProofFile(null);
                                        setProofText("");
                                    } catch (e: any) {
                                        alert(e.message || "Gagal mengirim bukti tugas.");
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
