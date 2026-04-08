'use client';
import React from 'react';
import { X, ChevronRight, ChevronDown, Users, Shield, Plus, Pencil, Trash2 } from 'lucide-react';
import { DEFAULT_QUEST_ROLES } from '@/lib/constants';

export function QuestRoleSection() {
    type QuestRole = { id: string; name: string; duties: string[] };
    const [collapsed, setCollapsed] = React.useState(true);
    const [roles, setRoles] = React.useState<QuestRole[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const [formOpen, setFormOpen] = React.useState(false);
    const [editIdx, setEditIdx] = React.useState<number | null>(null);
    const [form, setForm] = React.useState({ id: '', name: '', duties: '' });
    const [error, setError] = React.useState('');

    const load = React.useCallback(async () => {
        setLoading(true);
        const { getQuestRoles } = await import('@/app/actions/admin');
        const data = await getQuestRoles();
        setRoles(data.length > 0 ? data : DEFAULT_QUEST_ROLES);
        setLoading(false);
    }, []);

    React.useEffect(() => { load(); }, [load]);

    const openNew = () => {
        setForm({ id: '', name: '', duties: '' });
        setEditIdx(null);
        setFormOpen(true);
        setError('');
    };

    const openEdit = (idx: number) => {
        const r = roles[idx];
        setForm({ id: r.id, name: r.name, duties: r.duties.join('\n') });
        setEditIdx(idx);
        setFormOpen(true);
        setError('');
    };

    const handleSave = async (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!form.id.trim() || !form.name.trim()) { setError('ID 與名稱為必填'); return; }
        const newRole: QuestRole = {
            id: form.id.trim(),
            name: form.name.trim(),
            duties: form.duties.split('\n').map(d => d.trim()).filter(Boolean),
        };
        let updated: QuestRole[];
        if (editIdx !== null) {
            updated = roles.map((r, i) => i === editIdx ? newRole : r);
        } else {
            if (roles.some(r => r.id === newRole.id)) { setError('此 ID 已存在'); return; }
            updated = [...roles, newRole];
        }
        setSaving(true);
        const { saveQuestRoles } = await import('@/app/actions/admin');
        const res = await saveQuestRoles(updated);
        setSaving(false);
        if (!res.success) { setError(res.error ?? '儲存失敗'); return; }
        setRoles(updated);
        setFormOpen(false);
    };

    const handleDelete = async (idx: number) => {
        if (!confirm(`確定刪除「${roles[idx].name}」？`)) return;
        const updated = roles.filter((_, i) => i !== idx);
        const { saveQuestRoles } = await import('@/app/actions/admin');
        await saveQuestRoles(updated);
        setRoles(updated);
    };

    return (
        <section className="space-y-4">
            <button onClick={() => setCollapsed(p => !p)}
                className="flex items-center gap-2 text-teal-400 font-black text-sm uppercase tracking-widest w-full">
                <Shield size={16} />
                任務角色管理
                {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            </button>
            {!collapsed && (
                <div className="space-y-4">
                    <button onClick={openNew}
                        className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-black rounded-xl transition-colors">
                        <Plus size={13} /> 新增角色
                    </button>
                    {loading ? (
                        <p className="text-xs text-slate-500 py-4 text-center">載入中...</p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {roles.map((r, idx) => (
                                <div key={r.id} className="bg-slate-900 border border-slate-700 rounded-2xl p-4 space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <p className="font-black text-white text-sm">{r.name}</p>
                                            <p className="text-[11px] text-slate-500 font-mono">{r.id}</p>
                                        </div>
                                        <div className="flex gap-1 shrink-0">
                                            <button onClick={() => openEdit(idx)}
                                                className="p-1.5 text-slate-400 hover:text-teal-400 rounded-lg hover:bg-slate-800 transition-colors">
                                                <Pencil size={12} />
                                            </button>
                                            <button onClick={() => handleDelete(idx)}
                                                className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition-colors">
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                    <ul className="space-y-1">
                                        {r.duties.map((d, i) => (
                                            <li key={i} className="text-[11px] text-slate-400 flex items-start gap-1.5">
                                                <span className="text-teal-500 mt-0.5 shrink-0">｜</span>{d}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    )}

                    {formOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
                            onClick={() => setFormOpen(false)}>
                            <form onSubmit={handleSave} onClick={e => e.stopPropagation()}
                                className="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
                                <h3 className="font-black text-white text-base">{editIdx !== null ? '編輯角色' : '新增角色'}</h3>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-[11px] text-slate-400 font-bold block mb-1">角色 ID（英文）</label>
                                        <input value={form.id} onChange={e => setForm(p => ({ ...p, id: e.target.value }))}
                                            disabled={editIdx !== null}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-teal-500 disabled:opacity-50 font-mono" />
                                    </div>
                                    <div>
                                        <label className="text-[11px] text-slate-400 font-bold block mb-1">角色名稱</label>
                                        <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-teal-500" />
                                    </div>
                                    <div>
                                        <label className="text-[11px] text-slate-400 font-bold block mb-1">職責（每行一條）</label>
                                        <textarea value={form.duties} onChange={e => setForm(p => ({ ...p, duties: e.target.value }))}
                                            rows={4}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-teal-500 resize-none" />
                                    </div>
                                </div>
                                {error && <p className="text-xs text-red-400 font-bold">{error}</p>}
                                <div className="flex gap-2 justify-end">
                                    <button type="button" onClick={() => setFormOpen(false)}
                                        className="px-4 py-2 text-xs font-black text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors">
                                        取消
                                    </button>
                                    <button type="submit" disabled={saving}
                                        className="px-4 py-2 text-xs font-black bg-teal-600 hover:bg-teal-500 text-white rounded-xl transition-colors disabled:opacity-50">
                                        {saving ? '儲存中...' : '儲存'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}

