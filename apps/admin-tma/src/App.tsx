import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, CreditCard, CheckSquare, Settings } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Withdrawals from './pages/Withdrawals';
import Tasks from './pages/Tasks';
import SettingsPage from './pages/Settings';

function Navigation() {
  const location = useLocation();
  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dash' },
    { path: '/withdrawals', icon: CreditCard, label: 'Payouts' },
    { path: '/tasks', icon: CheckSquare, label: 'Tasks' },
    { path: '/settings', icon: Settings, label: 'Vars' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 pb-safe z-50">
      <div className="flex justify-between items-center max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 transition-colors ${isActive ? 'text-[var(--color-admin-accent)]' : 'text-gray-400 hover:text-gray-600'
                }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              <span className={`text-[10px] font-medium ${isActive ? 'opacity-100' : 'opacity-80'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <div className="App font-sans bg-[var(--color-admin-bg)] min-h-screen">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/withdrawals" element={<Withdrawals />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
        <Navigation />
      </div>
    </Router>
  );
}

export default App;
