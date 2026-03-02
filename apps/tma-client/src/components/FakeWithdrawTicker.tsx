import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Banknote, CheckCircle2 } from 'lucide-react';

const FAKE_NAMES = ["Budi****", "Siti****", "Agus****", "0812****", "0857****", "Reza****", "Putri****", "Rian****", "0821****", "Dian****"];
const FAKE_AMOUNTS = [500000, 550000, 600000, 750000, 1000000, 1500000, 2500000];
const FAKE_METHODS = ["DANA", "Gopay", "OVO", "Bank BCA", "Bank Mandiri"];

// --- KONFIGURASI KEMUNCULAN NOTIFIKASI ---
// Lama notifikasi membeku di layar sebelum menghilang otomatis
const DISPLAY_DURATION_MS = 4000; // 4 Detik

// Pengecekan interval setiap X milidetik
// Ubah ke 60000 jika ingin mengecek setiap 1 Menit sekali
const INTERVAL_CHECK_MS = 15000; // 15 Detik

// Probabilitas (Peluang) notifikasi muncul setiap kali interval mengecek.
// 0.5 = 50% kemungkinan muncul. 1.0 = 100% PASTI muncul setiap interval.
const PROBABILITY_TO_SHOW = 0.5;

export default function FakeWithdrawTicker() {
    const [notification, setNotification] = useState<{ name: string, amount: number, method: string, id: number } | null>(null);

    useEffect(() => {
        const triggerNotification = () => {
            const randomName = FAKE_NAMES[Math.floor(Math.random() * FAKE_NAMES.length)];
            const randomAmount = FAKE_AMOUNTS[Math.floor(Math.random() * FAKE_AMOUNTS.length)];
            const randomMethod = FAKE_METHODS[Math.floor(Math.random() * FAKE_METHODS.length)];

            setNotification({
                name: randomName,
                amount: randomAmount,
                method: randomMethod,
                id: Date.now()
            });

            // Hide the notification
            setTimeout(() => {
                setNotification(null);
            }, DISPLAY_DURATION_MS);
        };

        // Run the first notification naturally after page load
        const initialTimer = setTimeout(() => {
            triggerNotification();

            // Then continue popping up dynamically based on the configuration above
            const intervalTimer = setInterval(() => {
                if (Math.random() <= PROBABILITY_TO_SHOW) {
                    triggerNotification();
                }
            }, INTERVAL_CHECK_MS);

            return () => clearInterval(intervalTimer);
        }, 3000 + (Math.random() * 5000));

        return () => clearTimeout(initialTimer);
    }, []);

    return (
        <AnimatePresence>
            {notification && (
                <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, y: -50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="fixed top-4 left-4 right-4 z-[100] sm:mx-auto sm:max-w-sm pointer-events-none"
                >
                    <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl p-3 shadow-2xl border border-slate-700 flex items-center gap-3">
                        <div className="bg-emerald-500/20 w-10 h-10 rounded-full flex items-center justify-center shrink-0">
                            <Banknote size={20} className="text-emerald-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-bold truncate">
                                {notification.name} <span className="text-slate-300 font-normal">berhasil Cair</span>
                            </p>
                            <p className="text-emerald-400 font-black font-mono text-sm inline-flex items-center gap-1 mt-0.5">
                                Rp {notification.amount.toLocaleString('id-ID')}
                                <span className="text-xs text-slate-400 font-sans font-medium ml-1">ke {notification.method}</span>
                            </p>
                        </div>
                        <div className="shrink-0">
                            <CheckCircle2 size={18} className="text-emerald-500" />
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
