import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { adminApi } from '../api/adminClient';

export default function CustomTasks() {
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionId, setActionId] = useState<string | null>(null);

    useEffect(() => {
        const fetchTasks = async () => {
            try {
                const data = await adminApi.getPendingTasks();
                setTasks(data);
            } catch (error) {
                console.error("Failed to fetch custom tasks", error);
            } finally {
                setLoading(false);
            }
        };
        fetchTasks();
    }, []);

    const handleAction = async (id: string, action: 'APPROVE' | 'REJECT') => {
        setActionId(id);
        try {
            await adminApi.reviewTask(id, action);
            setTasks(tasks.filter(t => t.id !== id));
        } catch (error) {
            alert(`Failed to ${action} task`);
        } finally {
            setActionId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-gray-500">
                <Loader2 className="animate-spin mb-4" size={32} />
                <p>Loading pending tasks...</p>
            </div>
        );
    }

    return (
        <div className="p-4 pb-20 max-w-md mx-auto">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-xl font-bold text-gray-800">Review Tasks</h1>
                <span className="bg-yellow-100 text-yellow-700 px-2.5 py-1 rounded-full text-xs font-bold">
                    {tasks.length} req
                </span>
            </div>

            <div className="space-y-3">
                {tasks.map((task) => (
                    <motion.div
                        key={task.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex items-center gap-3"
                    >
                        {/* Thumbnail Image */}
                        <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100 shrink-0 border border-gray-200">
                            {task.proofUrl ? (
                                <img src={task.proofUrl} alt="Proof" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
                                    <ImageIcon size={20} />
                                </div>
                            )}
                            {task.proofUrl && (
                                <div className="absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer flex-col p-1 text-center">
                                    <a href={task.proofUrl} target="_blank" rel="noreferrer" className="w-full h-full flex items-center justify-center">
                                        <ImageIcon size={16} className="text-white drop-shadow-md" />
                                    </a>
                                </div>
                            )}
                        </div>

                        {/* Task Info */}
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-gray-900 text-sm truncate">{task.task?.title || 'Unknown Task'}</h3>
                            <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                                @{task.user?.username || task.user?.telegramId} • <span className="font-mono text-emerald-600 font-bold">Rp {Number(task.task?.reward || 0).toLocaleString()}</span>
                            </p>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex flex-col gap-1.5 shrink-0">
                            <button
                                disabled={actionId === task.id}
                                onClick={() => handleAction(task.id, 'APPROVE')}
                                className="bg-green-100 hover:bg-green-200 text-green-700 p-2 rounded-lg transition-colors disabled:opacity-50"
                            >
                                {actionId === task.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} strokeWidth={3} />}
                            </button>
                            <button
                                disabled={actionId === task.id}
                                onClick={() => handleAction(task.id, 'REJECT')}
                                className="bg-red-50 hover:bg-red-100 text-red-600 p-2 rounded-lg transition-colors disabled:opacity-50"
                            >
                                {actionId === task.id ? <Loader2 size={16} className="animate-spin" /> : <X size={16} strokeWidth={3} />}
                            </button>
                        </div>
                    </motion.div>
                ))}
                {tasks.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                        <Check size={48} className="mx-auto mb-2 opacity-20" />
                        <p>No tasks waiting for review.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
