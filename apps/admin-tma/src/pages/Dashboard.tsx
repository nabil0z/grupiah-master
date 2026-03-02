import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, CreditCard, CheckSquare, Activity } from 'lucide-react';

export default function Dashboard() {
    const stats = [
        { label: 'Pending Withdrawals', value: '3', icon: CreditCard, color: 'text-red-600', bg: 'bg-red-50', link: '/withdrawals' },
        { label: 'Tasks for Review', value: '2', icon: CheckSquare, color: 'text-yellow-600', bg: 'bg-yellow-50', link: '/tasks' },
        { label: 'Total Users', value: '1,204', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', link: '#' },
        { label: 'Server Status', value: 'Online', icon: Activity, color: 'text-green-600', bg: 'bg-green-50', link: '#' },
    ];

    return (
        <div className="p-5 max-w-md mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-black text-gray-900">Grupiah Admin</h1>
                <p className="text-gray-500 text-sm">Welcome back, SuperAdmin.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {stats.map((stat, idx) => {
                    const Icon = stat.icon;
                    return (
                        <Link key={idx} to={stat.link}>
                            <motion.div
                                whileTap={{ scale: 0.95 }}
                                className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center h-full hover:shadow-md transition-shadow"
                            >
                                <div className={`${stat.bg} ${stat.color} p-3 rounded-full mb-3`}>
                                    <Icon size={24} />
                                </div>
                                <h2 className="text-2xl font-black text-gray-800 leading-tight">{stat.value}</h2>
                                <p className="text-xs text-gray-500 font-medium mt-1">{stat.label}</p>
                            </motion.div>
                        </Link>
                    );
                })}
            </div>

            <div className="mt-8 bg-gray-900 text-white p-5 rounded-2xl shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
                <h3 className="font-bold mb-2">System Alerts</h3>
                <ul className="text-sm space-y-2 text-gray-300">
                    <li className="flex items-start gap-2">
                        <span className="text-yellow-400">⚠️</span>
                        <span>OGAds Postback API reporting 5% latency increase.</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-green-400">✅</span>
                        <span>Flip Disbursement balance is healthy (Rp 15.000.000).</span>
                    </li>
                </ul>
            </div>
        </div>
    );
}
