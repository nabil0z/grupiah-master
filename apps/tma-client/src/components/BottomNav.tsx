import { Wallet, Users, Trophy, Zap, Flame } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const BottomNav = () => {
    const location = useLocation();

    const navItems = [
        { id: '/', icon: Flame, label: 'Flash Sale' },
        { id: '/earn', icon: Zap, label: 'Earn' },
        { id: '/frens', icon: Users, label: 'Frens' },
        { id: '/leaderboard', icon: Trophy, label: 'Rank' },
        { id: '/wallet', icon: Wallet, label: 'Wallet' },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] px-6 py-3 pb-safe z-50">
            <div className="flex justify-between items-center max-w-md mx-auto relative">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.id;
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.id}
                            to={item.id}
                            className={`flex flex-col items-center gap-1 transition-all duration-300 relative ${isActive ? 'text-[var(--color-flash-orange)] scale-110' : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            {/* Highlight Dot for Active Item */}
                            {isActive && (
                                <span className="absolute -top-3 w-1.5 h-1.5 rounded-full flash-gradient-bg" />
                            )}

                            <Icon
                                size={isActive ? 24 : 22}
                                strokeWidth={isActive ? 2.5 : 2}
                                className={isActive && item.id === '/' ? 'animate-bounce' : ''}
                            />
                            <span className={`text-[10px] font-medium ${isActive ? 'opacity-100' : 'opacity-80'}`}>
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
};

export default BottomNav;
