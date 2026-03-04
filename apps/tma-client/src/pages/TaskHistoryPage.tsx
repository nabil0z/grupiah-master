import { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle2, Clock, XCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { tasksApi } from '../api/client';

interface TaskHistory {
    id: string;
    taskId: string;
    title: string;
    description: string;
    provider: string;
    reward: number;
    status: string;
    createdAt: string;
}

export default function TaskHistoryPage() {
    const [tasks, setTasks] = useState<TaskHistory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        tasksApi.getMyTasks()
            .then((data: TaskHistory[]) => setTasks(data))
            .catch(err => console.error('Failed to load task history', err))
            .finally(() => setIsLoading(false));
    }, []);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'APPROVED': return <CheckCircle2 size={18} className="text-emerald-500" />;
            case 'PENDING': return <Clock size={18} className="text-amber-500" />;
            case 'REJECTED': return <XCircle size={18} className="text-red-500" />;
            default: return <Clock size={18} className="text-gray-400" />;
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'APPROVED': return 'Selesai';
            case 'PENDING': return 'Menunggu';
            case 'REJECTED': return 'Ditolak';
            default: return status;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'APPROVED': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'PENDING': return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'REJECTED': return 'bg-red-50 text-red-700 border-red-200';
            default: return 'bg-gray-50 text-gray-700 border-gray-200';
        }
    };

    const totalEarned = tasks
        .filter(t => t.status === 'APPROVED')
        .reduce((sum, t) => sum + t.reward, 0);

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            {/* Header */}
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 pt-8 pb-10 px-5 rounded-b-[2rem] text-white shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>

                {/* Back Button */}
                <button onClick={() => navigate('/earn')} className="absolute top-4 left-4 bg-black/10 hover:bg-black/20 transition-colors p-2 rounded-full z-20 backdrop-blur-sm border border-white/10">
                    <ArrowLeft size={20} className="text-white" />
                </button>

                <div className="text-center relative z-10 pt-4">
                    <h1 className="text-2xl font-extrabold tracking-tight">Riwayat Task</h1>
                    <p className="text-emerald-100 text-sm mt-1 opacity-90">
                        {tasks.length} task dikerjakan
                    </p>
                    <div className="mt-3 bg-white/20 rounded-xl py-2 px-4 inline-block backdrop-blur-sm border border-white/20">
                        <span className="text-xs text-white/80">Total Earned</span>
                        <p className="text-lg font-bold">Rp {totalEarned.toLocaleString('id-ID')}</p>
                    </div>
                </div>
            </div>

            {/* Task List */}
            <div className="px-4 -mt-4 relative z-20">
                {isLoading ? (
                    <div className="flex justify-center items-center py-16">
                        <Loader2 className="animate-spin text-emerald-500" size={32} />
                    </div>
                ) : tasks.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
                        <p className="text-gray-400 text-sm">Belum ada task yang dikerjakan</p>
                        <button onClick={() => navigate('/earn')} className="mt-3 text-emerald-600 font-medium text-sm hover:underline">
                            Mulai kerjakan task →
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {tasks.map(task => (
                            <div key={task.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
                                <div className="shrink-0">
                                    {getStatusIcon(task.status)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-gray-900 text-sm truncate">{task.title}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] text-gray-400 uppercase tracking-wider">{task.provider}</span>
                                        <span className="text-gray-300">·</span>
                                        <span className="text-[10px] text-gray-400">
                                            {new Date(task.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="font-bold text-sm text-gray-900">+Rp {task.reward.toLocaleString('id-ID')}</p>
                                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${getStatusColor(task.status)}`}>
                                        {getStatusLabel(task.status)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
