import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X, CreditCard } from 'lucide-react';

import { useEffect } from 'react';
import { adminApi } from '../api/adminClient';

export default function Withdrawals() {
    const [list, setList] = useState<any[]>([]);

    useEffect(() => {
        const fetchWithdrawals = async () => {
            try {
                const data = await adminApi.getPendingWithdrawals();
                setList(data);
            } catch (error) {
                console.error("Failed fetching withdrawals", error);
            }
        };
        fetchWithdrawals();
    }, []);

    const handleAction = async (id: string, action: 'APPROVE' | 'REJECT') => {
        try {
            await adminApi.actionWithdrawal(id, action);
            setList(list.filter(w => w.id !== id));
        } catch (error: any) {
            alert(error?.response?.data?.message || 'Action failed');
        }
    };

    return (
        <div className="p-4 pb-20 max-w-md mx-auto">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-xl font-bold text-gray-800">Pending Withdrawals</h1>
                <span className="bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-xs font-bold">
                    {list.length} req
                </span>
            </div>

            <div className="space-y-4">
                {list.map((item) => (
                    <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
                    >
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <p className="font-bold text-gray-900">
                                    {item.user?.username ? `@${item.user.username}` : item.user?.firstName || 'Unknown'}
                                </p>
                                <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-500">
                                    <CreditCard size={14} /> {item.method}
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-[var(--color-admin-accent)]">
                                    Rp {Number(item.amount).toLocaleString('id-ID')}
                                </p>
                                <span className="text-xs text-gray-400 mt-1 block">
                                    ID: {item.id.split('-')[0]}..
                                </span>
                            </div>
                        </div>

                        {/* Account Details */}
                        <div className="bg-gray-50 p-2 rounded-lg text-xs font-mono text-gray-600 mb-4 overflow-x-auto">
                            {item.accountInfo}
                        </div>

                        <div className="flex gap-2 mt-2">
                            <button
                                onClick={() => handleAction(item.id, 'REJECT')}
                                className="flex-1 bg-red-50 text-red-600 hover:bg-red-100 font-bold py-2 rounded-lg flex items-center justify-center gap-1 transition-colors text-sm"
                            >
                                <X size={16} /> Reject (Refund)
                            </button>
                            <button
                                onClick={() => handleAction(item.id, 'APPROVE')}
                                className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-1 transition-colors text-sm shadow-sm"
                            >
                                <Check size={16} /> Mark Paid
                            </button>
                        </div>
                    </motion.div>
                ))}
                {list.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                        <Check size={48} className="mx-auto mb-2 opacity-20" />
                        <p>All clear! No pending withdrawals.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
