"use client";

import Link from 'next/link';
import {
    LayoutDashboard,
    Users,
    Megaphone,
    Settings,
    Shield,
    CreditCard,
    Target
} from 'lucide-react';
import { usePathname } from 'next/navigation';

export function Sidebar() {
    const pathname = usePathname();

    const links = [
        { href: '/', label: 'God Eye Overview', icon: LayoutDashboard },
        { href: '/users', label: 'User Management', icon: Users },
        { href: '/withdrawals', label: 'Withdrawal Engine', icon: CreditCard },
        { href: '/tasks', label: 'Custom Tasks', icon: Target },
        { href: '/offerwall', label: 'Offerwall Config', icon: Target },
        { href: '/broadcast', label: 'AI Broadcast Generator', icon: Megaphone },
        { href: '/settings', label: 'Master Settings', icon: Settings },
    ];

    return (
        <aside className="w-64 bg-slate-900 min-h-screen text-slate-300 flex flex-col fixed left-0 top-0 bottom-0 z-50">
            <div className="p-6 flex items-center gap-3">
                <Shield className="text-emerald-400" size={32} />
                <div>
                    <h1 className="text-xl font-bold text-white tracking-tight leading-none">GRupiah</h1>
                    <span className="text-[10px] text-emerald-400 font-mono tracking-widest uppercase">Super Admin</span>
                </div>
            </div>

            <nav className="flex-1 px-4 space-y-1 mt-4">
                {links.map((link) => {
                    const isActive = pathname === link.href;
                    const Icon = link.icon;

                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${isActive
                                ? 'bg-slate-800 text-white border-l-2 border-emerald-400'
                                : 'hover:bg-slate-800 hover:text-white'
                                }`}
                        >
                            <Icon size={18} className={isActive ? 'text-emerald-400' : 'text-slate-500'} />
                            {link.label}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 m-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-mono text-slate-400">System Online</span>
                </div>
                <p className="text-xs text-slate-500">v1.0.0 Monorepo</p>
            </div>
        </aside>
    );
}
