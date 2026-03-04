import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

const mockNames = ["Budi S***", "Andi R***", "Siti F***", "Reza M***", "Dina K***", "Rudi H***", "Putri A***", "Bayu P***"];
const mockAmounts = [25000, 50000, 75000, 100000, 150000, 300000, 500000, 1000000];
const wallets = ["DANA", "GOPAY", "OVO", "ShopeePay"];

interface PayoutEvent {
    id: number;
    name: string;
    amount: number;
    wallet: string;
    time: string;
}

const generatePayout = (id: number): PayoutEvent => {
    const amount = mockAmounts[Math.floor(Math.random() * mockAmounts.length)];
    return {
        id,
        name: mockNames[Math.floor(Math.random() * mockNames.length)],
        amount,
        wallet: wallets[Math.floor(Math.random() * wallets.length)],
        time: "Baru saja"
    };
};

const PayoutTicker: React.FC = () => {
    const [payouts, setPayouts] = useState<PayoutEvent[]>([]);

    useEffect(() => {
        // Initial payload
        setPayouts(Array.from({ length: 5 }, (_, i) => generatePayout(i)));

        // Simulate incoming payouts every few seconds to look completely live
        const interval = setInterval(() => {
            setPayouts(prev => {
                const newEvent = generatePayout(Date.now());
                return [newEvent, ...prev].slice(0, 5); // Keep exactly 5 visible items to animate
            });
        }, 4500);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="w-full h-24 flex items-center overflow-hidden">
            <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex items-center justify-center w-full relative">
                <div className="flex gap-4 items-center">

                    <AnimatePresence mode='popLayout'>
                        {payouts.map((payout) => (
                            <motion.div
                                key={payout.id}
                                layout
                                initial={{ opacity: 0, x: -50, scale: 0.8 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                                transition={{ type: "spring", stiffness: 100, damping: 15 }}
                                className="flex items-center gap-3 bg-gray-800/80 backdrop-blur border border-gray-700/50 px-4 py-3 rounded-full shrink-0"
                            >
                                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-semibold text-gray-200">
                                        {payout.name} menarik Rp {payout.amount.toLocaleString('id-ID')}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                        ke {payout.wallet} • {payout.time}
                                    </span>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                </div>
            </div>
        </div>
    );
};

export default PayoutTicker;
