"use client";

import {
  Users,
  Wallet,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

const mockData = [
  { name: 'Mon', revenue: 4000, payout: 2400 },
  { name: 'Tue', revenue: 3000, payout: 1398 },
  { name: 'Wed', revenue: 2000, payout: 9800 },
  { name: 'Thu', revenue: 2780, payout: 3908 },
  { name: 'Fri', revenue: 1890, payout: 4800 },
  { name: 'Sat', revenue: 2390, payout: 3800 },
  { name: 'Sun', revenue: 3490, payout: 4300 },
];

export default function Home() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">God Eye Overview</h1>
          <p className="text-slate-500 mt-1">Real-time metrics of your Mirage Economy.</p>
        </div>
        <div className="flex items-center gap-2 bg-rose-50 text-rose-700 px-4 py-2 rounded-lg font-medium border border-rose-100">
          <AlertTriangle size={18} />
          <span>7 High-Risk Withdrawals Detected</span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { title: 'Total Fictional Balance', value: 'Rp 458.2M', sub: '+12% from yesterday', icon: Wallet, trend: 'up' },
          { title: 'Real Ad Revenue (Est)', value: '$1,240', sub: '+5% from yesterday', icon: Activity, trend: 'up' },
          { title: 'Active Grinders', value: '12,450', sub: '-2% from yesterday', icon: Users, trend: 'down' },
          { title: 'Pending Payouts', value: 'Rp 12.5M', sub: 'Require manual review', icon: AlertTriangle, trend: 'neutral' },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-slate-50 rounded-lg">
                  <Icon className="text-slate-600" size={20} />
                </div>
                {stat.trend === 'up' && <ArrowUpRight className="text-emerald-500" size={20} />}
                {stat.trend === 'down' && <ArrowDownRight className="text-rose-500" size={20} />}
              </div>
              <div>
                <h3 className="text-sm font-medium text-slate-500">{stat.title}</h3>
                <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
                <p className="text-xs text-slate-400 mt-1">{stat.sub}</p>
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
            <p className="text-sm text-slate-500">Ad Revenue vs Processed Payouts (USD)</p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900">System Health</h2>
            <p className="text-sm text-slate-500">Live operational status</p>
          </div>

          <div className="flex-1 space-y-4">
            {[
              { label: 'OGAds Webhook', status: 'Healthy', ping: '24ms', color: 'bg-emerald-500' },
              { label: 'AdBlueMedia', status: 'Warning', ping: '1.2s', color: 'bg-amber-500' },
              { label: 'Telegram Bot API', status: 'Healthy', ping: '45ms', color: 'bg-emerald-500' },
              { label: 'Flip Gateway API', status: 'Healthy', ping: '120ms', color: 'bg-emerald-500' },
              { label: 'ProxyCheck.io', status: 'Rate Limited', ping: '--', color: 'bg-rose-500' },
            ].map((sys, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${sys.color} animate-pulse`} />
                  <span className="text-sm font-medium text-slate-700">{sys.label}</span>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-900">{sys.status}</p>
                  <p className="text-[10px] text-slate-500">{sys.ping}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
