'use client';
import React from 'react';
import { Trophy, X, Pencil, ToggleLeft, ToggleRight, ChevronRight, ChevronDown } from 'lucide-react';
import { logAdminAction } from '@/app/actions/admin';
import type { AchievementConfigRow } from '@/app/actions/admin';
import { IconPicker } from '../shared/IconPicker';

const RARITY_LABEL: Record<string, string> = { common: '常見', rare: '罕見', epic: '稀有', legendary: '傳說' };
const RARITY_COLOR: Record<string, string> = {
    common: 'bg-orange-500/20 text-orange-400',
    rare: 'bg-slate-400/20 text-slate-300',
    epic: 'bg-yellow-500/20 text-yellow-300',
    legendary: 'bg-purple-500/20 text-purple-300',
};

const EMPTY_ACH_FORM: Omit<AchievementConfigRow, 'created_at'> = {
    id: '', name: '', rarity: 'common', icon: '🏅', hint: '', description: '',
    role_exclusive: null, is_active: true, sort_order: 0,
};

export function AchievementConfigSection() {
    const [collapsed, setCollapsed] = React.useState(true);
    const [rows, setRows] = React.useState<AchievementConfigRow[]>([]);
    const [isFromDb, setIsFromDb] = React.useState(false);
    const [loading, setLoading] = React.useState(true);
    const [formOpen, setFormOpen] = React.useState(false);
    const [editingId, setEditingId] = React.useState<string | null>(null);
    const [form, setForm] = React.useState<Omit<AchievementConfigRow, 'created_at'>>(EMPTY_ACH_FORM);
    const [saving, setSaving] = React.useState(false);
    const [seeding, setSeeding] = React.useState(false);
    const [deleting, setDeleting] = React.useState<string | null>(null);
    const [rarityFilter, setRarityFilter] = React.useState<string>('all');
    const [error, setError] = React.useState('');

    const load = React.useCallback(async () => {
        setLoading(true);
        const { listAchievementConfig } = await import('@/app/actions/admin');
        const dbRows = await listAchievementConfig();
        if (dbRows.length > 0) {
            setRows(dbRows);
            setIsFromDb(true);
        } else {
            const { ACHIEVEMENTS } = await import('@/lib/achievements');
            setRows(ACHIEVEMENTS.map((a, i) => ({
                id: a.id, name: a.name, rarity: a.rarity, icon: a.icon,
                hint: a.hint, description: a.description,
                role_exclusive: a.roleExclusive ?? null,
                is_active: true, sort_order: i + 1, created_at: '',
            })));
            setIsFromDb(false);
        }
        setLoading(false);
    }, []);

    React.useEffect(() => { load(); }, [load]);

    const openNew = () => {
        setForm({ ...EMPTY_ACH_FORM, sort_order: rows.length + 1 });
        setEditingId(null); setFormOpen(true); setError('');
    };

    const openEdit = (r: AchievementConfigRow) => {
        setForm({ id: r.id, name: r.name, rarity: r.rarity, icon: r.icon, hint: r.hint, description: r.description, role_exclusive: r.role_exclusive, is_active: r.is_active, sort_order: r.sort_order });
        setEditingId(r.id); setFormOpen(true); setError('');
    };

    const handleSave = async (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!form.id.trim() || !form.name.trim()) { setError('成就 ID 與名稱為必填'); return; }
        setSaving(true); setError('');
        const { upsertAchievementConfig } = await import('@/app/actions/admin');
        const res = await upsertAchievementConfig({ ...form, role_exclusive: form.role_exclusive || null });
        setSaving(false);
        if (!res.success) { setError(res.error ?? '儲存失敗'); return; }
        await logAdminAction(editingId ? 'achievement_config_update' : 'achievement_config_create', 'admin', form.id, form.name ?? form.id, { rarity: form.rarity, active: form.is_active });
        setFormOpen(false); load();
    };

    const handleToggle = async (r: AchievementConfigRow) => {
        const { upsertAchievementConfig } = await import('@/app/actions/admin');
        await upsertAchievementConfig({ ...r, is_active: !r.is_active });
        setRows(prev => prev.map(x => x.id === r.id ? { ...x, is_active: !x.is_active } : x));
        await logAdminAction('achievement_config_toggle', 'admin', r.id, undefined, { active: !r.is_active });
    };

    const handleDelete = async (id: string) => {
        if (!confirm(`確定刪除成就 ${id}？`)) return;
        setDeleting(id);
        const { deleteAchievementConfig } = await import('@/app/actions/admin');
        await deleteAchievementConfig(id);
        setDeleting(null);
        await logAdminAction('achievement_config_delete', 'admin', id);
        load();
    };

    const handleSeedDefaults = async () => {
        if (!confirm('將把程式碼中的 43 個預設成就匯入資料庫。確定執行？')) return;
        setSeeding(true);
        const { upsertAchievementConfig } = await import('@/app/actions/admin');
        const { ACHIEVEMENTS } = await import('@/lib/achievements');
        for (let i = 0; i < ACHIEVEMENTS.length; i++) {
            const a = ACHIEVEMENTS[i];
            await upsertAchievementConfig({
                id: a.id, name: a.name, rarity: a.rarity, icon: a.icon,
                hint: a.hint, description: a.description,
                role_exclusive: a.roleExclusive ?? null,
                is_active: true, sort_order: i + 1,
            });
        }
        await logAdminAction('achievement_config_seed', 'admin');
        setSeeding(false); load();
    };

    const displayed = rarityFilter === 'all' ? rows : rows.filter(r => r.rarity === rarityFilter);

    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between">
                <button onClick={() => setCollapsed(c => !c)}
                    className="flex items-center gap-2 text-yellow-400 font-black text-sm uppercase tracking-widest hover:text-yellow-300 transition-colors">
                    <Trophy size={16} /> 成就殿堂管理
                    {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                </button>
                {!collapsed && (
                <div className="flex items-center gap-2">
                    <button onClick={handleSeedDefaults} disabled={seeding}
                        className="flex items-center gap-1.5 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-black rounded-xl transition-colors disabled:opacity-50">
                        {seeding ? '匯入中...' : '📥 匯入預設成就'}
                    </button>
                    <button onClick={openNew}
                        className="flex items-center gap-1.5 px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white text-xs font-black rounded-xl transition-colors shadow-lg">
                        ➕ 新增成就
                    </button>
                </div>
                )}
            </div>

            {!collapsed && !isFromDb && !loading && (
                <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl px-4 py-3">
                    <span className="text-amber-400 text-lg shrink-0">⚠️</span>
                    <p className="text-xs text-amber-300 font-bold">目前顯示程式碼預設成就（尚未匯入資料庫）。點擊「📥 匯入預設成就」後即可編輯。</p>
                </div>
            )}

            {!collapsed && (
            <div className="flex items-center gap-2 flex-wrap">
                {(['all', 'common', 'rare', 'epic', 'legendary'] as const).map(r => (
                    <button key={r} onClick={() => setRarityFilter(r)}
                        className={`px-3 py-1 rounded-xl text-xs font-black transition-colors ${rarityFilter === r ? 'bg-yellow-500 text-black' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                        {r === 'all' ? '全部' : RARITY_LABEL[r]}
                    </button>
                ))}
                <span className="text-xs text-slate-600 ml-auto">{displayed.length} 個成就</span>
            </div>
            )}

            {!collapsed && <div className={`bg-slate-900 border-2 rounded-4xl shadow-xl overflow-hidden ${isFromDb ? 'border-slate-800' : 'border-amber-500/20'}`}>
                {loading ? (
                    <p className="text-xs text-slate-500 text-center py-10">載入中...</p>
                ) : (
                    <div className="divide-y divide-slate-800">
                        {displayed.map(r => (
                            <div key={r.id} className="flex items-center gap-4 px-5 py-3 hover:bg-white/5 transition-colors">
                                <div className="w-10 shrink-0 text-center">
                                    <span className="text-2xl">{r.icon}</span>
                                    <span className="text-xs font-black text-slate-600 font-mono block mt-0.5">{r.id}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-black text-white text-sm">{r.name}</span>
                                        <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${RARITY_COLOR[r.rarity] ?? ''}`}>{RARITY_LABEL[r.rarity]}</span>
                                        {r.role_exclusive && <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-400">{r.role_exclusive}</span>}
                                        {isFromDb && <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${r.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-500'}`}>{r.is_active ? '啟用' : '停用'}</span>}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5 italic">「{r.hint}」</p>
                                    <p className="text-xs text-slate-400 mt-0.5">{r.description}</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {isFromDb && (
                                        <button onClick={() => handleToggle(r)}
                                            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-emerald-400 transition-colors">
                                            {r.is_active ? <ToggleRight size={16} className="text-emerald-400" /> : <ToggleLeft size={16} />}
                                        </button>
                                    )}
                                    <button onClick={() => openEdit(r)}
                                        className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-yellow-400 transition-colors">
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
                    <div className="bg-slate-900 border border-slate-700 rounded-4xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-6 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
                            <h3 className="text-base font-black text-white">{editingId ? `編輯成就：${editingId}` : '新增成就'}</h3>
                            <button onClick={() => setFormOpen(false)} className="p-2 bg-slate-800 rounded-xl text-slate-400 hover:text-white"><X size={16} /></button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">成就 ID *</label>
                                    <input required placeholder="e.g. streak_7" value={form.id} disabled={!!editingId}
                                        onChange={e => setForm(f => ({ ...f, id: e.target.value.trim() }))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-bold outline-none focus:border-yellow-500 text-sm disabled:opacity-50" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">排序</label>
                                    <input type="number" value={form.sort_order}
                                        onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-bold outline-none focus:border-yellow-500 text-sm" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">成就名稱 *</label>
                                <input required placeholder="e.g. 七日精進" value={form.name}
                                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-bold outline-none focus:border-yellow-500 text-sm" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">稀有度</label>
                                    <select value={form.rarity}
                                        onChange={e => setForm(f => ({ ...f, rarity: e.target.value as AchievementConfigRow['rarity'] }))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-bold outline-none focus:border-yellow-500 text-sm">
                                        <option value="common">常見</option>
                                        <option value="rare">罕見</option>
                                        <option value="epic">稀有</option>
                                        <option value="legendary">傳說</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">圖示</label>
                                    <IconPicker value={form.icon} onChange={v => setForm(f => ({ ...f, icon: v || '🏅' }))} />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">提示語（hint）</label>
                                <input placeholder="e.g. 七，是完整的數字…" value={form.hint}
                                    onChange={e => setForm(f => ({ ...f, hint: e.target.value }))}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-bold outline-none focus:border-yellow-500 text-sm" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">達成條件說明</label>
                                <textarea rows={2} placeholder="e.g. 連續 7 天完成打拳定課" value={form.description}
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-bold outline-none focus:border-yellow-500 text-sm resize-none" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">職業專屬（選填）</label>
                                <input placeholder="e.g. 孫悟空" value={form.role_exclusive ?? ''}
                                    onChange={e => setForm(f => ({ ...f, role_exclusive: e.target.value.trim() || null }))}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-bold outline-none focus:border-yellow-500 text-sm" />
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                                    className="w-4 h-4 rounded accent-yellow-500" />
                                <span className="text-sm font-bold text-slate-300">啟用此成就</span>
                            </label>
                            {error && <p className="text-xs text-red-400 font-bold">{error}</p>}
                            <button type="submit" disabled={saving}
                                className="w-full bg-yellow-600 p-4 rounded-2xl text-white font-black shadow-lg hover:bg-yellow-500 transition-colors disabled:opacity-50">
                                {saving ? '儲存中...' : editingId ? '💾 更新成就' : '➕ 新增成就'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </section>
    );
}

