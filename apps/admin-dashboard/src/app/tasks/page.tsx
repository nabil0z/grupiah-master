"use client";

import { useState } from "react";
import { PlusCircle, Loader2, Coins } from "lucide-react";
import { tasksApi } from "@/lib/api";

export default function CustomTaskCreation() {
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [reward, setReward] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const [errorMsg, setErrorMsg] = useState("");

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setSuccessMsg("");
        setErrorMsg("");

        try {
            const rewardNum = Number(reward);
            if (rewardNum <= 0) throw new Error("Reward must be greater than 0");

            await tasksApi.createCustomTask(title, description, rewardNum);

            setSuccessMsg(`Task "${title}" created successfully!`);
            setTitle("");
            setDescription("");
            setReward("");
        } catch (error: any) {
            setErrorMsg(error.message || "Failed to create task");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-2xl">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Manual Task Generator</h1>
                <p className="text-slate-500 mt-1">Create engaging custom tasks that users can complete by uploading screenshot proofs.</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
                <form onSubmit={handleCreateTask} className="space-y-5">
                    {successMsg && (
                        <div className="p-4 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 text-sm font-medium">
                            {successMsg}
                        </div>
                    )}

                    {errorMsg && (
                        <div className="p-4 bg-rose-50 text-rose-700 rounded-xl border border-rose-100 text-sm font-medium">
                            {errorMsg}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Task Title</label>
                        <input
                            type="text"
                            required
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow text-slate-900"
                            placeholder="e.g., Subscribe YouTube Channel A"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Detailed Instructions</label>
                        <textarea
                            required
                            rows={4}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow text-slate-900 resize-none"
                            placeholder="1. Go to link ...\n2. Click Subscribe\n3. Take a screenshot showing you are subscribed."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Reward Amount (Rp)</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Coins className="text-slate-400" size={18} />
                            </div>
                            <input
                                type="number"
                                required
                                min="1"
                                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow text-slate-900 font-mono"
                                placeholder="5000"
                                value={reward}
                                onChange={(e) => setReward(e.target.value)}
                            />
                        </div>
                        <p className="text-xs text-slate-400 mt-2">The static base reward to issue when this task is approved.</p>
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading || !title || !description || !reward}
                            className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow active:scale-[0.98]"
                        >
                            {loading ? <Loader2 size={20} className="animate-spin" /> : <PlusCircle size={20} />}
                            Broadcast Custom Task
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
