import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { Play, Wallet, Gift, ArrowRight, CheckCircle2, Zap } from 'lucide-react';
import PayoutTicker from './components/PayoutTicker';

const App: React.FC = () => {
  const botUrl = "https://t.me/grupiah_bot";

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 100 }
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-flash-bg)] text-gray-900 selection:bg-[var(--color-flash-orange)] selection:text-white font-sans overflow-x-hidden">
      <Helmet>
        <title>GRupiah - Cuan Instan via Telegram Tanpa Modal</title>
        <meta name="description" content="Kerjakan tugas mudah, main mini-game, dan tarik langsung saldo ke DANA/GOPAY dalam hitungan detik. 100% Gratis via Telegram." />
        <meta name="keywords" content="cara dapat uang dari internet, aplikasi penghasil uang, saldo dana gratis, telegram bot penghasil uang, grupiah" />
        <meta property="og:title" content="GRupiah - Ubah Waktu Luang Jadi Saldo Nyata" />
        <meta property="og:description" content="Platform cuan instan via Telegram. Pencairan detik detik ke E-Wallet!" />
        <link rel="canonical" href="https://grupiah.online" />
      </Helmet>

      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded flash-gradient-bg flex items-center justify-center shadow-md shadow-orange-500/20">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-extrabold flash-gradient-text">
              GRupiah
            </span>
          </div>
          <a
            href={botUrl}
            className="px-5 py-2 rounded-full flash-gradient-bg text-white text-sm font-bold transition-all hover:scale-105 shadow-md shadow-orange-500/30 flex items-center gap-2"
          >
            Mulai Sekarang <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-24 pb-16 lg:pb-24">

        {/* Hero Section */}
        <section className="relative px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mt-10 lg:mt-20">
          {/* Background Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-400/20 blur-[100px] rounded-full pointer-events-none" />
          <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-red-400/10 blur-[100px] rounded-full pointer-events-none" />

          <motion.div
            className="text-center relative z-10 max-w-3xl mx-auto"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-100 border border-orange-200 text-[var(--color-flash-orange)] text-sm font-bold mb-6 shadow-sm">
              <Zap className="w-4 h-4 fill-current" /> 100% Gratis Tanpa Deposit
            </motion.div>

            <motion.h1 variants={itemVariants} className="text-5xl lg:text-7xl font-black tracking-tight mb-6 text-gray-900 flex flex-col gap-2">
              <span>Ubah Waktu Luang</span>
              <span className="flash-gradient-text inline-block">Jadi Saldo Nyata.</span>
            </motion.h1>

            <motion.p variants={itemVariants} className="text-lg lg:text-xl text-gray-600 mb-10 leading-relaxed max-w-2xl mx-auto font-medium">
              Selesaikan tugas simpel, instal aplikasi, atau undang teman. Tarik penghasilanmu langsung ke DANA, OVO, atau GOPAY dalam hitungan detik. Cukup dari aplikasi Telegram!
            </motion.p>

            <motion.div variants={itemVariants}>
              <a
                href={botUrl}
                className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl flash-gradient-bg pulsing-border text-white font-black text-lg shadow-xl shadow-orange-500/30 transition-transform transform hover:-translate-y-1 hover:scale-105"
              >
                <Play className="w-6 h-6 fill-current" /> Buka Telegram Bot Sekarang
              </a>
              <p className="mt-5 text-sm font-semibold text-gray-500">⚡ Tidak perlu install aplikasi tambahan.</p>
            </motion.div>
          </motion.div>
        </section>

        {/* Live Payout Ticker */}
        <section className="mt-20 lg:mt-32 relative">
          {/* Fade edges */}
          <div className="absolute left-0 top-0 w-8 md:w-24 h-full bg-gradient-to-r from-[var(--color-flash-bg)] to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 w-8 md:w-24 h-full bg-gradient-to-l from-[var(--color-flash-bg)] to-transparent z-10 pointer-events-none" />
          <PayoutTicker />
        </section>

        {/* How It Works */}
        <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-extrabold mb-4 text-gray-900">Cara Kerja Semudah 1-2-3</h2>
            <p className="text-gray-600 font-medium max-w-xl mx-auto">Kami merancang sistem yang transparan dan tanpa ribet. Tidak ada syarat tersembunyi, murni dibayar untuk aktivitas Anda.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white border border-gray-100 shadow-lg shadow-gray-200/50 p-8 rounded-3xl relative overflow-hidden group hover:border-[var(--color-flash-orange)] transition-all hover:-translate-y-1">
              <div className="w-12 h-12 rounded-2xl flash-gradient-bg text-white flex items-center justify-center text-xl font-black mb-6 shadow-md shadow-orange-500/20">1</div>
              <h3 className="text-xl font-extrabold mb-3 text-gray-900">Mulai Bot</h3>
              <p className="text-gray-600 font-medium leading-relaxed">Klik tombol CTA di atas yang akan membuka bot resmi GRupiah di aplikasi Telegram Anda. Otomatis terdaftar.</p>
              <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity text-[var(--color-flash-orange)]">
                <Play className="w-40 h-40 fill-current" />
              </div>
            </div>

            <div className="bg-white border border-gray-100 shadow-lg shadow-gray-200/50 p-8 rounded-3xl relative overflow-hidden group hover:border-[var(--color-flash-orange)] transition-all hover:-translate-y-1">
              <div className="w-12 h-12 rounded-2xl flash-gradient-bg text-white flex items-center justify-center text-xl font-black mb-6 shadow-md shadow-orange-500/20">2</div>
              <h3 className="text-xl font-extrabold mb-3 text-gray-900">Kerjakan Tugas</h3>
              <p className="text-gray-600 font-medium leading-relaxed">Pilih berbagai tugas harian. Mulai dari follow sosmed, coba game, hingga isi survey. Masing-masing memiliki nominal saldo.</p>
              <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity text-[var(--color-flash-orange)]">
                <CheckCircle2 className="w-40 h-40 fill-current" />
              </div>
            </div>

            <div className="bg-white border border-gray-100 shadow-lg shadow-gray-200/50 p-8 rounded-3xl relative overflow-hidden group hover:border-[var(--color-flash-orange)] transition-all hover:-translate-y-1">
              <div className="w-12 h-12 rounded-2xl flash-gradient-bg text-white flex items-center justify-center text-xl font-black mb-6 shadow-md shadow-orange-500/20">3</div>
              <h3 className="text-xl font-extrabold mb-3 text-gray-900">Tarik Saldo</h3>
              <p className="text-gray-600 font-medium leading-relaxed">Saldo terkumpul? Langsung cairkan ke E-Wallet lokal (DANA, OVO, GOPAY). Proses instan tanpa waktu tunggu manual.</p>
              <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity text-[var(--color-flash-orange)]">
                <Gift className="w-40 h-40 fill-current" />
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-12 px-4 text-center">
        <p className="text-gray-500 font-medium text-sm">&copy; {new Date().getFullYear()} GRupiah Official. All rights reserved.</p>
        <div className="flex justify-center gap-6 mt-6">
          <a href="#" className="font-semibold text-gray-400 hover:text-[var(--color-flash-orange)] transition-colors text-sm">Privacy Policy</a>
          <a href="#" className="font-semibold text-gray-400 hover:text-[var(--color-flash-orange)] transition-colors text-sm">Terms of Service</a>
          <a href={botUrl} className="font-semibold text-gray-400 hover:text-[var(--color-flash-orange)] transition-colors text-sm">Hubungi Support</a>
        </div>
      </footer>
    </div>
  );
}

export default App;
