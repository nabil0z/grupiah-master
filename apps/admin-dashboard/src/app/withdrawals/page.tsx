"use client";

import { useState, useEffect } from 'react';
import { CreditCard, CheckCircle, XCircle, Loader2 } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:53000';
const mockInitData = 'mock_token';

export default function WithdrawalsPage() {
    const [withdrawals, setWithdrawals] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [actionId, setActionId] = useState<string | null>(null);

    useEffect(() => {
        const fetchWithdrawals = async () => {
            try {
                const res = await fetch(`${API_BASE}/admin/withdrawals/pending`, {
                    headers: { 'Authorization': `tma ${mockInitData}` }
                });
                const data = await res.json();
                setWithdrawals(data);
            } catch (err) {
                console.error('Failed to fetch withdrawals:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchWithdrawals();
    }, []);

    const handleAction = async (id: string, action: 'APPROVE' | 'REJECT') => {
        setActionId(id);
        try {
            const res = await fetch(`${API_BASE}/admin/withdrawals/${id}/action`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `tma ${mockInitData}`
                },
                body: JSON.stringify({ action })
            });
            if (res.ok) {
                setWithdrawals(prev => prev.filter(w => w.id !== id));
            }
        } catch (err) {
            console.error('Action failed:', err);
        } finally {
            setActionId(null);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Withdrawal Engine</h1>
                <p className="text-slate-500 mt-1">Review and process pending withdrawal requests.</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-medium text-slate-500">User</th>
                                <th className="px-6 py-4 font-medium text-slate-500">Amount</th>
                                <th className="px-6 py-4 font-medium text-slate-500">Method</th>
                                <th className="px-6 py-4 font-medium text-slate-500">Status</th>
                                <th className="px-6 py-4 font-medium text-slate-500">Date</th>
                                <th className="px-6 py-4 font-medium text-slate-500 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                                        Loading withdrawals...
                                    </td>
                                </tr>
                            ) : withdrawals.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                        No pending withdrawals. 🎉
                                    </td>
                                </tr>
                            ) : withdrawals.map((w) => (
                                <tr key={w.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-slate-900">{w.user?.firstName || 'Unknown'}</div>
                                        <div className="text-xs text-slate-500 mt-0.5">{w.user?.telegramId?.toString()}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-bold text-emerald-600">Rp {Number(w.amount).toLocaleString('id-ID')}</span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-700">{w.method}</td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 text-xs font-bold rounded bg-amber-100 text-amber-700">
                                            {w.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-xs text-slate-500">
                                        {new Date(w.createdAt).toLocaleDateString('id-ID')}
                                    </td>
                                    <td className="px-6 py-4 text-right space-x-2">
                                        <button
                                            disabled={actionId === w.id}
                                            onClick={() => handleAction(w.id, 'APPROVE')}
                                            className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                                        >
                                            {actionId === w.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                                        </button>
                                        <button
                                            disabled={actionId === w.id}
                                            onClick={() => handleAction(w.id, 'REJECT')}
                                            className="p-2 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors disabled:opacity-50"
                                        >
                                            <XCircle size={16} />
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
