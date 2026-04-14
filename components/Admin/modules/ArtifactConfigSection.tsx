'use client';
import React from 'react';
import { Save, X, Pencil, ToggleLeft, ToggleRight, ChevronRight, ChevronDown } from 'lucide-react';
import { logAdminAction } from '@/app/actions/admin';
import type { ArtifactConfigRow } from '@/app/actions/admin';
import { IconPicker } from '../shared/IconPicker';

const EMPTY_ARTIFACT_FORM: Omit<ArtifactConfigRow, 'created_at'> = {
    id: '', name: '', description: '', effect: '', icon: null, price: 0,
    is_team_binding: false, limit: 1, exclusive_with: null,
    exp_multiplier_personal: null, exp_multiplier_team: null,
    exp_bonus_personal: null, exp_bonus_team: null,
    applies_to: ['all'],
    is_active: true, sort_order: 0,
};

export function ArtifactConfigSection() {
    const [collapsed, setCollapsed] = React.useState(true);
    const [rows, setRows] = React.useState<ArtifactConfigRow[]>([]);
    const [isFromDb, setIsFromDb] = React.useState(false);
    const [loading, setLoading] = React.useState(true);
    const [formOpen, setFormOpen] = React.useState(false);
    const [editingId, setEditingId] = React.useState<string | null>(null);
    const [form, setForm] = React.useState<Omit<ArtifactConfigRow, 'created_at'>>(EMPTY_ARTIFACT_FORM);
    const [saving, setSaving] = React.useState(false);
    const [seeding, setSeeding] = React.useState(false);
    const [deleting, setDeleting] = React.useState<string | null>(null);
    const [error, setError] = React.useState('');

    const load = React.useCallback(async () => {
        setLoading(true);
        const { listArtifactConfig } = await import('@/app/actions/admin');
        const dbRows = await listArtifactConfig();
        if (dbRows.length > 0) {
            setRows(dbRows);
            setIsFromDb(true);
        } else {
            const { ARTIFACTS_CONFIG } = await import('@/lib/constants');
            setRows(ARTIFACTS_CONFIG.map((a, i) => ({
                id: a.id, name: a.name, description: a.description, effect: a.effect, icon: null,
                price: a.price, is_team_binding: a.isTeamBinding, limit: a.limit ?? 1,
                exclusive_with: (a as any).exclusiveWith ?? null,
                exp_multiplier_personal: (a as any).expMultiplierPersonal ?? null,
                exp_multiplier_team: (a as any).expMultiplierTeam ?? null,
                exp_bonus_personal: (a as any).expBonusPersonal ?? null,
                exp_bonus_team: (a as any).expBonusTeam ?? null,
                applies_to: ['all'],
                is_active: true, sort_order: i + 1, created_at: '',
            })));
            setIsFromDb(false);
        }
        setLoading(false);
    }, []);

    React.useEffect(() => { load(); }, [load]);

    const openNew = () => {
        setForm({ ...EMPTY_ARTIFACT_FORM, sort_order: rows.length + 1 });
        setEditingId(null);
        setFormOpen(true);
        setError('');
    };

    const openEdit = (r: ArtifactConfigRow) => {
        setForm({ id: r.id, name: r.name, description: r.description, effect: r.effect, icon: r.icon, price: r.price, is_team_binding: r.is_team_binding, limit: r.limit, exclusive_with: r.exclusive_with, exp_multiplier_personal: r.exp_multiplier_personal, exp_multiplier_team: r.exp_multiplier_team, exp_bonus_personal: r.exp_bonus_personal, exp_bonus_team: r.exp_bonus_team, applies_to: r.applies_to ?? ['all'], is_active: r.is_active, sort_order: r.sort_order });
        setEditingId(r.id);
        setFormOpen(true);
        setError('');
    };

    const handleSave = async (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!form.id.trim() || !form.name.trim()) { setError('法寶 ID 與名稱為必填'); return; }
        setSaving(true);
        setError('');
        const { upsertArtifactConfig } = await import('@/app/actions/admin');
        const res = await upsertArtifactConfig({ ...form, exclusive_with: form.exclusive_with || null });
        setSaving(false);
        if (!res.success) { setError(res.error ?? '儲存失敗'); return; }
        await logAdminAction(editingId ? 'artifact_config_update' : 'artifact_config_create', 'admin', form.id, form.name ?? form.id, { price: form.price, teamBinding: form.is_team_binding, effect: (form.effect ?? '').slice(0, 40) });
        setFormOpen(false);
        load();
    };

    const handleToggle = async (r: ArtifactConfigRow) => {
        const { upsertArtifactConfig } = await import('@/app/actions/admin');
        await upsertArtifactConfig({ ...r, is_active: !r.is_active });
        setRows(prev => prev.map(x => x.id === r.id ? { ...x, is_active: !x.is_active } : x));
        await logAdminAction('artifact_config_toggle', 'admin', r.id, undefined, { active: !r.is_active });
    };

    const handleDelete = async (id: string) => {
        if (!confirm(`確定刪除法寶 ${id}？此操作無法復原。`)) return;
        setDeleting(id);
        const { deleteArtifactConfig } = await import('@/app/actions/admin');
        await deleteArtifactConfig(id);
        setDeleting(null);
        await logAdminAction('artifact_config_delete', 'admin', id);
        load();
    };

    const handleSeedDefaults = async () => {
        if (!confirm('將把程式碼中的 a1–a6 預設法寶匯入資料庫。確定執行？')) return;
        setSeeding(true);
        const { upsertArtifactConfig } = await import('@/app/actions/admin');
        const { ARTIFACTS_CONFIG } = await import('@/lib/constants');
        // Known bonus values per artifact
        const bonusMap: Record<string, { emp?: number; emt?: number; ebp?: number; ebt?: number; applies_to?: string[] }> = {
            a1: { emp: 1.2, applies_to: ['all'] }, a2: { ebp: 150, applies_to: ['q1_dawn'] }, a3: { emt: 1.5, applies_to: ['q1', 'q1_dawn'] },
            a4: { emp: 1.5, applies_to: ['prefix:t'] }, a5: { emp: 1.2, applies_to: ['all'] }, a6: { applies_to: [] },
        };
        for (let i = 0; i < ARTIFACTS_CONFIG.length; i++) {
            const a = ARTIFACTS_CONFIG[i];
            const b = bonusMap[a.id] ?? {};
            await upsertArtifactConfig({
                id: a.id, name: a.name, description: a.description, effect: a.effect,
                price: a.price, is_team_binding: a.isTeamBinding, limit: a.limit ?? 1,
                exclusive_with: (a as any).exclusiveWith ?? null,
                icon: null,
                exp_multiplier_personal: b.emp ?? null,
                exp_multiplier_team: b.emt ?? null,
                exp_bonus_personal: b.ebp ?? null,
                exp_bonus_team: b.ebt ?? null,
                applies_to: b.applies_to ?? ['all'],
                is_active: true, sort_order: i + 1,
            });
        }
        await logAdminAction('artifact_config_seed', 'admin');
        setSeeding(false);
        load();
    };

    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between">
                <button onClick={() => setCollapsed(c => !c)}
                    className="flex items-center gap-2 text-violet-400 font-black text-sm uppercase tracking-widest hover:text-violet-300 transition-colors">
                    <Save size={16} /> 天庭藏寶閣・法寶管理
                    {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                </button>
                {!collapsed && (
                <div className="flex items-center gap-2">
                    <button onClick={handleSeedDefaults} disabled={seeding}
                        className="flex items-center gap-1.5 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-black rounded-xl transition-colors disabled:opacity-50">
                        {seeding ? '匯入中...' : '📥 匯入預設法寶'}
                    </button>
                    <button onClick={openNew}
                        className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-black rounded-xl transition-colors shadow-lg">
                        ➕ 新增法寶
                    </button>
                </div>
                )}
            </div>

            {!collapsed && !isFromDb && !loading && (
                <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl px-4 py-3">
                    <span className="text-amber-400 text-lg shrink-0">⚠️</span>
                    <p className="text-xs text-amber-300 font-bold">目前顯示程式碼預設法寶（尚未匯入資料庫）。點擊「📥 匯入預設法寶」後即可編輯。</p>
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
                                    {r.icon && (r.icon.startsWith('http') || r.icon.startsWith('/'))
                                        ? <img src={r.icon} alt="" className="w-8 h-8 rounded-xl object-cover mx-auto" />
                                        : r.icon
                                            ? <span className="text-2xl">{r.icon}</span>
                                            : <div className="w-8 h-8 rounded-xl bg-slate-800 mx-auto" />}
                                    <span className="text-xs font-black text-slate-600 font-mono block">{r.id}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-black text-white text-sm">{r.name}</span>
                                        <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${r.is_team_binding ? 'bg-indigo-500/20 text-indigo-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                            {r.is_team_binding ? '小隊' : '個人'}
                                        </span>
                                        {isFromDb && (
                                            <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${r.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-500'}`}>
                                                {r.is_active ? '上架' : '下架'}
                                            </span>
                                        )}
                                        {r.exclusive_with && (
                                            <span className="text-xs text-red-400 font-black">互斥：{r.exclusive_with}</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-orange-300/80 mt-0.5">{r.effect}</p>
                                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{r.description}</p>
                                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                                        <span className="text-xs text-yellow-400 font-black">金幣 {r.price === 0 ? '免費' : `${r.price} 金幣`}{r.is_team_binding ? '/人' : ''}</span>
                                        <span className="text-xs text-slate-600">上限 {r.limit}</span>
                                        {r.exp_multiplier_personal != null && <span className="text-xs text-sky-400 font-bold">個人經驗 ×{r.exp_multiplier_personal}</span>}
                                        {r.exp_multiplier_team != null && <span className="text-xs text-indigo-400 font-bold">全隊經驗 ×{r.exp_multiplier_team}</span>}
                                        {r.exp_bonus_personal != null && <span className="text-xs text-sky-400 font-bold">個人修為 +{r.exp_bonus_personal}</span>}
                                        {r.exp_bonus_team != null && <span className="text-xs text-indigo-400 font-bold">全隊修為 +{r.exp_bonus_team}</span>}
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
                                        className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-violet-400 transition-colors">
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

            {/* 新增 / 編輯彈窗 */}
            {!collapsed && formOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in"
                    onClick={() => setFormOpen(false)}>
                    <div className="bg-slate-900 border border-slate-700 rounded-4xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-6 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
                            <h3 className="text-base font-black text-white">{editingId ? `編輯法寶：${editingId}` : '新增法寶'}</h3>
                            <button onClick={() => setFormOpen(false)} className="p-2 bg-slate-800 rounded-xl text-slate-400 hover:text-white"><X size={16} /></button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">法寶 ID *</label>
                                    <input required placeholder="e.g. a7" value={form.id} disabled={!!editingId}
                                        onChange={e => setForm(f => ({ ...f, id: e.target.value.trim() }))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-bold outline-none focus:border-violet-500 text-sm disabled:opacity-50" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">排序</label>
                                    <input type="number" value={form.sort_order}
                                        onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-bold outline-none focus:border-violet-500 text-sm" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">法寶名稱 *</label>
                                <input required placeholder="e.g. 如意金箍棒" value={form.name}
                                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-bold outline-none focus:border-violet-500 text-sm" />
                            </div>
                            <IconPicker value={form.icon ?? ''} onChange={v => setForm(f => ({ ...f, icon: v || null }))} />
                            <div className="space-y-1">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">法寶效果</label>
                                <input placeholder="e.g. 個人總經驗獲取 ×1.2 倍" value={form.effect}
                                    onChange={e => setForm(f => ({ ...f, effect: e.target.value }))}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-bold outline-none focus:border-violet-500 text-sm" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">背景說明</label>
                                <textarea rows={2} placeholder="法寶典故或說明..." value={form.description}
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-bold outline-none focus:border-violet-500 text-sm resize-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">價格（金幣）</label>
                                    <input type="number" min={0} value={form.price}
                                        onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-bold outline-none focus:border-violet-500 text-sm text-center" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">購買上限</label>
                                    <input type="number" min={1} value={form.limit}
                                        onChange={e => setForm(f => ({ ...f, limit: Number(e.target.value) }))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-bold outline-none focus:border-violet-500 text-sm text-center" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-baseline gap-2 px-1">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">互斥法寶 ID（選填）</label>
                                    <span className="text-xs text-red-400 font-bold">＊兩個法寶只能擇一持有，購買其中一個後將無法再購買另一個</span>
                                </div>
                                <input placeholder="e.g. a1" value={form.exclusive_with ?? ''}
                                    onChange={e => setForm(f => ({ ...f, exclusive_with: e.target.value.trim() || null }))}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-bold outline-none focus:border-violet-500 text-sm" />
                            </div>
                            {/* 觸發條件 */}
                            <div className="space-y-1">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">適用定課（觸發條件）</label>
                                <p className="text-xs text-slate-600 px-1 mb-1">
                                    填入定課 ID 以逗號分隔。特殊格式：<span className="text-violet-400">all</span> = 所有定課、<span className="text-violet-400">prefix:q</span> = q 開頭、<span className="text-violet-400">prefix:t</span> = t 開頭
                                </p>
                                <input placeholder="e.g. all 或 q1,q1_dawn 或 prefix:t"
                                    value={(form as any).applies_to_str ?? (form as any).applies_to?.join(',') ?? 'all'}
                                    onChange={e => {
                                        const str = e.target.value;
                                        setForm((f: any) => ({ ...f, applies_to_str: str, applies_to: str.split(',').map((s: string) => s.trim()).filter(Boolean) }));
                                    }}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-bold outline-none focus:border-violet-500 text-sm" />
                            </div>
                            {/* 經驗加成 */}
                            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
                                <p className="text-xs font-black text-slate-500 uppercase tracking-widest">經驗加成（空白 = 無效果）</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-sky-500 px-1">個人經驗加倍（×）</label>
                                        <input type="number" min={1} step={0.01} placeholder="e.g. 1.2"
                                            value={form.exp_multiplier_personal ?? ''}
                                            onChange={e => setForm(f => ({ ...f, exp_multiplier_personal: e.target.value === '' ? null : Number(e.target.value) }))}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-3 text-white font-bold outline-none focus:border-sky-500 text-sm text-center" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-indigo-400 px-1">全隊經驗加倍（×）</label>
                                        <input type="number" min={1} step={0.01} placeholder="e.g. 1.5"
                                            value={form.exp_multiplier_team ?? ''}
                                            onChange={e => setForm(f => ({ ...f, exp_multiplier_team: e.target.value === '' ? null : Number(e.target.value) }))}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-3 text-white font-bold outline-none focus:border-indigo-500 text-sm text-center" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-sky-500 px-1">個人修為加分（+）</label>
                                        <input type="number" min={0} step={1} placeholder="e.g. 150"
                                            value={form.exp_bonus_personal ?? ''}
                                            onChange={e => setForm(f => ({ ...f, exp_bonus_personal: e.target.value === '' ? null : Number(e.target.value) }))}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-3 text-white font-bold outline-none focus:border-sky-500 text-sm text-center" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-indigo-400 px-1">全隊修為加分（+）</label>
                                        <input type="number" min={0} step={1} placeholder="e.g. 200"
                                            value={form.exp_bonus_team ?? ''}
                                            onChange={e => setForm(f => ({ ...f, exp_bonus_team: e.target.value === '' ? null : Number(e.target.value) }))}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-3 text-white font-bold outline-none focus:border-indigo-500 text-sm text-center" />
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input type="checkbox" checked={form.is_team_binding} onChange={e => setForm(f => ({ ...f, is_team_binding: e.target.checked }))}
                                        className="w-4 h-4 rounded accent-indigo-500" />
                                    <span className="text-sm font-bold text-slate-300">小隊共用</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                                        className="w-4 h-4 rounded accent-violet-500" />
                                    <span className="text-sm font-bold text-slate-300">上架販售</span>
                                </label>
                            </div>
                            {error && <p className="text-xs text-red-400 font-bold">{error}</p>}
                            <button type="submit" disabled={saving}
                                className="w-full bg-violet-600 p-4 rounded-2xl text-white font-black shadow-lg hover:bg-violet-500 transition-colors disabled:opacity-50">
                                {saving ? '儲存中...' : editingId ? '💾 更新法寶' : '➕ 新增法寶'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </section>
    );
}
