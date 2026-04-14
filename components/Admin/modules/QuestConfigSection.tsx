'use client';
import React from 'react';
import { Settings, X, Pencil, ToggleLeft, ToggleRight, ChevronRight, ChevronDown } from 'lucide-react';
import { logAdminAction } from '@/app/actions/admin';
import type { DailyQuestConfigRow } from '@/app/actions/admin';
import { IconPicker } from '../shared/IconPicker';

const EMPTY_QUEST_FORM: Omit<DailyQuestConfigRow, 'created_at'> = {
    id: '', title: '', sub: '', desc: '', reward: 100, coins: null, dice: 1, icon: '', limit: null, sort_order: 0, is_active: true,
};

export function DailyQuestConfigSection() {
    const [collapsed, setCollapsed] = React.useState(true);
    const [rows, setRows] = React.useState<DailyQuestConfigRow[]>([]);
    const [isFromDb, setIsFromDb] = React.useState(false);
    const [loading, setLoading] = React.useState(true);
    const [editingId, setEditingId] = React.useState<string | null>(null);
    const [formOpen, setFormOpen] = React.useState(false);
    const [form, setForm] = React.useState<Omit<DailyQuestConfigRow, 'created_at'>>(EMPTY_QUEST_FORM);
    const [saving, setSaving] = React.useState(false);
    const [deleting, setDeleting] = React.useState<string | null>(null);
    const [seeding, setSeeding] = React.useState(false);
    const [error, setError] = React.useState('');

    const load = React.useCallback(async () => {
        setLoading(true);
        const { listDailyQuestConfig } = await import('@/app/actions/admin');
        const dbRows = await listDailyQuestConfig();
        if (dbRows.length > 0) {
            setRows(dbRows);
            setIsFromDb(true);
        } else {
            const { DAILY_QUEST_CONFIG } = await import('@/lib/constants');
            setRows(DAILY_QUEST_CONFIG.map((q, i) => ({
                id: q.id, title: q.title, sub: q.sub ?? null, desc: q.desc ?? null,
                reward: q.reward, coins: null, dice: q.dice ?? 1, icon: q.icon ?? null,
                limit: q.limit ?? null, sort_order: i + 1, is_active: true,
                created_at: '',
            })));
            setIsFromDb(false);
        }
        setLoading(false);
    }, []);

    React.useEffect(() => { load(); }, [load]);

    const openNew = () => {
        setForm({ ...EMPTY_QUEST_FORM, sort_order: rows.length + 1 });
        setEditingId(null);
        setFormOpen(true);
        setError('');
    };

    const openEdit = (r: DailyQuestConfigRow) => {
        setForm({ id: r.id, title: r.title, sub: r.sub ?? '', desc: r.desc ?? '', reward: r.reward, coins: r.coins, dice: r.dice, icon: r.icon ?? '', limit: r.limit, sort_order: r.sort_order, is_active: r.is_active });
        setEditingId(r.id);
        setFormOpen(true);
        setError('');
    };

    const handleSave = async (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!form.id.trim() || !form.title.trim()) { setError('定課 ID 與標題為必填'); return; }
        setSaving(true);
        setError('');
        const { upsertDailyQuestConfig } = await import('@/app/actions/admin');
        const res = await upsertDailyQuestConfig({ ...form, sub: form.sub || null, desc: form.desc || null, icon: form.icon || null });
        setSaving(false);
        if (!res.success) { setError(res.error ?? '儲存失敗'); return; }
        await logAdminAction(editingId ? 'quest_config_update' : 'quest_config_create', 'admin', form.id, form.title, { exp: form.reward, coins: form.coins ?? 0, dice: form.dice, active: form.is_active });
        setFormOpen(false);
        load();
    };

    const handleToggle = async (r: DailyQuestConfigRow) => {
        const { upsertDailyQuestConfig } = await import('@/app/actions/admin');
        await upsertDailyQuestConfig({ ...r, sub: r.sub, desc: r.desc, icon: r.icon, is_active: !r.is_active });
        setRows(prev => prev.map(x => x.id === r.id ? { ...x, is_active: !x.is_active } : x));
        await logAdminAction('quest_config_toggle', 'admin', r.id, r.title, { active: !r.is_active });
    };

    const handleSeedDefaults = async () => {
        if (!confirm('將把程式碼中的 q1–q9 預設定課匯入資料庫（已存在的 ID 會略過）。確定執行？')) return;
        setSeeding(true);
        const { upsertDailyQuestConfig } = await import('@/app/actions/admin');
        const { DAILY_QUEST_CONFIG } = await import('@/lib/constants');
        for (let i = 0; i < DAILY_QUEST_CONFIG.length; i++) {
            const q = DAILY_QUEST_CONFIG[i];
            await upsertDailyQuestConfig({
                id: q.id, title: q.title, sub: q.sub ?? null, desc: q.desc ?? null,
                reward: q.reward, coins: null, dice: q.dice ?? 1, icon: q.icon ?? null,
                limit: q.limit ?? null, sort_order: i + 1, is_active: true,
            });
        }
        await logAdminAction('quest_config_seed', 'admin', undefined, undefined, { count: DAILY_QUEST_CONFIG.length });
        setSeeding(false);
        load();
    };

    const handleDelete = async (id: string) => {
        if (!confirm(`確定刪除定課 ${id}？此操作無法復原。`)) return;
        setDeleting(id);
        const { deleteDailyQuestConfig } = await import('@/app/actions/admin');
        await deleteDailyQuestConfig(id);
        setDeleting(null);
        await logAdminAction('quest_config_delete', 'admin', id);
        load();
    };

    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between">
                <button onClick={() => setCollapsed(c => !c)}
                    className="flex items-center gap-2 text-orange-500 font-black text-sm uppercase tracking-widest hover:text-orange-400 transition-colors">
                    <Settings size={16} /> 定課管理
                    {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                </button>
                {!collapsed && (
                <div className="flex items-center gap-2">
                    <button onClick={handleSeedDefaults} disabled={seeding}
                        className="flex items-center gap-1.5 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-black rounded-xl transition-colors disabled:opacity-50">
                        {seeding ? '匯入中...' : '📥 匯入預設定課'}
                    </button>
                    <button onClick={openNew}
                        className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-black rounded-xl transition-colors shadow-lg">
                        ➕ 新增定課
                    </button>
                </div>
                )}
            </div>

            {!collapsed && !isFromDb && !loading && (
                <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl px-4 py-3">
                    <span className="text-amber-400 text-lg shrink-0">⚠️</span>
                    <p className="text-xs text-amber-300 font-bold">
                        目前顯示的是程式碼預設定課（尚未匯入資料庫）。點擊「📥 匯入預設定課」將清單儲存至資料庫後即可編輯。
                    </p>
                </div>
            )}

            {!collapsed && <div className={`bg-slate-900 border-2 rounded-4xl shadow-xl overflow-hidden ${isFromDb ? 'border-slate-800' : 'border-amber-500/20'}`}>
                {loading ? (
                    <p className="text-xs text-slate-500 text-center py-10">載入中...</p>
                ) : (
                    <div className="divide-y divide-slate-800">
                        {rows.map(r => (
                            <div key={r.id} className="flex items-center gap-4 px-6 py-4 hover:bg-white/5 transition-colors">
                                <div className="w-10 shrink-0 text-center space-y-1">
                                    {r.icon && (r.icon.startsWith('/') || r.icon.startsWith('http'))
                                        ? <img src={r.icon} alt="" className="w-8 h-8 rounded-xl object-cover mx-auto" />
                                        : r.icon
                                            ? <span className="text-2xl">{r.icon}</span>
                                            : <div className="w-8 h-8 rounded-xl bg-slate-800 mx-auto" />}
                                    <span className="text-xs font-black text-slate-600 font-mono block">{r.id}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-black text-white text-sm">{r.title}</span>
                                        {r.sub && <span className="text-xs text-orange-400">{r.sub}</span>}
                                        {isFromDb && <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${r.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-500'}`}>{r.is_active ? '啟用' : '停用'}</span>}
                                    </div>
                                    {r.desc && <p className="text-xs text-slate-500 mt-0.5">{r.desc}</p>}
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-xs text-emerald-400 font-black">+{r.reward} 修為</span>
                                        <span className="text-xs text-yellow-400 font-black">金幣{r.coins != null ? r.coins : `${Math.floor(r.reward * 0.1)}（預設）`}</span>
                                        <span className="text-xs text-sky-400 font-black">🎲×{r.dice}</span>
                                        {r.limit && <span className="text-xs text-amber-400 font-black">上限 {r.limit}</span>}
                                        <span className="text-xs text-slate-600">排序 {r.sort_order}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {isFromDb && (
                                        <button onClick={() => handleToggle(r)}
                                            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-emerald-400 transition-colors">
                                            {r.is_active ? <ToggleRight size={16} className="text-emerald-400" /> : <ToggleLeft size={16} />}
                                        </button>
                                    )}
                                    <button onClick={() => openEdit(r)}
                                        className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-amber-400 transition-colors">
                                        <Pencil size={14} />
                                    </button>
                                    {isFromDb && (
                                        <button onClick={() => handleDelete(r.id)} disabled={deleting === r.id}
                                            className="p-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors disabled:opacity-40">
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>}

            {!collapsed && formOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in"
                    onClick={() => setFormOpen(false)}>
                    <div className="bg-slate-900 border border-slate-700 rounded-4xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-6 border-b border-slate-800">
                            <h3 className="text-base font-black text-white">{editingId ? `編輯定課：${editingId}` : '新增定課'}</h3>
                            <button onClick={() => setFormOpen(false)} className="p-2 bg-slate-800 rounded-xl text-slate-400 hover:text-white"><X size={16} /></button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">定課 ID *</label>
                                    <input required placeholder="e.g. q10" value={form.id} disabled={!!editingId}
                                        onChange={e => setForm(f => ({ ...f, id: e.target.value.trim() }))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-bold outline-none focus:border-orange-500 text-sm disabled:opacity-50" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">排序</label>
                                    <input type="number" value={form.sort_order}
                                        onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-bold outline-none focus:border-orange-500 text-sm" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">定課標題 *</label>
                                <input required placeholder="e.g. 打拳" value={form.title}
                                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-bold outline-none focus:border-orange-500 text-sm" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">副標題</label>
                                <input placeholder="e.g. 身體開發" value={form.sub ?? ''}
                                    onChange={e => setForm(f => ({ ...f, sub: e.target.value }))}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-bold outline-none focus:border-orange-500 text-sm" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">完成說明（選填）</label>
                                <input placeholder="e.g. 全程正念練習 30 分鐘" value={form.desc ?? ''}
                                    onChange={e => setForm(f => ({ ...f, desc: e.target.value }))}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-bold outline-none focus:border-orange-500 text-sm" />
                            </div>
                            <IconPicker value={form.icon ?? ''} onChange={v => setForm(f => ({ ...f, icon: v || null }))} />
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">修為獎勵</label>
                                    <input type="number" min={0} value={form.reward}
                                        onChange={e => setForm(f => ({ ...f, reward: Number(e.target.value) }))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-bold outline-none focus:border-orange-500 text-sm text-center" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">
                                        金幣獎勵
                                        <span className="ml-1 text-slate-600 normal-case font-normal">空=修為×0.1</span>
                                    </label>
                                    <input type="number" min={0} placeholder={`預設 ${Math.floor((form.reward || 0) * 0.1)}`}
                                        value={form.coins ?? ''}
                                        onChange={e => setForm(f => ({ ...f, coins: e.target.value !== '' ? Number(e.target.value) : null }))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-bold outline-none focus:border-yellow-500 text-sm text-center" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">骰子獎勵</label>
                                    <input type="number" min={0} value={form.dice}
                                        onChange={e => setForm(f => ({ ...f, dice: Number(e.target.value) }))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-bold outline-none focus:border-orange-500 text-sm text-center" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">每日上限</label>
                                    <input type="number" min={1} placeholder="空=無限"
                                        value={form.limit ?? ''}
                                        onChange={e => setForm(f => ({ ...f, limit: e.target.value ? Number(e.target.value) : null }))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-bold outline-none focus:border-orange-500 text-sm text-center" />
                                </div>
                            </div>
                            <label className="flex items-center gap-3 cursor-pointer select-none">
                                <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                                    className="w-4 h-4 rounded accent-orange-500" />
                                <span className="text-sm font-bold text-slate-300">啟用此定課</span>
                            </label>
                            {error && <p className="text-xs text-red-400 font-bold">{error}</p>}
                            <button type="submit" disabled={saving}
                                className="w-full bg-orange-600 p-4 rounded-2xl text-white font-black shadow-lg hover:bg-orange-500 transition-colors disabled:opacity-50">
                                {saving ? '儲存中...' : editingId ? '💾 更新定課' : '➕ 新增定課'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </section>
    );
}
