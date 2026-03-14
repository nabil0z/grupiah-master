"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Ban, ShieldCheck, Coins, Loader2, Megaphone, Syringe, X, Plus, Minus, Trash2, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Filter, Users } from "lucide-react";
import { usersApi } from "@/lib/api";

type UserData = {
    id: string;
    telegramId: string;
    username?: string;
    firstName?: string;
    role: string;
    isBanned: boolean;
    isMarketingAcc?: boolean;
    fakeReferralCount?: number;
    createdAt?: string;
    wallet?: { balance: number | string };
};

type SortField = 'username' | 'balance' | 'role' | 'createdAt';
type SortDir = 'asc' | 'desc';
type StatusFilter = 'all' | 'active' | 'banned';
type ModeFilter = 'all' | 'normal' | 'marketing';

export default function UserManagement() {
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionId, setActionId] = useState<string | null>(null);

    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [limit] = useState(50);

    // Sorting (client-side on current page)
    const [sortField, setSortField] = useState<SortField>('createdAt');
    const [sortDir, setSortDir] = useState<SortDir>('desc');

    // Filters
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [modeFilter, setModeFilter] = useState<ModeFilter>('all');

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

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setPage(1); // Reset page on search
        }, 400);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Fetch users when page or search changes
    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const result = await usersApi.getUsers(page, limit, debouncedSearch || undefined);
            setUsers(result.data);
            setTotal(result.total);
            setTotalPages(result.totalPages);
        } catch (error) {
            console.error("Failed to load users:", error);
        } finally {
            setLoading(false);
        }
    }, [page, limit, debouncedSearch]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

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
        } catch {
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
        } catch {
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
        } catch {
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
            showToast('success', `Injected: ${result.injected.tasks} tasks, ${result.injected.withdrawals} WDs, ${result.injected.referrals} referrals`);
            setInjectModal(null);
        } catch {
            showToast('error', 'Failed to inject stats');
        } finally {
            setInjectLoading(false);
        }
    };

    const handleCleanupFake = async (userId: string, username: string) => {
        if (!confirm(`🧹 Purge SEMUA data marketing untuk ${username}?\n\nIni akan:\n- Hapus fake tasks, withdrawals, referrals\n- Kembalikan saldo ke sebelum marketing\n- Deaktifkan marketing mode`)) return;
        setActionId(userId);
        try {
            const result = await usersApi.cleanupFakeData(userId);
            showToast('success', `Cleaned: ${result.cleaned.tasks} tasks, ${result.cleaned.withdrawals} WDs, ${result.cleaned.referrals} refs. Marketing OFF.`);
            setUsers(users.map(u => u.id === userId ? { ...u, isMarketingAcc: false, fakeReferralCount: 0 } : u));
        } catch {
            showToast('error', 'Failed to cleanup fake data');
        } finally {
            setActionId(null);
        }
    };

    // Sort & filter (client-side on current page data)
    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('desc');
        }
    };

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return <ChevronDown size={14} className="text-slate-300 ml-1 inline" />;
        return sortDir === 'asc'
            ? <ChevronUp size={14} className="text-emerald-500 ml-1 inline" />
            : <ChevronDown size={14} className="text-emerald-500 ml-1 inline" />;
    };

    const processedUsers = [...users]
        // Filter by status
        .filter(u => {
            if (statusFilter === 'active') return !u.isBanned;
            if (statusFilter === 'banned') return u.isBanned;
            return true;
        })
        // Filter by mode
        .filter(u => {
            if (modeFilter === 'marketing') return u.isMarketingAcc;
            if (modeFilter === 'normal') return !u.isMarketingAcc;
            return true;
        })
        // Sort
        .sort((a, b) => {
            let cmp = 0;
            switch (sortField) {
                case 'username':
                    cmp = (a.firstName || a.username || '').localeCompare(b.firstName || b.username || '');
                    break;
                case 'balance':
                    cmp = Number(a.wallet?.balance || 0) - Number(b.wallet?.balance || 0);
                    break;
                case 'role':
                    cmp = (a.role || '').localeCompare(b.role || '');
                    break;
                case 'createdAt':
                    cmp = (a.createdAt || '').localeCompare(b.createdAt || '');
                    break;
            }
            return sortDir === 'asc' ? cmp : -cmp;
        });

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
                    <p className="text-slate-500 mt-1">
                        <Users size={14} className="inline mr-1" />
                        {total.toLocaleString('id-ID')} total users
                        {statusFilter !== 'all' && <span className="text-emerald-600 font-medium"> · filtered</span>}
                    </p>
                </div>

                <div className="relative w-full sm:w-72">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="text-slate-400" size={18} />
                    </div>
                    <input
                        type="text"
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                        placeholder="Search by @username or name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Filter Chips */}
            <div className="flex flex-wrap items-center gap-2">
                <Filter size={14} className="text-slate-400" />
                <span className="text-xs text-slate-400 font-medium mr-1">Status:</span>
                {(['all', 'active', 'banned'] as StatusFilter[]).map(f => (
                    <button
                        key={f}
                        onClick={() => setStatusFilter(f)}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${statusFilter === f
                            ? 'bg-emerald-500 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                    >
                        {f === 'all' ? 'Semua' : f === 'active' ? '✅ Active' : '🚫 Banned'}
                    </button>
                ))}

                <span className="text-slate-300">|</span>
                <span className="text-xs text-slate-400 font-medium mr-1">Mode:</span>
                {(['all', 'normal', 'marketing'] as ModeFilter[]).map(f => (
                    <button
                        key={f}
                        onClick={() => setModeFilter(f)}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${modeFilter === f
                            ? 'bg-orange-500 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                    >
                        {f === 'all' ? 'Semua' : f === 'normal' ? 'Normal' : '🎯 Marketing'}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-medium cursor-pointer select-none hover:text-emerald-600 transition-colors" onClick={() => handleSort('username')}>
                                    User / TG <SortIcon field="username" />
                                </th>
                                <th className="px-6 py-4 font-medium cursor-pointer select-none hover:text-emerald-600 transition-colors" onClick={() => handleSort('role')}>
                                    Role <SortIcon field="role" />
                                </th>
                                <th className="px-6 py-4 font-medium text-right cursor-pointer select-none hover:text-emerald-600 transition-colors" onClick={() => handleSort('balance')}>
                                    Live Balance <SortIcon field="balance" />
                                </th>
                                <th className="px-6 py-4 font-medium">Mode</th>
                                <th className="px-6 py-4 font-medium">Status</th>
                                <th className="px-6 py-4 font-medium cursor-pointer select-none hover:text-emerald-600 transition-colors" onClick={() => handleSort('createdAt')}>
                                    Joined <SortIcon field="createdAt" />
                                </th>
                                <th className="px-6 py-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                                        <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                                        Loading network directory...
                                    </td>
                                </tr>
                            )}
                            {!loading && processedUsers.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                                        Tidak ada user yang cocok dengan filter
                                    </td>
                                </tr>
                            )}
                            {!loading && processedUsers.map((user) => (
                                <tr key={user.id} className={`hover:bg-slate-50 transition-colors ${user.isMarketingAcc ? 'bg-orange-50/50' : ''}`}>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-slate-900">
                                            {user.firstName || 'Unknown'}
                                            {(user.fakeReferralCount || 0) > 0 && (
                                                <span className="ml-1.5 px-1.5 py-0.5 bg-violet-100 text-violet-700 text-[10px] font-bold rounded-full" title={`${user.fakeReferralCount} fake referrals`}>
                                                    🤖{user.fakeReferralCount}
                                                </span>
                                            )}
                                        </div>
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
                                    <td className="px-6 py-4 text-xs text-slate-400">
                                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' }) : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                disabled={actionId === user.id}
                                                onClick={() => handleToggleMarketing(user.id)}
                                                className={`p-1.5 rounded transition-colors ${user.isMarketingAcc ? 'text-orange-500 hover:text-orange-700 hover:bg-orange-50' : 'text-slate-400 hover:text-orange-500 hover:bg-orange-50'}`}
                                                title={user.isMarketingAcc ? 'Disable Marketing Mode' : 'Enable Marketing Mode'}
                                            >
                                                <Megaphone size={16} />
                                            </button>
                                            <button
                                                onClick={() => setBalanceModal({ userId: user.id, username: user.firstName || user.username || String(user.telegramId) })}
                                                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                                                title="Adjust Balance"
                                            >
                                                <Coins size={16} />
                                            </button>
                                            <button
                                                onClick={() => setInjectModal({ userId: user.id, username: user.firstName || user.username || String(user.telegramId) })}
                                                className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded transition-colors"
                                                title="Inject Fake Stats"
                                            >
                                                <Syringe size={16} />
                                            </button>
                                            <button
                                                disabled={actionId === user.id}
                                                onClick={() => handleToggleBan(user.id)}
                                                className={`p-1.5 rounded transition-colors ${!user.isBanned ? 'text-rose-400 hover:text-rose-700 hover:bg-rose-50' : 'text-emerald-400 hover:text-emerald-700 hover:bg-emerald-50'}`}
                                                title={!user.isBanned ? 'Ban User' : 'Unban User'}
                                            >
                                                {actionId === user.id ? <Loader2 size={16} className="animate-spin" /> : (!user.isBanned ? <Ban size={16} /> : <ShieldCheck size={16} />)}
                                            </button>
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

                {/* Pagination */}
                <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200">
                    <p className="text-xs text-slate-500">
                        Showing <strong>{processedUsers.length}</strong> of <strong>{total.toLocaleString('id-ID')}</strong> users
                        {` · Page ${page} of ${totalPages}`}
                    </p>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setPage(1)}
                            disabled={page === 1 || loading}
                            className="px-2 py-1 text-xs text-slate-500 hover:bg-slate-200 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            First
                        </button>
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1 || loading}
                            className="p-1.5 text-slate-500 hover:bg-slate-200 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft size={16} />
                        </button>

                        {/* Page numbers */}
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum: number;
                            if (totalPages <= 5) {
                                pageNum = i + 1;
                            } else if (page <= 3) {
                                pageNum = i + 1;
                            } else if (page >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                            } else {
                                pageNum = page - 2 + i;
                            }
                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => setPage(pageNum)}
                                    disabled={loading}
                                    className={`w-8 h-8 text-xs font-bold rounded-lg transition-all ${page === pageNum
                                        ? 'bg-emerald-500 text-white shadow-sm'
                                        : 'text-slate-500 hover:bg-slate-200'
                                        }`}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}

                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages || loading}
                            className="p-1.5 text-slate-500 hover:bg-slate-200 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <ChevronRight size={16} />
                        </button>
                        <button
                            onClick={() => setPage(totalPages)}
                            disabled={page === totalPages || loading}
                            className="px-2 py-1 text-xs text-slate-500 hover:bg-slate-200 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            Last
                        </button>
                    </div>
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
