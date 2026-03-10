
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import FlashSalePage from './pages/FlashSalePage';
import EarnPage from './pages/EarnPage';
import WalletPage from './pages/WalletPage';
import LeaderboardPage from './pages/LeaderboardPage';
import ProfilePage from './pages/ProfilePage';
import FrensPage from './pages/FrensPage';
import BoostPage from './pages/BoostPage';
import SettingsPage from './pages/SettingsPage';
import TaskHistoryPage from './pages/TaskHistoryPage';
import ChannelLock from './components/ChannelLock';
import DailyCheckIn from './components/DailyCheckIn';
import FakeWithdrawTicker from './components/FakeWithdrawTicker';
import { WalletProvider } from './contexts/WalletContext';
import { useState, useEffect } from 'react';
import { authApi, userApi } from './api/client';

const CHANNEL_VERIFY_KEY = 'channelVerified';
const CHANNEL_VERIFY_TTL = 24 * 60 * 60 * 1000; // 24 jam

function isChannelVerifiedCached(): boolean {
  try {
    const raw = localStorage.getItem(CHANNEL_VERIFY_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (data.verified && Date.now() - data.timestamp < CHANNEL_VERIFY_TTL) {
      return true;
    }
  } catch { /* ignore parse error */ }
  return false;
}

function saveChannelVerified() {
  localStorage.setItem(CHANNEL_VERIFY_KEY, JSON.stringify({ verified: true, timestamp: Date.now() }));
}

function MainApp() {
  const navigate = useNavigate();
  const [isJoined, setIsJoined] = useState(() => isChannelVerifiedCached());
  const [isVerifying, setIsVerifying] = useState(false);
  const [isInitializing, setIsInitializing] = useState(() => !isChannelVerifiedCached());
  const [channelInfo, setChannelInfo] = useState<any>(null);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(1);
  const [dailyRewards, setDailyRewards] = useState<number[]>([]);

  useEffect(() => {
    // 1. Check for Telegram Deep Links (start_param)
    const win = window as any;
    let targetRoute = '';

    if (win.Telegram && win.Telegram.WebApp && win.Telegram.WebApp.initDataUnsafe) {
      const startParam = win.Telegram.WebApp.initDataUnsafe.start_param;
      if (startParam) {
        if (startParam === 'wallet') targetRoute = '/wallet';
        else if (startParam === 'tasks') targetRoute = '/earn';
        else if (startParam === 'frens') targetRoute = '/frens';
        else if (startParam === 'leaderboard') targetRoute = '/leaderboard';
        else if (startParam.startsWith('task_')) targetRoute = `/earn`;
      }
    }

    // 2. Global Boot Sequence: Login -> Profile -> Channel
    const bootApp = async () => {
      try {
        const startParam = win.Telegram?.WebApp?.initDataUnsafe?.start_param;
        // Always login first to establish session and DB User
        const loginRes = await authApi.login(startParam);

        // Navigate to deep link if present after login
        if (targetRoute) {
          navigate(targetRoute);
        }

        // Verify channel (skip if cache masih valid dalam 24 jam)
        if (!isChannelVerifiedCached()) {
          const channelRes = await userApi.verifyChannel().catch(() => null);
          if (channelRes) {
            if (channelRes.channelInfo) setChannelInfo(channelRes.channelInfo);
            if (channelRes.joined === false) {
              setIsJoined(false);
            } else {
              setIsJoined(true);
              saveChannelVerified();
            }
          }
        }

        // Show daily check-in if available (from login response)
        if (loginRes && loginRes.canClaimDaily) {
          setCurrentStreak(loginRes.currentStreak || 0);
          if (loginRes.dailyRewards) setDailyRewards(loginRes.dailyRewards);
          setTimeout(() => setShowCheckIn(true), 1500);
        }

      } catch (err) {
        console.error("Global Boot Error:", err);
        setIsJoined(true); // default fallback
      } finally {
        setIsInitializing(false);
      }
    };

    bootApp();

  }, [navigate]);

  const handleVerify = () => {
    setIsVerifying(true);
    userApi.verifyChannel(true)
      .then(res => {
        if (res && res.joined) {
          setIsJoined(true);
          saveChannelVerified();
        } else {
          alert('Verifikasi gagal. Pastikan kamu sudah bergabung ke channel @Grupiah_id, lalu coba lagi.');
        }
      })
      .catch(() => {
        alert('Terjadi kesalahan saat memverifikasi. Coba lagi dalam beberapa detik.');
      })
      .finally(() => setIsVerifying(false));
  };

  if (isInitializing) {
    return (
      <div className="App font-sans max-w-md mx-auto relative bg-gray-50 min-h-screen shadow-xl flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">Memuat Aplikasi...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="App font-sans max-w-md mx-auto relative bg-gray-50 min-h-screen shadow-xl overflow-hidden pb-safe">
      <Routes>
        <Route path="/" element={<FlashSalePage />} />
        <Route path="/earn" element={<EarnPage />} />
        <Route path="/frens" element={<FrensPage />} />
        <Route path="/wallet" element={<WalletPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/boost" element={<BoostPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/task-history" element={<TaskHistoryPage />} />
        {/* Defaulting un-built pages back to Home for now */}
        <Route path="*" element={<FlashSalePage />} />
      </Routes>
      <FakeWithdrawTicker />
      <BottomNav />
      {!isJoined && <ChannelLock onVerify={handleVerify} isVerifying={isVerifying} channelInfo={channelInfo} />}
      <DailyCheckIn isOpen={showCheckIn} onClose={() => setShowCheckIn(false)} currentStreak={currentStreak} dailyRewards={dailyRewards} />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <WalletProvider>
        <MainApp />
      </WalletProvider>
    </Router>
  );
}
