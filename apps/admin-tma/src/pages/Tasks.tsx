import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Pencil, Trash2, Copy, Check, Loader2,
    X, Save, ClipboardCheck
} from 'lucide-react';


export default function Tasks() {
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [form, setForm] = useState({ title: '', description: '', reward: '', link: '', logoUrl: '' });

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        try {
            // Fetch from admin tasks endpoint
            const response = await fetch(
                `${import.meta.env.VITE_API_URL || 'http://localhost:53000'}/admin/tasks`,
                { headers: { 'Authorization': `tma ${(window as any).Telegram?.WebApp?.initData || 'mock_token'}` } }
            );
            const customTasks = await response.json();
            setTasks(Array.isArray(customTasks) ? customTasks : []);
        } catch (e) {
            console.error('Failed to fetch tasks', e);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setForm({ title: '', description: '', reward: '', link: '', logoUrl: '' });
        setEditingId(null);
        setShowForm(false);
    };

    const handleSubmit = async () => {
        if (!form.title || !form.reward) return alert('Title dan Reward wajib diisi');
        setSaving(true);
        try {
            if (editingId) {
                await fetch(
                    `${import.meta.env.VITE_API_URL || 'http://localhost:53000'}/admin/tasks/${editingId}`,
                    {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `tma ${(window as any).Telegram?.WebApp?.initData || 'mock_token'}`
                        },
                        body: JSON.stringify({ ...form, reward: Number(form.reward) })
                    }
                );
            } else {
                await fetch(
                    `${import.meta.env.VITE_API_URL || 'http://localhost:53000'}/admin/tasks`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `tma ${(window as any).Telegram?.WebApp?.initData || 'mock_token'}`
                        },
                        body: JSON.stringify({ ...form, reward: Number(form.reward) })
                    }
                );
            }
            resetForm();
            await fetchTasks();
        } catch (e) {
            alert('Failed to save task');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Hapus task ini?')) return;
        try {
            await fetch(
                `${import.meta.env.VITE_API_URL || 'http://localhost:53000'}/admin/tasks/${id}`,
                {
                    method: 'DELETE',
                    headers: { 'Authorization': `tma ${(window as any).Telegram?.WebApp?.initData || 'mock_token'}` }
                }
            );
            await fetchTasks();
        } catch (e) {
            alert('Failed to delete');
        }
    };

    const handleEdit = (task: any) => {
        setForm({
            title: task.title || '',
            description: task.description || '',
            reward: String(task.reward || ''),
            link: task.link || '',
            logoUrl: task.logoUrl || '',
        });
        setEditingId(task.id);
        setShowForm(true);
    };

    const handleCopyLink = (task: any) => {
        const link = task.link || `https://app.grupiah.online/task/${task.id}`;
        navigator.clipboard.writeText(link);
        setCopiedId(task.id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin mb-3 text-[var(--color-admin-accent)]" />
                <p className="text-sm">Loading tasks...</p>
            </div>
        );
    }

    return (
        <div className="p-4 pb-24 max-w-md mx-auto space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-black text-gray-900">Custom Tasks</h1>
                <button
                    onClick={() => { resetForm(); setShowForm(true); }}
                    className="flex items-center gap-1.5 bg-[var(--color-admin-accent)] text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm"
                >
                    <Plus size={16} /> New Task
                </button>
            </div>

            {/* Create/Edit Form */}
            <AnimatePresence>
                {showForm && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3"
                    >
                        <div className="flex items-center justify-between">
                            <h2 className="font-bold text-gray-800">{editingId ? 'Edit Task' : 'New Task'}</h2>
                            <button onClick={resetForm} className="text-gray-400"><X size={18} /></button>
                        </div>
                        <input
                            value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                            placeholder="Task Title *"
                            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-admin-accent)]"
                        />
                        <textarea
                            value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                            placeholder="Description"
                            rows={2}
                            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-admin-accent)]"
                        />
                        <div className="grid grid-cols-2 gap-2">
                            <input
                                value={form.reward} onChange={(e) => setForm({ ...form, reward: e.target.value })}
                                placeholder="Reward (Rp) *" type="number"
                                className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-admin-accent)]"
                            />
                            <input
                                value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })}
                                placeholder="Task Link"
                                className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-admin-accent)]"
                            />
                        </div>
                        <input
                            value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                            placeholder="Logo URL (optional)"
                            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-admin-accent)]"
                        />
                        <button
                            onClick={handleSubmit} disabled={saving}
                            className="w-full bg-[var(--color-admin-accent)] text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            {editingId ? 'Update Task' : 'Create Task'}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Task List */}
            <div className="space-y-2">
                {tasks.length === 0 ? (
                    <div className="text-center py-12 text-gray-300">
                        <ClipboardCheck size={40} className="mx-auto mb-2 opacity-30" />
                        <p>No custom tasks yet</p>
                    </div>
                ) : tasks.map((task) => (
                    <motion.div key={task.id} whileTap={{ scale: 0.98 }}
                        className="bg-white rounded-xl p-3 shadow-sm border border-gray-100"
                    >
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-gray-800 text-sm truncate">{task.title}</p>
                                <p className="text-xs text-gray-400 mt-0.5 truncate">{task.description || 'No description'}</p>
                                <div className="flex items-center gap-3 mt-2">
                                    <span className="text-xs font-bold text-[#FF5A00]">Rp {Number(task.reward || 0).toLocaleString('id-ID')}</span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${task.isActive !== false ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                                        {task.isActive !== false ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                            </div>
                            <div className="flex gap-1 shrink-0">
                                <button onClick={() => handleCopyLink(task)}
                                    className="p-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-500 transition-colors"
                                    title="Copy Link"
                                >
                                    {copiedId === task.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                </button>
                                <button onClick={() => handleEdit(task)}
                                    className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors"
                                >
                                    <Pencil size={14} />
                                </button>
                                <button onClick={() => handleDelete(task.id)}
                                    className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition-colors"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
