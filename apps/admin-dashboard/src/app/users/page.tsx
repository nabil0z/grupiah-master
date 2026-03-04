"use client";

import { useState, useEffect } from "react";
import { Search, Ban, ShieldCheck, Coins, Loader2, Megaphone, Syringe, X, Plus, Minus, Trash2 } from "lucide-react";
import { usersApi } from "@/lib/api";

type UserData = {
    id: string;
    telegramId: string;
    username?: string;
    firstName?: string;
    role: string;
    isBanned: boolean;
    isMarketingAcc?: boolean;
    wallet?: { balance: number | string };
};

export default function UserManagement() {
    const [searchTerm, setSearchTerm] = useState("");
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionId, setActionId] = useState<string | null>(null);

    // Modal states
    const [balanceModal, setBalanceModal] = useState<{ userId: string; username: string } | null>(null);
    const [balanceAmount, setBalanceAmount] = useState<string>("");
    const [balanceDesc, setBalanceDesc] = useState<string>("");
    const [balanceLoading, setBalanceLoading] = useState(false);

    const [injectModal, setInjectModal] = useState<{ userId: string; username: string } | null>(null);
    const [injectTasks, setInjectTasks] = useState("5");
    const [injectWDs, setInjectWDs] = useState("3");
    const [injectRefs, setInjectRefs] = useState("10");
    const [injectLoading, setInjectLoading] = useState(false);

    const [toast, setToast] = useState<{ type: string; text: string } | null>(null);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const data = await usersApi.getUsers();
                setUsers(data);
            } catch (error) {
                console.error("Failed to load users:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, []);

    const showToast = (type: string, text: string) => {
        setToast({ type, text });
        setTimeout(() => setToast(null), 3000);
    };

    const handleToggleBan = async (id: string) => {
        setActionId(id);
        try {
            const updated = await usersApi.toggleBan(id);
            setUsers(users.map(u => u.id === id ? { ...u, isBanned: updated.isBanned } : u));
            showToast('success', `User ${updated.isBanned ? 'banned' : 'unbanned'} successfully`);
        } catch (error) {
            showToast('error', 'Failed to update ban status');
        } finally {
            setActionId(null);
        }
    };

    const handleToggleMarketing = async (id: string) => {
        setActionId(id);
        try {
            const result = await usersApi.toggleMarketing(id);
            setUsers(users.map(u => u.id === id ? { ...u, isMarketingAcc: result.isMarketingAcc } : u));
            showToast('success', `Marketing mode ${result.isMarketingAcc ? 'enabled' : 'disabled'}`);
        } catch (error) {
            showToast('error', 'Failed to toggle marketing mode');
        } finally {
            setActionId(null);
        }
    };

    const handleAdjustBalance = async () => {
        if (!balanceModal || !balanceAmount) return;
        setBalanceLoading(true);
        try {
            const amount = parseFloat(balanceAmount);
            if (isNaN(amount)) throw new Error('Invalid amount');
            const result = await usersApi.adjustBalance(balanceModal.userId, amount, balanceDesc);
            setUsers(users.map(u => u.id === balanceModal.userId ? { ...u, wallet: { balance: result.newBalance } } : u));
            showToast('success', `Balance adjusted. New balance: Rp ${Number(result.newBalance).toLocaleString('id-ID')}`);
            setBalanceModal(null);
            setBalanceAmount("");
            setBalanceDesc("");
        } catch (error) {
            showToast('error', 'Failed to adjust balance');
        } finally {
            setBalanceLoading(false);
        }
    };

    const handleInjectStats = async () => {
        if (!injectModal) return;
        setInjectLoading(true);
        try {
            const result = await usersApi.injectFakeStats(
                injectModal.userId,
                parseInt(injectTasks) || 0,
                parseInt(injectWDs) || 0,
                parseInt(injectRefs) || 0
            );
            showToast('success', `Injected: ${result.injected.tasks} tasks, ${result.injected.withdrawals} WDs, ${result.injected.referrals} referrals (marked as isFake)`);
            setInjectModal(null);
        } catch (error) {
            showToast('error', 'Failed to inject stats');
        } finally {
            setInjectLoading(false);
        }
    };

    const handleCleanupFake = async (userId: string, username: string) => {
        if (!confirm(`🧹 Hapus SEMUA data marketing palsu untuk ${username}?\n\nIni akan menghapus semua fake tasks, withdrawals, dan referrals.`)) return;
        setActionId(userId);
        try {
            const result = await usersApi.cleanupFakeData(userId);
            showToast('success', `Cleaned: ${result.cleaned.tasks} tasks, ${result.cleaned.withdrawals} WDs, ${result.cleaned.referrals} referrals`);
        } catch (error) {
            showToast('error', 'Failed to cleanup fake data');
        } finally {
            setActionId(null);
        }
    };

    const filteredUsers = users.filter(u =>
        (u.username?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (u.firstName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (String(u.telegramId).includes(searchTerm))
    );

    return (
        <div className="space-y-6">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold animate-in slide-in-from-right ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                    {toast.text}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Grinder Directory</h1>
                    <p className="text-slate-500 mt-1">Manage users, marketing accounts, and balances.</p>
                </div>

                <div className="relative w-full sm:w-72">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="text-slate-400" size={18} />
                    </div>
                    <input
                        type="text"
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                        placeholder="Search by @username or ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-medium">User / TG</th>
                                <th className="px-6 py-4 font-medium">Role</th>
                                <th className="px-6 py-4 font-medium text-right">Live Balance</th>
                                <th className="px-6 py-4 font-medium">Mode</th>
                                <th className="px-6 py-4 font-medium">Status</th>
                                <th className="px-6 py-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                                        <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                                        Loading network directory...
                                    </td>
                                </tr>
                            )}
                            {!loading && filteredUsers.map((user) => (
                                <tr key={user.id} className={`hover:bg-slate-50 transition-colors ${user.isMarketingAcc ? 'bg-orange-50/50' : ''}`}>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-slate-900">{user.firstName || 'Unknown'}</div>
                                        <div className="text-slate-500 text-xs mt-0.5">@{user.username || String(user.telegramId)}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
                                            user.role === 'SUPER_ADMIN' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
                                            }`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono font-medium text-slate-700">
                                        Rp {Number(user.wallet?.balance || 0).toLocaleString('id-ID')}
                                    </td>
                                    <td className="px-6 py-4">
                                        {user.isMarketingAcc ? (
                                            <span className="px-2 py-1 rounded text-xs font-bold bg-orange-100 text-orange-700">
                                                🎯 Marketing
                                            </span>
                                        ) : (
                                            <span className="px-2 py-1 rounded text-xs font-bold bg-slate-100 text-slate-500">
                                                Normal
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1.5">
                                            <div className={`w-2 h-2 rounded-full ${!user.isBanned ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                            <span className="text-slate-600">{!user.isBanned ? 'Active' : 'Banned'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            {/* Toggle Marketing */}
                                            <button
                                                disabled={actionId === user.id}
                                                onClick={() => handleToggleMarketing(user.id)}
                                                className={`p-1.5 rounded transition-colors ${user.isMarketingAcc ? 'text-orange-500 hover:text-orange-700 hover:bg-orange-50' : 'text-slate-400 hover:text-orange-500 hover:bg-orange-50'}`}
                                                title={user.isMarketingAcc ? 'Disable Marketing Mode' : 'Enable Marketing Mode'}
                                            >
                                                <Megaphone size={16} />
                                            </button>

                                            {/* Adjust Balance */}
                                            <button
                                                onClick={() => setBalanceModal({ userId: user.id, username: user.firstName || user.username || String(user.telegramId) })}
                                                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                                                title="Adjust Balance"
                                            >
                                                <Coins size={16} />
                                            </button>

                                            {/* Inject Stats */}
                                            <button
                                                onClick={() => setInjectModal({ userId: user.id, username: user.firstName || user.username || String(user.telegramId) })}
                                                className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded transition-colors"
                                                title="Inject Fake Stats"
                                            >
                                                <Syringe size={16} />
                                            </button>

                                            {/* Ban/Unban */}
                                            <button
                                                disabled={actionId === user.id}
                                                onClick={() => handleToggleBan(user.id)}
                                                className={`p-1.5 rounded transition-colors ${!user.isBanned ? 'text-rose-400 hover:text-rose-700 hover:bg-rose-50' : 'text-emerald-400 hover:text-emerald-700 hover:bg-emerald-50'}`}
                                                title={!user.isBanned ? 'Ban User' : 'Unban User'}
                                            >
                                                {actionId === user.id ? <Loader2 size={16} className="animate-spin" /> : (!user.isBanned ? <Ban size={16} /> : <ShieldCheck size={16} />)}
                                            </button>

                                            {/* Cleanup Fake Data (only for marketing accounts) */}
                                            {user.isMarketingAcc && (
                                                <button
                                                    disabled={actionId === user.id}
                                                    onClick={() => handleCleanupFake(user.id, user.firstName || user.username || String(user.telegramId))}
                                                    className="p-1.5 text-amber-400 hover:text-amber-700 hover:bg-amber-50 rounded transition-colors"
                                                    title="🧹 Cleanup Fake Marketing Data"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Balance Adjustment Modal */}
            {balanceModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 mx-4">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-slate-900">Adjust Balance</h3>
                            <button onClick={() => setBalanceModal(null)} className="p-1 text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>
                        <p className="text-sm text-slate-500 mb-4">User: <strong>{balanceModal.username}</strong></p>

                        <div className="space-y-4">
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setBalanceAmount(prev => prev.startsWith('-') ? prev.slice(1) : prev)}
                                    className="px-3 py-2 bg-emerald-100 text-emerald-700 rounded-lg font-bold hover:bg-emerald-200 transition-colors"
                                >
                                    <Plus size={16} />
                                </button>
                                <button
                                    onClick={() => setBalanceAmount(prev => prev.startsWith('-') ? prev : '-' + prev)}
                                    className="px-3 py-2 bg-rose-100 text-rose-700 rounded-lg font-bold hover:bg-rose-200 transition-colors"
                                >
                                    <Minus size={16} />
                                </button>
                                <input
                                    type="text"
                                    value={balanceAmount}
                                    onChange={(e) => setBalanceAmount(e.target.value)}
                                    placeholder="e.g. 500000"
                                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                />
                            </div>
                            <input
                                type="text"
                                value={balanceDesc}
                                onChange={(e) => setBalanceDesc(e.target.value)}
                                placeholder="Description (optional)"
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            />
                            <button
                                onClick={handleAdjustBalance}
                                disabled={balanceLoading || !balanceAmount}
                                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-300 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                            >
                                {balanceLoading ? <Loader2 size={18} className="animate-spin" /> : <Coins size={18} />}
                                {balanceLoading ? 'Processing...' : 'Apply Adjustment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Inject Stats Modal */}
            {injectModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 mx-4">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-slate-900">💉 Inject Fake Stats</h3>
                            <button onClick={() => setInjectModal(null)} className="p-1 text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>
                        <p className="text-sm text-slate-500 mb-1">User: <strong>{injectModal.username}</strong></p>
                        <p className="text-xs text-rose-500 mb-4 font-medium">⚠️ This creates permanent fake records in the database.</p>

                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <label className="text-xs font-bold text-slate-500 uppercase w-32">Tasks</label>
                                <input
                                    type="number"
                                    value={injectTasks}
                                    onChange={(e) => setInjectTasks(e.target.value)}
                                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-violet-500"
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                <label className="text-xs font-bold text-slate-500 uppercase w-32">Withdrawals</label>
                                <input
                                    type="number"
                                    value={injectWDs}
                                    onChange={(e) => setInjectWDs(e.target.value)}
                                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-violet-500"
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                <label className="text-xs font-bold text-slate-500 uppercase w-32">Referrals</label>
                                <input
                                    type="number"
                                    value={injectRefs}
                                    onChange={(e) => setInjectRefs(e.target.value)}
                                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-violet-500"
                                />
                            </div>
                            <button
                                onClick={handleInjectStats}
                                disabled={injectLoading}
                                className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-300 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                            >
                                {injectLoading ? <Loader2 size={18} className="animate-spin" /> : <Syringe size={18} />}
                                {injectLoading ? 'Injecting...' : 'Inject Stats Now'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
