"use client";
import { useState, useEffect } from "react";
import {
  Users, Wallet, Activity, ArrowUpRight, ArrowDownRight, AlertTriangle, Target, Loader2, DollarSign, EyeOff, Database
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { analyticsApi } from '@/lib/api';

const mockChartData = [
  { name: 'Mon', revenue: 4000, payout: 2400 },
  { name: 'Tue', revenue: 3000, payout: 1398 },
  { name: 'Wed', revenue: 2000, payout: 9800 },
  { name: 'Thu', revenue: 2780, payout: 3908 },
  { name: 'Fri', revenue: 1890, payout: 4800 },
  { name: 'Sat', revenue: 2390, payout: 3800 },
  { name: 'Sun', revenue: 3490, payout: 4300 },
];

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    analyticsApi.getDashboard().then(data => {
      setAnalytics(data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const totalBalance = analytics ? `Rp ${Number(analytics.totalFictionalBalance || 0).toLocaleString('id-ID')}` : '—';
  const totalUsers = analytics ? Number(analytics.totalUsers || 0).toLocaleString('id-ID') : '—';
  const pendingWD = analytics ? `Rp ${Number(analytics.pendingPayouts || 0).toLocaleString('id-ID')}` : '—';
  const tasksToday = analytics ? Number(analytics.tasksCompletedToday || 0).toLocaleString('id-ID') : '—';

  const trackedOffers = analytics ? Number(analytics.totalOffersTracked || 0) : 0;
  const deadOffers = analytics ? Number(analytics.deadOfferCount || 0) : 0;

  const stats: { title: string; value: string; sub: string; icon: any; trend: 'up' | 'down' | 'neutral' }[] = [
    { title: 'Total Fictional Balance', value: totalBalance, sub: 'Sum of all user wallets', icon: Wallet, trend: 'up' },
    { title: 'Tasks Completed Today', value: tasksToday, sub: 'Approved tasks in last 24h', icon: Target, trend: 'up' },
    { title: 'Active Grinders', value: totalUsers, sub: 'Total registered users', icon: Users, trend: 'up' },
    { title: 'Pending Payouts', value: pendingWD, sub: 'Require manual review', icon: AlertTriangle, trend: 'neutral' },
    { title: 'Offers Tracked', value: String(trackedOffers), sub: 'Total offers with click/completion data', icon: Database, trend: 'neutral' },
    { title: 'Dead Offers Hidden', value: String(deadOffers), sub: '50+ clicks, 0 completions → auto-hidden', icon: EyeOff, trend: deadOffers > 0 ? 'down' : 'neutral' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">God Eye Overview</h1>
          <p className="text-slate-500 mt-1">Real-time metrics of your Mirage Economy.</p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <div className="p-2 bg-slate-50 rounded-lg">
                  <Icon className="text-slate-600" size={18} />
                </div>
                {stat.trend === 'up' && <ArrowUpRight className="text-emerald-500" size={16} />}
                {stat.trend === 'down' && <ArrowDownRight className="text-rose-500" size={16} />}
              </div>
              <div>
                <h3 className="text-xs font-medium text-slate-500">{stat.title}</h3>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  {loading ? <Loader2 className="animate-spin inline" size={18} /> : stat.value}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">{stat.sub}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900">Cashflow Matrix</h2>
            <p className="text-sm text-slate-500">Ad Revenue vs Processed Payouts (Weekly)</p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorPayout" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dx={-10} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                <Area type="monotone" dataKey="payout" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorPayout)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-6">
          {/* Task Completion Rates */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Top Offers by CR</h2>
                <p className="text-xs text-slate-500">Conversion rate (completions/clicks)</p>
              </div>
              <Target className="text-emerald-500" size={20} />
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto max-h-[200px]">
              {loading ? (
                <div className="flex items-center justify-center p-8"><Loader2 className="animate-spin text-slate-400" /></div>
              ) : analytics?.topByConversion?.length > 0 ? (
                analytics.topByConversion.map((offer: any, i: number) => {
                  const rate = Number(offer.cr) || 0;
                  return (
                    <div key={i} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50">
                      <div>
                        <p className="text-xs font-bold text-slate-900 truncate max-w-[140px]">{offer.externalId} <span className="text-[10px] bg-slate-200 text-slate-600 px-1 py-0.5 rounded">{offer.provider}</span></p>
                        <p className="text-[10px] text-slate-500">{offer.completions}/{offer.clicks} clicks</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${rate > 50 ? 'bg-emerald-100 text-emerald-700' : rate > 20 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                        {rate}%
                      </span>
                    </div>
                  )
                })
              ) : (
                <p className="text-xs text-slate-400 text-center py-4">No data yet</p>
              )}
            </div>
          </div>

          {/* Live Postback Feed */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Live Postback Feed</h2>
                <p className="text-xs text-slate-500">Real-time earnings</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <Activity className="text-emerald-500" size={16} />
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto max-h-[200px] pr-1">
              {loading ? (
                <div className="flex items-center justify-center p-8"><Loader2 className="animate-spin text-slate-400" /></div>
              ) : analytics?.livePostbacks?.length > 0 ? (
                analytics.livePostbacks.slice(0, 10).map((pb: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <DollarSign size={14} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 truncate max-w-[100px]">@{pb.wallet?.user?.username || 'user'}</p>
                        <p className="text-[10px] text-slate-500">{new Date(pb.createdAt).toLocaleTimeString('id-ID')}</p>
                      </div>
                    </div>
                    <p className="text-xs font-black text-emerald-600">+Rp{Number(pb.amount).toLocaleString('id-ID')}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 text-center py-4">Waiting for postbacks...</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
