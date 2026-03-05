import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, BarChart3, CheckSquare, Radio, Settings2 } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import Tasks from './pages/Tasks';
import Broadcast from './pages/Broadcast';
import SettingsPage from './pages/Settings';

function Navigation() {
  const location = useLocation();
  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dash' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/tasks', icon: CheckSquare, label: 'Tasks' },
    { path: '/broadcast', icon: Radio, label: 'Broadcast' },
    { path: '/settings', icon: Settings2, label: 'Setting' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-2 pb-safe z-50">
      <div className="flex justify-between items-center max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-all ${isActive
                  ? 'text-[var(--color-admin-accent)] bg-[var(--color-admin-accent)]/5'
                  : 'text-gray-400 hover:text-gray-600'
                }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span className={`text-[9px] font-semibold ${isActive ? 'opacity-100' : 'opacity-70'}`}>
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
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/broadcast" element={<Broadcast />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
        <Navigation />
      </div>
    </Router>
  );
}

export default App;
