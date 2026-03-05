import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Activity, TrendingUp, TrendingDown, Users, CheckSquare,
    CreditCard, ChevronDown, ChevronUp, Check, X, Loader2,
    RefreshCw, DollarSign, Star, Zap
} from 'lucide-react';
import { adminApi } from '../api/adminClient';

function pctChange(today: number, yesterday: number): { value: string, positive: boolean } {
    if (yesterday === 0) return { value: today > 0 ? '+∞%' : '0%', positive: today >= 0 };
    const pct = ((today - yesterday) / yesterday) * 100;
    return { value: `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`, positive: pct >= 0 };
}

function formatRp(amount: number): string {
    if (amount >= 1_000_000) return `Rp ${(amount / 1_000_000).toFixed(1)}jt`;
    if (amount >= 1_000) return `Rp ${(amount / 1_000).toFixed(0)}rb`;
    return `Rp ${amount.toLocaleString('id-ID')}`;
}

export default function Dashboard() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [wdOpen, setWdOpen] = useState(false);
    const [tasksOpen, setTasksOpen] = useState(false);
    const [actionId, setActionId] = useState<string | null>(null);

    const fetchStats = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        try {
            const data = await adminApi.getDashboardStats();
            setStats(data);
        } catch (e) {
            console.error('Failed to fetch dashboard stats', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchStats();
        const interval = setInterval(() => fetchStats(), 30000);
        return () => clearInterval(interval);
    }, [fetchStats]);

    const handleWdAction = async (id: string, action: 'APPROVE' | 'REJECT') => {
        setActionId(id);
        try {
            await adminApi.actionWithdrawal(id, action);
            setStats((prev: any) => ({
                ...prev,
                pendingWithdrawals: {
                    ...prev.pendingWithdrawals,
                    list: prev.pendingWithdrawals.list.filter((w: any) => w.id !== id),
                    count: prev.pendingWithdrawals.count - 1,
                }
            }));
        } catch (e: any) {
            alert(e?.response?.data?.message || 'Action failed');
        } finally {
            setActionId(null);
        }
    };

    const handleTaskAction = async (id: string, action: 'APPROVE' | 'REJECT') => {
        setActionId(id);
        try {
            await adminApi.reviewTask(id, action);
            setStats((prev: any) => ({
                ...prev,
                pendingTasks: prev.pendingTasks.filter((t: any) => t.id !== id),
            }));
        } catch (e) {
            alert('Action failed');
        } finally {
            setActionId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin mb-3 text-[var(--color-admin-accent)]" />
                <p className="text-sm">Loading dashboard...</p>
            </div>
        );
    }

    if (!stats) return <div className="p-4 text-center text-red-500">Failed to load</div>;

    const profitChange = pctChange(stats.profit.today.total, stats.profit.yesterday.total);
    const taskChange = pctChange(stats.tasks.today, stats.tasks.yesterday);

    return (
        <div className="p-4 pb-24 max-w-md mx-auto space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-black text-gray-900">Dashboard</h1>
                    <p className="text-xs text-gray-400">Auto-refresh 30s</p>
                </div>
                <button
                    onClick={() => fetchStats(true)}
                    className={`p-2 rounded-xl bg-white shadow-sm border border-gray-100 ${refreshing ? 'animate-spin' : ''}`}
                >
                    <RefreshCw size={18} className="text-gray-500" />
                </button>
            </div>

            {/* Online Users */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                            <div className="absolute inset-0 w-3 h-3 bg-emerald-500 rounded-full animate-ping opacity-50" />
                        </div>
                        <span className="text-sm font-medium text-gray-500">Online Users</span>
                    </div>
                    <Activity size={18} className="text-emerald-500" />
                </div>
                <p className="text-3xl font-black text-gray-900 mt-2">
                    {stats.onlineUsers?.toLocaleString('id-ID')}
                </p>
                <p className="text-xs text-gray-400 mt-1">dari {stats.totalUsers?.toLocaleString()} total users</p>
            </div>

            {/* Profit Today */}
            <div className="bg-gradient-to-br from-[#FF5A00] to-[#E11C1C] rounded-2xl p-5 shadow-lg text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 -mr-6 -mt-6 w-28 h-28 bg-white/10 rounded-full blur-xl" />
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-1">
                        <DollarSign size={16} className="opacity-80" />
                        <span className="text-sm font-medium opacity-80">Profit Hari Ini</span>
                    </div>
                    <p className="text-3xl font-black">{formatRp(stats.profit.today.total)}</p>
                    <div className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-xs font-bold ${profitChange.positive ? 'bg-white/20' : 'bg-red-900/30'}`}>
                        {profitChange.positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {profitChange.value} vs kemarin
                    </div>
                </div>
            </div>

            {/* Provider Split */}
            <div className="grid grid-cols-3 gap-2">
                <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
                    <Zap size={16} className="mx-auto text-yellow-500 mb-1" />
                    <p className="text-xs text-gray-400 font-medium">OGAds</p>
                    <p className="text-sm font-black text-gray-900">{formatRp(stats.profit.today.ogads)}</p>
                </div>
                <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
                    <Zap size={16} className="mx-auto text-blue-500 mb-1" />
                    <p className="text-xs text-gray-400 font-medium">AdBlue</p>
                    <p className="text-sm font-black text-gray-900">{formatRp(stats.profit.today.adblue)}</p>
                </div>
                <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
                    <Star size={16} className="mx-auto text-purple-500 mb-1" />
                    <p className="text-xs text-gray-400 font-medium">Stars</p>
                    <p className="text-sm font-black text-gray-900">{formatRp(stats.profit.today.other)}</p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <Users size={18} className="text-blue-500 mb-2" />
                    <p className="text-2xl font-black text-gray-900">{stats.totalUsers}</p>
                    <p className="text-xs text-gray-400">Total Users</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <CheckSquare size={18} className="text-emerald-500 mb-2" />
                    <p className="text-2xl font-black text-gray-900">{stats.tasks.today}</p>
                    <div className="flex items-center gap-1">
                        <p className="text-xs text-gray-400">Tasks Today</p>
                        <span className={`text-[10px] font-bold ${taskChange.positive ? 'text-emerald-500' : 'text-red-500'}`}>
                            {taskChange.value}
                        </span>
                    </div>
                </div>
            </div>

            {/* Pending Withdrawals */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <button
                    onClick={() => setWdOpen(!wdOpen)}
                    className="w-full flex items-center justify-between p-4"
                >
                    <div className="flex items-center gap-2">
                        <CreditCard size={18} className="text-red-500" />
                        <span className="font-bold text-gray-800">Pending WDs</span>
                        {stats.pendingWithdrawals.count > 0 && (
                            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                {stats.pendingWithdrawals.count}
                            </span>
                        )}
                    </div>
                    {wdOpen ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                </button>
                <AnimatePresence>
                    {wdOpen && (
                        <motion.div
                            initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                            className="overflow-hidden border-t border-gray-100"
                        >
                            <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
                                {stats.pendingWithdrawals.list.length === 0 ? (
                                    <p className="text-center py-4 text-gray-300 text-sm">All clear ✓</p>
                                ) : stats.pendingWithdrawals.list.map((w: any) => (
                                    <div key={w.id} className="flex items-center gap-2 bg-gray-50 rounded-xl p-3">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-gray-800 truncate">
                                                @{w.user?.username || w.user?.firstName || 'Unknown'}
                                            </p>
                                            <p className="text-xs text-[#FF5A00] font-bold">
                                                Rp {Number(w.amount).toLocaleString('id-ID')}
                                            </p>
                                        </div>
                                        <div className="flex gap-1.5 shrink-0">
                                            <button
                                                disabled={actionId === w.id}
                                                onClick={() => handleWdAction(w.id, 'APPROVE')}
                                                className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 p-2 rounded-lg disabled:opacity-50"
                                            >
                                                {actionId === w.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} strokeWidth={3} />}
                                            </button>
                                            <button
                                                disabled={actionId === w.id}
                                                onClick={() => handleWdAction(w.id, 'REJECT')}
                                                className="bg-red-50 hover:bg-red-100 text-red-600 p-2 rounded-lg disabled:opacity-50"
                                            >
                                                {actionId === w.id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} strokeWidth={3} />}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Pending Custom Tasks */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <button
                    onClick={() => setTasksOpen(!tasksOpen)}
                    className="w-full flex items-center justify-between p-4"
                >
                    <div className="flex items-center gap-2">
                        <CheckSquare size={18} className="text-yellow-500" />
                        <span className="font-bold text-gray-800">Task Review</span>
                        {stats.pendingTasks?.length > 0 && (
                            <span className="bg-yellow-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                {stats.pendingTasks.length}
                            </span>
                        )}
                    </div>
                    {tasksOpen ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                </button>
                <AnimatePresence>
                    {tasksOpen && (
                        <motion.div
                            initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                            className="overflow-hidden border-t border-gray-100"
                        >
                            <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
                                {(!stats.pendingTasks || stats.pendingTasks.length === 0) ? (
                                    <p className="text-center py-4 text-gray-300 text-sm">No tasks to review ✓</p>
                                ) : stats.pendingTasks.map((t: any) => (
                                    <div key={t.id} className="flex items-center gap-2 bg-gray-50 rounded-xl p-3">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-gray-800 truncate">{t.task?.title || 'Task'}</p>
                                            <p className="text-xs text-gray-500">@{t.user?.username || t.user?.telegramId}</p>
                                        </div>
                                        <div className="flex gap-1.5 shrink-0">
                                            <button
                                                disabled={actionId === t.id}
                                                onClick={() => handleTaskAction(t.id, 'APPROVE')}
                                                className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 p-2 rounded-lg disabled:opacity-50"
                                            >
                                                {actionId === t.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} strokeWidth={3} />}
                                            </button>
                                            <button
                                                disabled={actionId === t.id}
                                                onClick={() => handleTaskAction(t.id, 'REJECT')}
                                                className="bg-red-50 hover:bg-red-100 text-red-600 p-2 rounded-lg disabled:opacity-50"
                                            >
                                                {actionId === t.id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} strokeWidth={3} />}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
