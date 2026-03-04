import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Play, Wallet, Gift, ArrowRight, CheckCircle2, Zap } from 'lucide-react';
import PayoutTicker from './components/PayoutTicker';

const App: React.FC = () => {
  const botUrl = "https://t.me/grupiah_bot";

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 100 }
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white selection:bg-emerald-500 selection:text-white font-sans overflow-x-hidden">
      <Helmet>
        <title>GRupiah - Cuan Instan via Telegram Tanpa Modal</title>
        <meta name="description" content="Kerjakan tugas mudah, main mini-game, dan tarik langsung saldo ke DANA/GOPAY dalam hitungan detik. 100% Gratis via Telegram." />
        <meta name="keywords" content="cara dapat uang dari internet, aplikasi penghasil uang, saldo dana gratis, telegram bot penghasil uang, grupiah" />
        <meta property="og:title" content="GRupiah - Ubah Waktu Luang Jadi Saldo Nyata" />
        <meta property="og:description" content="Platform cuan instan via Telegram. Pencairan detik detik ke E-Wallet!" />
        <link rel="canonical" href="https://grupiah.online" />
      </Helmet>

      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-gray-950/80 backdrop-blur-md z-50 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              GRupiah
            </span>
          </div>
          <a
            href={botUrl}
            className="px-4 py-2 rounded-full bg-gray-800 hover:bg-gray-700 text-sm font-medium transition-colors border border-gray-700 flex items-center gap-2"
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
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />
          <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />

          <motion.div
            className="text-center relative z-10 max-w-3xl mx-auto"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium mb-6">
              <Zap className="w-4 h-4" /> 100% Gratis Tanpa Deposit
            </motion.div>

            <motion.h1 variants={itemVariants} className="text-5xl lg:text-7xl font-extrabold tracking-tight mb-6">
              Ubah Waktu Luang Jadi <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Saldo Nyata</span>.
            </motion.h1>

            <motion.p variants={itemVariants} className="text-lg lg:text-xl text-gray-400 mb-10 leading-relaxed max-w-2xl mx-auto">
              Selesaikan tugas simpel, instal aplikasi, atau undang teman. Tarik penghasilanmu langsung ke DANA, OVO, atau GOPAY dalam hitungan detik. Cukup dari aplikasi Telegram!
            </motion.p>

            <motion.div variants={itemVariants}>
              <a
                href={botUrl}
                className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold text-lg shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)] hover:shadow-[0_0_60px_-15px_rgba(16,185,129,0.7)] transition-all transform hover:-translate-y-1"
              >
                <Play className="w-5 h-5 fill-current" /> Buka Telegram Bot Sekarang
              </a>
              <p className="mt-4 text-sm text-gray-500">Tidak perlu install aplikasi tambahan.</p>
            </motion.div>
          </motion.div>
        </section>

        {/* Live Payout Ticker */}
        <section className="mt-20 lg:mt-32 border-y border-gray-800/50 bg-gray-900/30 overflow-hidden relative">
          <div className="absolute left-0 top-0 w-24 h-full bg-gradient-to-r from-gray-950 to-transparent z-10" />
          <div className="absolute right-0 top-0 w-24 h-full bg-gradient-to-l from-gray-950 to-transparent z-10" />
          <PayoutTicker />
        </section>

        {/* How It Works */}
        <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Cara Kerja Semudah 1-2-3</h2>
            <p className="text-gray-400 max-w-xl mx-auto">Kami merancang sistem yang transparan dan tanpa ribet. Tidak ada syarat tersembunyi, murni dibayar untuk aktivitas Anda.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-900 border border-gray-800 p-8 rounded-3xl relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-gray-800 text-emerald-400 flex items-center justify-center text-xl font-bold mb-6">1</div>
              <h3 className="text-xl font-bold mb-3">Mulai Bot</h3>
              <p className="text-gray-400 leading-relaxed">Klik tombol CTA di atas yang akan membuka bot resmi GRupiah di aplikasi Telegram Anda. Otomatis terdaftar.</p>
              <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Play className="w-32 h-32" />
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 p-8 rounded-3xl relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-gray-800 text-emerald-400 flex items-center justify-center text-xl font-bold mb-6">2</div>
              <h3 className="text-xl font-bold mb-3">Kerjakan Tugas</h3>
              <p className="text-gray-400 leading-relaxed">Pilih berbagai tugas harian. Mulai dari follow sosmed, coba game, hingga isi survey. Masing-masing memiliki nominal saldo.</p>
              <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <CheckCircle2 className="w-32 h-32" />
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 p-8 rounded-3xl relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-gray-800 text-emerald-400 flex items-center justify-center text-xl font-bold mb-6">3</div>
              <h3 className="text-xl font-bold mb-3">Tarik Saldo</h3>
              <p className="text-gray-400 leading-relaxed">Saldo terkumpul? Langsung cairkan ke E-Wallet lokal (DANA, OVO, GOPAY). Proses instan tanpa waktu tunggu manual.</p>
              <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Gift className="w-32 h-32" />
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="bg-gray-950 border-t border-gray-900 py-12 px-4 text-center">
        <p className="text-gray-500 text-sm">&copy; {new Date().getFullYear()} GRupiah Official. All rights reserved.</p>
        <div className="flex justify-center gap-4 mt-4">
          <a href="#" className="text-gray-500 hover:text-white transition-colors text-sm">Privacy Policy</a>
          <a href="#" className="text-gray-500 hover:text-white transition-colors text-sm">Terms of Service</a>
          <a href={botUrl} className="text-gray-500 hover:text-white transition-colors text-sm">Hubungi Support</a>
        </div>
      </footer>
    </div>
  );
}

export default App;
