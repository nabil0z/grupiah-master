"use client";

import { useState } from "react";
import { Megaphone, Send, Wand2, Loader2, AlertCircle, Users, Radio, Image, Link as LinkIcon } from "lucide-react";
import { broadcastApi } from "@/lib/api";

type BroadcastMode = 'channel' | 'private';

export default function BroadcastPage() {
    const [mode, setMode] = useState<BroadcastMode>('channel');
    const [topic, setTopic] = useState("");
    const [tone, setTone] = useState("Excited & FOMO");
    const [content, setContent] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [buttonText, setButtonText] = useState("");
    const [buttonUrl, setButtonUrl] = useState("");
    const [generating, setGenerating] = useState(false);
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState("");
    const [cronTesting, setCronTesting] = useState<number | null>(null);

    const generateAIPost = async () => {
        if (!topic) return;
        setGenerating(true);
        setError("");
        try {
            const draft = await broadcastApi.generateDraft(topic, tone);
            setContent(draft.content);
        } catch (err: any) {
            setError(err.message || 'Failed to generate draft');
        } finally {
            setGenerating(false);
        }
    };

    const handleSend = async () => {
        if (!content) return;
        setSending(true);
        setError("");
        setResult(null);
        try {
            if (mode === 'channel') {
                await broadcastApi.sendBroadcast(content, imageUrl || undefined);
                setResult({ type: 'channel', message: '✅ Broadcast sent to channel!' });
            } else {
                const res = await broadcastApi.sendPrivateBlast(
                    content,
                    imageUrl || undefined,
                    buttonText || undefined,
                    buttonUrl || undefined
                );
                setResult({
                    type: 'private',
                    message: `✅ DM Blast complete!`,
                    details: `Sent: ${res.sent} | Failed: ${res.failed} | Total: ${res.total}`
                });
            }
        } catch (err: any) {
            setError(err.message || 'Failed to send');
        } finally {
            setSending(false);
        }
    };

    const testCronjob = async (hour: number) => {
        setCronTesting(hour);
        setError("");
        setResult(null);
        try {
            const res = await broadcastApi.testCron(hour);
            setResult({ type: 'cron', message: `✅ ${res.message}` });
        } catch (err: any) {
            setError(err.message || 'Failed to test cron');
        } finally {
            setCronTesting(null);
        }
    };

    return (
        <div className="space-y-6 max-w-3xl">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Broadcast Engine</h1>
                <p className="text-slate-500 mt-1">Generate AI content and blast it to your channel or all users via DM.</p>
            </div>

            {/* Test Cronjob Banner */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h3 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                        <Radio size={16} className="text-indigo-600" />
                        Test Automated Hype (Cronjob)
                    </h3>
                    <p className="text-xs text-indigo-700 mt-1">Manual trigger for scheduled templates (Generates AI Draft + PNG Image + Post to Channel).</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={() => testCronjob(9)}
                        disabled={cronTesting !== null}
                        className="px-3 py-1.5 bg-white border border-indigo-200 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-100 disabled:opacity-50 transition-colors flex items-center gap-1"
                    >
                        {cronTesting === 9 ? <Loader2 size={12} className="animate-spin" /> : null} 09:00 (Pagi)
                    </button>
                    <button
                        onClick={() => testCronjob(15)}
                        disabled={cronTesting !== null}
                        className="px-3 py-1.5 bg-white border border-indigo-200 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-100 disabled:opacity-50 transition-colors flex items-center gap-1"
                    >
                        {cronTesting === 15 ? <Loader2 size={12} className="animate-spin" /> : null} 15:00 (Sore)
                    </button>
                    <button
                        onClick={() => testCronjob(21)}
                        disabled={cronTesting !== null}
                        className="px-3 py-1.5 bg-white border border-indigo-200 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-100 disabled:opacity-50 transition-colors flex items-center gap-1"
                    >
                        {cronTesting === 21 ? <Loader2 size={12} className="animate-spin" /> : null} 21:00 (Malam)
                    </button>
                </div>
            </div>

            {/* Mode Tabs */}
            <div className="flex gap-2 bg-slate-100 rounded-xl p-1">
                <button
                    onClick={() => setMode('channel')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${mode === 'channel' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Radio size={16} />
                    Channel Broadcast
                </button>
                <button
                    onClick={() => setMode('private')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${mode === 'private' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Users size={16} />
                    Private DM Blast
                </button>
            </div>

            {/* AI Generation */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Wand2 className="text-violet-500" size={20} />
                    <h2 className="text-lg font-bold text-slate-900">AI Content Generator</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Topic</label>
                        <input
                            type="text"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="e.g. Flash Sale Hari Ini, Task Baru Reward 50rb"
                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tone</label>
                        <select
                            value={tone}
                            onChange={(e) => setTone(e.target.value)}
                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-violet-500"
                        >
                            <option>Excited & FOMO</option>
                            <option>Professional & Informative</option>
                            <option>Casual & Friendly</option>
                            <option>Urgent & Limited</option>
                        </select>
                    </div>
                </div>
                <button
                    onClick={generateAIPost}
                    disabled={generating || !topic}
                    className="mt-4 px-6 py-2.5 bg-violet-500 hover:bg-violet-400 disabled:bg-slate-300 text-white font-bold rounded-xl transition-all flex items-center gap-2 text-sm"
                >
                    {generating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                    {generating ? 'Generating...' : 'Generate Draft'}
                </button>
            </div>

            {/* Content Editor */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Megaphone className="text-orange-500" size={20} />
                    <h2 className="text-lg font-bold text-slate-900">Message Content</h2>
                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full ml-auto">
                        {mode === 'channel' ? 'Channel Post' : 'Private DM'}
                    </span>
                </div>

                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write or paste your broadcast content here..."
                    rows={8}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-mono resize-y"
                />

                {/* Media & Button Options */}
                <div className="mt-4 space-y-3">
                    <div className="flex items-center gap-3">
                        <Image size={16} className="text-slate-400 shrink-0" />
                        <input
                            type="text"
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            placeholder="Image URL (optional, from Telegram or public CDN)"
                            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
                        />
                    </div>

                    {mode === 'private' && (
                        <div className="flex items-center gap-3">
                            <LinkIcon size={16} className="text-slate-400 shrink-0" />
                            <input
                                type="text"
                                value={buttonText}
                                onChange={(e) => setButtonText(e.target.value)}
                                placeholder="Button text (default: Buka Mini App GRupiah)"
                                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
                            />
                            <input
                                type="text"
                                value={buttonUrl}
                                onChange={(e) => setButtonUrl(e.target.value)}
                                placeholder="Button URL"
                                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
                            />
                        </div>
                    )}
                </div>

                {/* Error / Result */}
                {error && (
                    <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-sm text-rose-700">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}
                {result && (
                    <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
                        <p className="font-bold">{result.message}</p>
                        {result.details && <p className="text-xs mt-1">{result.details}</p>}
                    </div>
                )}

                {/* Send Button */}
                <button
                    onClick={handleSend}
                    disabled={sending || !content}
                    className={`mt-4 w-full py-3 font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm ${mode === 'channel'
                        ? 'bg-orange-500 hover:bg-orange-400 disabled:bg-slate-300 text-white'
                        : 'bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 text-white'
                        }`}
                >
                    {sending ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            {mode === 'channel' ? 'Sending to channel...' : 'Blasting DMs... (this may take a while)'}
                        </>
                    ) : (
                        <>
                            <Send size={18} />
                            {mode === 'channel' ? 'Send to Channel' : 'Blast to All Users (DM)'}
                        </>
                    )}
                </button>

                {mode === 'private' && (
                    <p className="text-[10px] text-slate-400 text-center mt-2">
                        ⚡ Messages are sent in batches of 25 with 1.5s delays to avoid Telegram rate limits.
                    </p>
                )}
            </div>
        </div>
    );
}
