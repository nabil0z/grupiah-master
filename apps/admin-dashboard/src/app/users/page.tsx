"use client";

import { useState, useEffect } from "react";
import { Search, Ban, ShieldCheck, Coins, Loader2 } from "lucide-react";
import { usersApi } from "@/lib/api";

type UserData = {
    id: string;
    telegramId: string;
    username?: string;
    firstName?: string;
    role: string;
    isBanned: boolean;
    wallet?: { balance: number | string };
};

export default function UserManagement() {
    const [searchTerm, setSearchTerm] = useState("");
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionId, setActionId] = useState<string | null>(null);

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

    const handleToggleBan = async (id: string) => {
        setActionId(id);
        try {
            const updated = await usersApi.toggleBan(id);
            setUsers(users.map(u => u.id === id ? { ...u, isBanned: updated.isBanned } : u));
        } catch (error) {
            alert('Failed to update ban status');
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Grinder Directory</h1>
                    <p className="text-slate-500 mt-1">Manage all registered Telegram users and their live balances.</p>
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

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-medium">User / TG</th>
                                <th className="px-6 py-4 font-medium">Role</th>
                                <th className="px-6 py-4 font-medium text-right">Live Balance</th>
                                <th className="px-6 py-4 font-medium">Risk Score</th>
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
                                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
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
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${user.isBanned ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                                            }`}>
                                            {user.isBanned ? 'High' : 'Normal'} Risk
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1.5">
                                            <div className={`w-2 h-2 rounded-full ${!user.isBanned ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                            <span className="text-slate-600">{!user.isBanned ? 'Active' : 'Banned'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right flex items-center justify-end">
                                        <button className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors mr-1" title="Adjust Balance">
                                            <Coins size={16} />
                                        </button>
                                        <button
                                            disabled={actionId === user.id}
                                            onClick={() => handleToggleBan(user.id)}
                                            className={`p-1.5 rounded transition-colors ${!user.isBanned ? 'text-rose-400 hover:text-rose-700 hover:bg-rose-50' : 'text-emerald-400 hover:text-emerald-700 hover:bg-emerald-50'}`}
                                            title={!user.isBanned ? 'Ban User (VPN/Bot)' : 'Unban User'}
                                        >
                                            {actionId === user.id ? <Loader2 size={16} className="animate-spin" /> : (!user.isBanned ? <Ban size={16} /> : <ShieldCheck size={16} />)}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
