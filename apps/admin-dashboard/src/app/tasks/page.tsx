"use client";

import { useState, useEffect } from "react";
import { PlusCircle, Loader2, Coins, Zap, Edit3, Trash2, Link as LinkIcon, X, Target } from "lucide-react";
import { tasksApi } from "@/lib/api";

export default function CustomTaskCreation() {
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [instructions, setInstructions] = useState("");
    const [logoUrl, setLogoUrl] = useState("");
    const [link, setLink] = useState("");
    const [reward, setReward] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const [errorMsg, setErrorMsg] = useState("");

    // Flash Tasks State
    const [flashLoading, setFlashLoading] = useState(false);
    const [flashOgads, setFlashOgads] = useState("");
    const [flashAdblue, setFlashAdblue] = useState("");
    const [flashCustom, setFlashCustom] = useState("");
    const [flashSuccessMsg, setFlashSuccessMsg] = useState("");

    const [tasks, setTasks] = useState<any[]>([]);
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

    const loadTasks = async () => {
        try {
            const data = await tasksApi.getCustomTasks();
            setTasks(data);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        loadTasks();
        tasksApi.getFlashConfig().then(data => {
            setFlashOgads(data.ogads || "");
            setFlashAdblue(data.adblue || "");
            setFlashCustom(data.custom || "");
        }).catch(console.error);
    }, []);

    const handleUpdateFlash = async (e: React.FormEvent) => {
        e.preventDefault();
        setFlashLoading(true);
        setFlashSuccessMsg("");
        try {
            await tasksApi.updateFlashConfig({ ogads: flashOgads, adblue: flashAdblue, custom: flashCustom });
            setFlashSuccessMsg("Pengaturan Flash Tasks berhasil disimpan!");
        } catch (e) {
            console.error(e);
        } finally {
            setFlashLoading(false);
        }
    };

    const handleSubmitTask = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setSuccessMsg("");
        setErrorMsg("");

        try {
            const rewardNum = Number(reward);
            if (rewardNum <= 0) throw new Error("Reward must be greater than 0");

            if (editingTaskId) {
                await tasksApi.updateCustomTask(editingTaskId, {
                    title, description, reward: rewardNum, instructions, logoUrl, link
                });
                setSuccessMsg(`Task "${title}" updated successfully!`);
                setEditingTaskId(null);
            } else {
                await tasksApi.createCustomTask(title, description, rewardNum, instructions, logoUrl, link);
                setSuccessMsg(`Task "${title}" created successfully!`);
            }

            setTitle("");
            setDescription("");
            setInstructions("");
            setLogoUrl("");
            setLink("");
            setReward("");
            loadTasks();
        } catch (error: any) {
            setErrorMsg(error.message || "Failed to save task");
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (task: any) => {
        setEditingTaskId(task.id);
        setTitle(task.title);
        setDescription(task.description);
        setInstructions(task.instructions || "");
        setLogoUrl(task.logoUrl || "");
        setLink(task.link || "");
        setReward(task.reward.toString());
        setSuccessMsg("");
        setErrorMsg("");
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this task?")) return;
        try {
            await tasksApi.deleteCustomTask(id);
            loadTasks();
            if (editingTaskId === id) {
                setEditingTaskId(null);
                setTitle("");
                setDescription("");
                setInstructions("");
                setLogoUrl("");
                setLink("");
                setReward("");
            }
        } catch (error) {
            console.error("Failed to delete task", error);
            alert("Failed to delete task");
        }
    };

    return (
        <div className="space-y-6 max-w-2xl">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Task Management</h1>
                <p className="text-slate-500 mt-1">Create engaging custom tasks that users can complete by uploading screenshot proofs.</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
                <form onSubmit={handleSubmitTask} className="space-y-5">
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
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Short Description</label>
                        <input
                            type="text"
                            required
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow text-slate-900"
                            placeholder="e.g., Subscribe to get rewards"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Detailed Instructions (Optional)</label>
                        <textarea
                            rows={3}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow text-slate-900 resize-none"
                            placeholder="1. Go to link ...\n2. Click Subscribe\n3. Take a screenshot showing you are subscribed."
                            value={instructions}
                            onChange={(e) => setInstructions(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Logo URL (Optional)</label>
                            <input
                                type="url"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow text-slate-900"
                                placeholder="https://..."
                                value={logoUrl}
                                onChange={(e) => setLogoUrl(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Task Link (Optional)</label>
                            <input
                                type="url"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow text-slate-900"
                                placeholder="https://..."
                                value={link}
                                onChange={(e) => setLink(e.target.value)}
                            />
                        </div>
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

                    <div className="pt-2 flex gap-3">
                        <button
                            type="submit"
                            disabled={loading || !title || !description || !reward}
                            className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow active:scale-[0.98]"
                        >
                            {loading ? <Loader2 size={20} className="animate-spin" /> : (editingTaskId ? <Edit3 size={20} /> : <PlusCircle size={20} />)}
                            {editingTaskId ? "Update Task" : "Create Custom Task"}
                        </button>
                        {editingTaskId && (
                            <button
                                type="button"
                                onClick={() => {
                                    setEditingTaskId(null);
                                    setTitle(""); setDescription(""); setInstructions(""); setLogoUrl(""); setLink(""); setReward("");
                                }}
                                className="px-6 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-semibold transition-all shadow-sm active:scale-[0.98]"
                            >
                                <X size={20} /> Cancel
                            </button>
                        )}
                    </div>
                </form>
            </div>

            {/* List Active Tasks */}
            {tasks.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                        <h2 className="text-xl font-bold text-slate-800">Available External Tasks</h2>
                        <span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-bold">{tasks.length} Active</span>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {tasks.map(task => (
                            <div key={task.id} className="p-5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    {task.logoUrl ? (
                                        <img src={task.logoUrl} alt={task.title} className="w-12 h-12 rounded-xl object-cover bg-white border border-slate-100" />
                                    ) : (
                                        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200">
                                            <Target size={24} className="text-slate-400" />
                                        </div>
                                    )}
                                    <div>
                                        <h3 className="font-bold text-slate-900">{task.title}</h3>
                                        <p className="text-sm text-slate-500 line-clamp-1">{task.description}</p>
                                        <div className="mt-1 flex items-center gap-2 text-xs font-medium">
                                            <span className="text-emerald-600 flex items-center gap-1"><Coins size={12} /> Rp{task.reward.toLocaleString('id-ID')}</span>
                                            <span className="text-slate-300">•</span>
                                            <span className="text-slate-500">ID: {task.id}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => {
                                        navigator.clipboard.writeText(`https://t.me/grupiah_bot/app?startapp=task_${task.id}`);
                                        alert('Deeplink disalin: https://t.me/grupiah_bot/app?startapp=task_' + task.id);
                                    }} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Copy Deeplink">
                                        <LinkIcon size={18} />
                                    </button>
                                    <button onClick={() => handleEdit(task)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit Task">
                                        <Edit3 size={18} />
                                    </button>
                                    {task.link && (
                                        <a href={task.link} target="_blank" rel="noopener noreferrer" className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Open Link">
                                            <Target size={18} />
                                        </a>
                                    )}
                                    <button onClick={() => handleDelete(task.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Delete Task">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Flash Tasks Config */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 mt-6">
                <div className="mb-5">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800"><Zap className="text-amber-500" /> Pengaturan Flash Tasks</h2>
                    <p className="text-sm text-slate-500 mt-1">Kosongkan kolom ID untuk membiarkan AI secara otomatis memilih penawaran dengan konversi (Expected Value) tertinggi.</p>
                </div>
                {flashSuccessMsg && <div className="p-4 mb-4 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 text-sm font-medium">{flashSuccessMsg}</div>}

                <form onSubmit={handleUpdateFlash} className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">OGAds Task ID (Opsional)</label>
                        <input type="text" value={flashOgads} onChange={e => setFlashOgads(e.target.value)} placeholder="Contoh: 12345" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 text-slate-900" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">AdBlueMedia Task ID (Opsional)</label>
                        <input type="text" value={flashAdblue} onChange={e => setFlashAdblue(e.target.value)} placeholder="Contoh: 67890" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 text-slate-900" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Custom Task Internal ID (Opsional)</label>
                        <input type="text" value={flashCustom} onChange={e => setFlashCustom(e.target.value)} placeholder="Contoh: c2f4..." className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 text-slate-900" />
                    </div>
                    <button type="submit" disabled={flashLoading} className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-xl font-semibold transition-all shadow-sm active:scale-[0.98]">
                        {flashLoading ? <Loader2 size={18} className="animate-spin" /> : null} Simpan Konfigurasi Flash
                    </button>
                </form>
            </div>
        </div>
    );
}
