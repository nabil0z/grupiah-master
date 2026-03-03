"use client";

import { useState } from "react";
import { Megaphone, RefreshCw, Trophy, Send, Users, Wand2, Loader2, AlertCircle } from "lucide-react";
import { broadcastApi } from "@/lib/api";

export default function BroadcastGenerator() {
    const [fakeNames] = useState([
        "Budi S.", "Ahmad99", "Sischa_Ovo", "Rudi_Trader", "GamingBro", "Rina_Cantik"
    ]);

    const [generatedCaption, setGeneratedCaption] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const generateAIPost = async () => {
        try {
            setIsGenerating(true);
            setError(null);

            // For Demo: Pick a random topic focus
            const topics = ["Tarik Dana Cepat (WD)", "Tugas Flash Sale Baru Nominal Besar", "Sultan Referral Mingguan"];
            const randomTopic = topics[Math.floor(Math.random() * topics.length)];
            const name = fakeNames[Math.floor(Math.random() * fakeNames.length)];

            const prompt = `${randomTopic} menampilkan user @${name} yang baru saja mendapat cuan!`;

            const req = await broadcastApi.generateDraft(prompt, 'Hyper FOMO & Action Oriented');
            setGeneratedCaption(req.content);
        } catch (err: any) {
            console.error(err);
            setError('Gagal AI Generate: ' + err.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSendBroadcast = async () => {
        if (!generatedCaption) return;
        try {
            setIsSending(true);
            setError(null);
            setSuccessMsg(null);

            await broadcastApi.sendBroadcast(generatedCaption); // No image required for now

            setSuccessMsg('Successfully Blast Broadcast to Telegram Channel!');
            setGeneratedCaption("");
            setTimeout(() => setSuccessMsg(null), 3000);
        } catch (err: any) {
            console.error(err);
            setError('Gagal Send Broadcast: ' + err.message);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">AI Broadcast & Leaderboard</h1>
                <p className="text-slate-500 mt-1">Generate hype drops and manipulate the illusion of activity.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {error && (
                    <div className="lg:col-span-2 p-4 bg-red-50 text-red-600 rounded-xl flex items-start gap-2 text-sm border border-red-100">
                        <AlertCircle size={18} className="shrink-0" />
                        <span>{error}</span>
                    </div>
                )}
                {successMsg && (
                    <div className="lg:col-span-2 p-4 bg-green-50 text-green-600 rounded-xl flex items-center justify-center font-medium border border-green-100">
                        {successMsg}
                    </div>
                )}

                {/* Fake Leaderboard Generator */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Trophy className="text-amber-500" size={20} />
                            <h2 className="font-bold text-slate-900">Fake Leaderboard Injection</h2>
                        </div>
                        <span className="text-xs font-mono bg-amber-100 text-amber-700 px-2 py-1 rounded">Mirage Engine</span>
                    </div>

                    <div className="p-6 flex-1 flex flex-col">
                        <p className="text-sm text-slate-500 mb-6">
                            Inject AI-generated highly active fictional users into the global leaderboard to stimulate competition among real players.
                        </p>

                        <div className="space-y-4 flex-1">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Target Ranking Bracket</label>
                                <select className="w-full border-slate-200 rounded-lg text-sm p-2.5 focus:ring-emerald-500 focus:border-emerald-500">
                                    <option>Top 1 - 10 (Elite Phantoms)</option>
                                    <option>Top 11 - 50 (Challenger Bots)</option>
                                    <option>Top 51 - 100 (Active Noise)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Injection Volume (Bots)</label>
                                <input type="range" min="5" max="50" defaultValue="15" className="w-full accent-emerald-500" />
                                <div className="flex justify-between text-xs text-slate-400 mt-1">
                                    <span>5 Bots</span>
                                    <span>15 Selected</span>
                                    <span>50 Bots</span>
                                </div>
                            </div>
                        </div>

                        <button className="w-full mt-6 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all">
                            <Users size={18} />
                            Inject Fictional Leaders
                        </button>
                    </div>
                </div>

                {/* Telegram Broadcast Generator */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                    <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Megaphone className="text-blue-500" size={20} />
                            <h2 className="font-bold text-slate-900">Hype Broadcast Studio</h2>
                        </div>
                    </div>

                    <div className="p-6 flex-1 flex flex-col">
                        <div className="flex gap-2 mb-4">
                            <button
                                onClick={generateAIPost}
                                disabled={isGenerating}
                                className="flex-1 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 py-2.5 rounded-lg flex items-center justify-center gap-2 font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                                {isGenerating ? 'Drafting...' : 'Auto-Generate with AI'}
                            </button>
                            <button className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title="Attach Fake Proof Image" disabled={isGenerating || isSending}>
                                IMG
                            </button>
                        </div>

                        <textarea
                            className="w-full flex-1 border border-slate-200 rounded-xl p-4 text-sm resize-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-60"
                            placeholder="Tulis pesan hype atau klik Auto-Generate..."
                            value={generatedCaption}
                            onChange={(e) => setGeneratedCaption(e.target.value)}
                            disabled={isGenerating || isSending}
                        />

                        <button
                            onClick={handleSendBroadcast}
                            disabled={isSending || !generatedCaption}
                            className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-shadow shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                            {isSending ? 'Broadcasting...' : 'Send to Telegram Channel'}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
