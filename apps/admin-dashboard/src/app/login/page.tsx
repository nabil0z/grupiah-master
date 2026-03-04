'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, LogIn, ShieldAlert } from 'lucide-react';

export default function LoginPage() {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ password }),
            });

            if (res.ok) {
                // Redirect to dashboard on success
                router.push('/');
                router.refresh(); // Force refresh to apply middleware state
            } else {
                const data = await res.json();
                setError(data.error || 'Autentikasi gagal');
            }
        } catch (err) {
            setError('Terjadi kesalahan koneksi server.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 selection:bg-cyan-500/30">
            <div className="w-full max-w-md">
                {/* Glow Effect */}
                <div className="relative">
                    <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-500 opacity-20 blur-xl"></div>

                    <div className="relative bg-[#0f111a] border border-gray-800 p-8 rounded-2xl shadow-2xl">
                        <div className="w-12 h-12 bg-gray-900 rounded-xl flex items-center justify-center mb-6 border border-gray-800">
                            <Lock className="w-6 h-6 text-cyan-400" />
                        </div>

                        <h1 className="text-2xl font-bold mb-2 tracking-tight">Admin Area</h1>
                        <p className="text-gray-400 text-sm mb-8">
                            Masukkan master password untuk mengakses panel kontrol GRupiah.
                        </p>

                        {error && (
                            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                                <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                                <p className="text-sm text-red-200">{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleLogin} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    Master Password
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-[#161824] border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all font-mono"
                                    placeholder="••••••••"
                                    autoFocus
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-white text-black font-semibold rounded-xl px-4 py-3 flex items-center justify-center gap-2 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                            >
                                {isLoading ? (
                                    <div className="w-5 h-5 border-2 border-black border-t-transparent flex-shrink-0 rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <LogIn className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        Buka Dashboard
                                    </>
                                )}
                            </button>
                        </form>

                    </div>
                </div>

                <p className="text-center text-xs text-gray-600 mt-8">
                    Restricted Access &bull; Unauthorized entry is logged.
                </p>
            </div>
        </div>
    );
}
