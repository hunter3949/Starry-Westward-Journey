import React from 'react';
import { Settings, X, BarChart3, Save, Users, Shield, Plus, Lock, QrCode, BookOpen, Pencil, ToggleLeft, ToggleRight, CheckCircle, Circle, ChevronRight, ChevronDown, ChevronUp, Trophy, Image as ImageIcon, Upload, Trash2, Copy, FolderOpen, Download, Calendar, Zap } from 'lucide-react';
import { SystemSettings, CharacterStats, TopicHistory, TemporaryQuest, W4Application, AdminLog, Testimony, Course, MainQuestEntry } from '@/types';
import { getCourseRegistrations } from '@/app/actions/course';

import { ADMIN_PASSWORD, ARTIFACTS_CONFIG, ROLE_CURE_MAP } from '@/lib/constants';
import type { DailyQuestConfigRow, ArtifactConfigRow, AchievementConfigRow } from '@/app/actions/admin';

// ── 共用：圖示選擇器 ─────────────────────────────────────────────────────────

function IconPicker({ value, onChange }: {
    value: string;
    onChange: (v: string) => void;
}) {
    const [open, setOpen] = React.useState(false);
    const [tab, setTab] = React.useState<'emoji' | 'gallery'>('emoji');
    const [emojiDraft, setEmojiDraft] = React.useState(value);
    const [galleryFolder, setGalleryFolder] = React.useState('gallery');
    const [galleryFiles, setGalleryFiles] = React.useState<{ name: string; fullPath: string; publicUrl: string }[]>([]);
    const [loadingGallery, setLoadingGallery] = React.useState(false);

    const isUrl = (v: string) => v.startsWith('http') || v.startsWith('/');

    React.useEffect(() => { setEmojiDraft(value); }, [value]);

    const loadGallery = React.useCallback(async (folder: string) => {
        setLoadingGallery(true);
        const { listStorageFiles } = await import('@/app/actions/admin');
        const files = await listStorageFiles(folder);
        setGalleryFiles(files.filter(f => /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(f.name)));
        setLoadingGallery(false);
    }, []);

    React.useEffect(() => {
        if (open && tab === 'gallery') loadGallery(galleryFolder);
    }, [open, tab, galleryFolder, loadGallery]);

    const select = (v: string) => { onChange(v); setOpen(false); };

    return (
        <>
            {/* 觸發按鈕 */}
            <button type="button" onClick={() => setOpen(true)}
                className="flex items-center gap-3 w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 hover:border-slate-600 transition-colors group text-left">
                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 overflow-hidden">
                    {value && isUrl(value)
                        ? <img src={value} alt="" className="w-full h-full object-cover" />
                        : value
                            ? <span className="text-2xl leading-none">{value}</span>
                            : <ImageIcon size={16} className="text-slate-600" />}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">圖示</p>
                    <p className="text-xs text-slate-400 truncate">{value || '點擊選擇…'}</p>
                </div>
                <ChevronDown size={14} className="text-slate-600 group-hover:text-slate-400 transition-colors shrink-0" />
            </button>

            {/* 選擇器彈窗 */}
            {open && (
                <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4 bg-black/80 backdrop-blur-sm"
                    onClick={() => setOpen(false)}>
                    <div className="bg-slate-900 border border-slate-700 rounded-t-4xl sm:rounded-4xl w-full sm:max-w-lg shadow-2xl flex flex-col max-h-[80vh]"
                        onClick={e => e.stopPropagation()}>
                        {/* 標題 */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 shrink-0">
                            <p className="font-black text-white text-sm">選擇圖示</p>
                            <button onClick={() => setOpen(false)} className="p-1.5 bg-slate-800 rounded-xl text-slate-400 hover:text-white"><X size={14} /></button>
                        </div>
                        {/* 分頁 */}
                        <div className="flex shrink-0 border-b border-slate-800">
                            {(['emoji', 'gallery'] as const).map(t => (
                                <button key={t} onClick={() => setTab(t)}
                                    className={`flex-1 py-3 text-xs font-black transition-colors ${tab === t ? 'text-orange-400 border-b-2 border-orange-400' : 'text-slate-500 hover:text-slate-300'}`}>
                                    {t === 'emoji' ? '✨ Emoji' : '🖼 圖片庫'}
                                </button>
                            ))}
                        </div>
                        {/* 內容 */}
                        <div className="flex-1 overflow-y-auto p-5">
                            {tab === 'emoji' ? (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-20 h-20 rounded-3xl bg-slate-800 flex items-center justify-center shrink-0">
                                            <span className="text-5xl leading-none">{emojiDraft}</span>
                                        </div>
                                        <input autoFocus value={emojiDraft} placeholder="輸入 Emoji…"
                                            onChange={e => setEmojiDraft(e.target.value)}
                                            className="flex-1 bg-slate-800 border border-slate-700 rounded-2xl p-4 text-3xl text-center outline-none focus:border-orange-500" />
                                    </div>
                                    <button type="button" onClick={() => select(emojiDraft)}
                                        className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black p-3 rounded-2xl text-sm transition-colors">
                                        ✓ 使用此 Emoji
                                    </button>
                                    {value && (
                                        <button type="button" onClick={() => select('')}
                                            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-400 font-black p-3 rounded-2xl text-sm transition-colors">
                                            清除圖示
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex gap-2 flex-wrap">
                                        {PRESET_FOLDERS.map(f => (
                                            <button key={f} type="button" onClick={() => setGalleryFolder(f)}
                                                className={`px-3 py-1 rounded-xl text-[11px] font-black transition-colors ${galleryFolder === f ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                                                {f}/
                                            </button>
                                        ))}
                                    </div>
                                    {loadingGallery ? (
                                        <p className="text-xs text-slate-500 text-center py-8">載入中...</p>
                                    ) : galleryFiles.length === 0 ? (
                                        <p className="text-xs text-slate-600 text-center py-8">此資料夾無圖片，請先至圖片庫上傳</p>
                                    ) : (
                                        <div className="grid grid-cols-3 gap-2">
                                            {galleryFiles.map(f => (
                                                <button key={f.fullPath} type="button" onClick={() => select(f.publicUrl)}
                                                    className={`aspect-square rounded-2xl overflow-hidden border-2 transition-all hover:scale-95 active:scale-90 ${value === f.publicUrl ? 'border-orange-500' : 'border-slate-700 hover:border-slate-500'}`}>
                                                    <img src={f.publicUrl} alt={f.name} className="w-full h-full object-cover" />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// ── 定課管理元件 ──────────────────────────────────────────────────────────

const EMPTY_QUEST_FORM: Omit<DailyQuestConfigRow, 'created_at'> = {
    id: '', title: '', sub: '', desc: '', reward: 100, coins: null, dice: 1, icon: '', limit: null, sort_order: 0, is_active: true,
};

function DailyQuestConfigSection() {
    const [collapsed, setCollapsed] = React.useState(false);
    const [rows, setRows] = React.useState<DailyQuestConfigRow[]>([]);
    const [isFromDb, setIsFromDb] = React.useState(false); // false = 顯示的是程式碼預設值
    const [loading, setLoading] = React.useState(true);
    const [editingId, setEditingId] = React.useState<string | null>(null); // null = new
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
            // 資料庫無資料，顯示程式碼中的預設定課作為預覽
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
        setFormOpen(false);
        load();
    };

    const handleToggle = async (r: DailyQuestConfigRow) => {
        const { upsertDailyQuestConfig } = await import('@/app/actions/admin');
        await upsertDailyQuestConfig({ ...r, sub: r.sub, desc: r.desc, icon: r.icon, is_active: !r.is_active });
        setRows(prev => prev.map(x => x.id === r.id ? { ...x, is_active: !x.is_active } : x));
    };

    const handleSeedDefaults = async () => {
        if (!confirm('將把程式碼中的 q1–q9 預設定課匯入資料庫（已存在的 ID 會略過）。確定執行？')) return;
        setSeeding(true);
        const { upsertDailyQuestConfig } = await import('@/app/actions/admin');
        const { DAILY_QUEST_CONFIG } = await import('@/lib/constants');
        for (let i = 0; i < DAILY_QUEST_CONFIG.length; i++) {
            const q = DAILY_QUEST_CONFIG[i];
            await upsertDailyQuestConfig({
                id: q.id,
                title: q.title,
                sub: q.sub ?? null,
                desc: q.desc ?? null,
                reward: q.reward,
                coins: null,
                dice: q.dice ?? 1,
                icon: q.icon ?? null,
                limit: q.limit ?? null,
                sort_order: i + 1,
                is_active: true,
            });
        }
        setSeeding(false);
        load();
    };

    const handleDelete = async (id: string) => {
        if (!confirm(`確定刪除定課 ${id}？此操作無法復原。`)) return;
        setDeleting(id);
        const { deleteDailyQuestConfig } = await import('@/app/actions/admin');
        await deleteDailyQuestConfig(id);
        setDeleting(null);
        load();
    };

    return (
        <section className="space-y-4">
            {/* 可收折標題列 */}
            <div className="flex items-center justify-between">
                <button onClick={() => setCollapsed(c => !c)}
                    className="flex items-center gap-2 text-orange-500 font-black text-sm uppercase tracking-widest hover:text-orange-400 transition-colors">
                    <Settings size={16} /> 定課管理
                    {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
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
                                    <span className="text-[10px] font-black text-slate-600 font-mono block">{r.id}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-black text-white text-sm">{r.title}</span>
                                        {r.sub && <span className="text-xs text-orange-400">{r.sub}</span>}
                                        {isFromDb && <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${r.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-500'}`}>{r.is_active ? '啟用' : '停用'}</span>}
                                    </div>
                                    {r.desc && <p className="text-[11px] text-slate-500 mt-0.5">{r.desc}</p>}
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-[10px] text-emerald-400 font-black">+{r.reward} 修為</span>
                                        <span className="text-[10px] text-yellow-400 font-black">🪙{r.coins != null ? r.coins : `${Math.floor(r.reward * 0.1)}（預設）`}</span>
                                        <span className="text-[10px] text-sky-400 font-black">🎲×{r.dice}</span>
                                        {r.limit && <span className="text-[10px] text-amber-400 font-black">上限 {r.limit}</span>}
                                        <span className="text-[10px] text-slate-600">排序 {r.sort_order}</span>
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

            {/* 新增 / 編輯彈窗 */}
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
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">定課 ID *</label>
                                    <input
                                        required placeholder="e.g. q10"
                                        value={form.id}
                                        disabled={!!editingId}
                                        onChange={e => setForm(f => ({ ...f, id: e.target.value.trim() }))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-bold outline-none focus:border-orange-500 text-sm disabled:opacity-50" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">排序</label>
                                    <input
                                        type="number" value={form.sort_order}
                                        onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-bold outline-none focus:border-orange-500 text-sm" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">定課標題 *</label>
                                <input
                                    required placeholder="e.g. 打拳"
                                    value={form.title}
                                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-bold outline-none focus:border-orange-500 text-sm" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">副標題</label>
                                <input
                                    placeholder="e.g. 身體開發"
                                    value={form.sub ?? ''}
                                    onChange={e => setForm(f => ({ ...f, sub: e.target.value }))}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-bold outline-none focus:border-orange-500 text-sm" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">完成說明（選填）</label>
                                <input
                                    placeholder="e.g. 全程正念練習 30 分鐘"
                                    value={form.desc ?? ''}
                                    onChange={e => setForm(f => ({ ...f, desc: e.target.value }))}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-bold outline-none focus:border-orange-500 text-sm" />
                            </div>
                            {/* 圖示 */}
                            <IconPicker value={form.icon ?? ''} onChange={v => setForm(f => ({ ...f, icon: v || null }))} />

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">修為獎勵</label>
                                    <input
                                        type="number" min={0} value={form.reward}
                                        onChange={e => setForm(f => ({ ...f, reward: Number(e.target.value) }))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-bold outline-none focus:border-orange-500 text-sm text-center" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
                                        金幣獎勵
                                        <span className="ml-1 text-slate-600 normal-case font-normal">空=修為×0.1</span>
                                    </label>
                                    <input
                                        type="number" min={0} placeholder={`預設 ${Math.floor((form.reward || 0) * 0.1)}`}
                                        value={form.coins ?? ''}
                                        onChange={e => setForm(f => ({ ...f, coins: e.target.value !== '' ? Number(e.target.value) : null }))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-bold outline-none focus:border-yellow-500 text-sm text-center" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">骰子獎勵</label>
                                    <input
                                        type="number" min={0} value={form.dice}
                                        onChange={e => setForm(f => ({ ...f, dice: Number(e.target.value) }))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-bold outline-none focus:border-orange-500 text-sm text-center" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">每日上限</label>
                                    <input
                                        type="number" min={1} placeholder="空=無限"
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

// ── 天庭藏寶閣法寶管理元件 ───────────────────────────────────────────────────

const EMPTY_ARTIFACT_FORM: Omit<ArtifactConfigRow, 'created_at'> = {
    id: '', name: '', description: '', effect: '', icon: null, price: 0,
    is_team_binding: false, limit: 1, exclusive_with: null,
    exp_multiplier_personal: null, exp_multiplier_team: null,
    exp_bonus_personal: null, exp_bonus_team: null,
    is_active: true, sort_order: 0,
};

function GameItemConfigSection() {
    const [collapsed, setCollapsed] = React.useState(false);
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
        setForm({ id: r.id, name: r.name, description: r.description, effect: r.effect, icon: r.icon, price: r.price, is_team_binding: r.is_team_binding, limit: r.limit, exclusive_with: r.exclusive_with, exp_multiplier_personal: r.exp_multiplier_personal, exp_multiplier_team: r.exp_multiplier_team, exp_bonus_personal: r.exp_bonus_personal, exp_bonus_team: r.exp_bonus_team, is_active: r.is_active, sort_order: r.sort_order });
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
        setFormOpen(false);
        load();
    };

    const handleToggle = async (r: ArtifactConfigRow) => {
        const { upsertArtifactConfig } = await import('@/app/actions/admin');
        await upsertArtifactConfig({ ...r, is_active: !r.is_active });
        setRows(prev => prev.map(x => x.id === r.id ? { ...x, is_active: !x.is_active } : x));
    };

    const handleDelete = async (id: string) => {
        if (!confirm(`確定刪除法寶 ${id}？此操作無法復原。`)) return;
        setDeleting(id);
        const { deleteArtifactConfig } = await import('@/app/actions/admin');
        await deleteArtifactConfig(id);
        setDeleting(null);
        load();
    };

    const handleSeedDefaults = async () => {
        if (!confirm('將把程式碼中的 a1–a6 預設法寶匯入資料庫。確定執行？')) return;
        setSeeding(true);
        const { upsertArtifactConfig } = await import('@/app/actions/admin');
        const { ARTIFACTS_CONFIG } = await import('@/lib/constants');
        // Known bonus values per artifact
        const bonusMap: Record<string, { emp?: number; emt?: number; ebp?: number; ebt?: number }> = {
            a1: { emp: 1.2 }, a2: { ebp: 150 }, a3: { emt: 1.5 },
            a4: { emp: 1.5 }, a5: { emp: 1.2 }, a6: {},
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
                is_active: true, sort_order: i + 1,
            });
        }
        setSeeding(false);
        load();
    };

    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between">
                <button onClick={() => setCollapsed(c => !c)}
                    className="flex items-center gap-2 text-violet-400 font-black text-sm uppercase tracking-widest hover:text-violet-300 transition-colors">
                    <Save size={16} /> 天庭藏寶閣・法寶管理
                    {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
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
                                    <span className="text-[10px] font-black text-slate-600 font-mono block">{r.id}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-black text-white text-sm">{r.name}</span>
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${r.is_team_binding ? 'bg-indigo-500/20 text-indigo-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                            {r.is_team_binding ? '小隊' : '個人'}
                                        </span>
                                        {isFromDb && (
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${r.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-500'}`}>
                                                {r.is_active ? '上架' : '下架'}
                                            </span>
                                        )}
                                        {r.exclusive_with && (
                                            <span className="text-[10px] text-red-400 font-black">互斥：{r.exclusive_with}</span>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-orange-300/80 mt-0.5">{r.effect}</p>
                                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{r.description}</p>
                                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                                        <span className="text-[10px] text-yellow-400 font-black">🪙 {r.price === 0 ? '免費' : `${r.price} 金幣`}{r.is_team_binding ? '/人' : ''}</span>
                                        <span className="text-[10px] text-slate-600">上限 {r.limit}</span>
                                        {r.exp_multiplier_personal != null && <span className="text-[10px] text-sky-400 font-bold">個人經驗 ×{r.exp_multiplier_personal}</span>}
                                        {r.exp_multiplier_team != null && <span className="text-[10px] text-indigo-400 font-bold">全隊經驗 ×{r.exp_multiplier_team}</span>}
                                        {r.exp_bonus_personal != null && <span className="text-[10px] text-sky-400 font-bold">個人修為 +{r.exp_bonus_personal}</span>}
                                        {r.exp_bonus_team != null && <span className="text-[10px] text-indigo-400 font-bold">全隊修為 +{r.exp_bonus_team}</span>}
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
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">法寶 ID *</label>
                                    <input required placeholder="e.g. a7" value={form.id} disabled={!!editingId}
                                        onChange={e => setForm(f => ({ ...f, id: e.target.value.trim() }))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-bold outline-none focus:border-violet-500 text-sm disabled:opacity-50" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">排序</label>
                                    <input type="number" value={form.sort_order}
                                        onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-bold outline-none focus:border-violet-500 text-sm" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">法寶名稱 *</label>
                                <input required placeholder="e.g. 如意金箍棒" value={form.name}
                                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-bold outline-none focus:border-violet-500 text-sm" />
                            </div>
                            <IconPicker value={form.icon ?? ''} onChange={v => setForm(f => ({ ...f, icon: v || null }))} />
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">法寶效果</label>
                                <input placeholder="e.g. 個人總經驗獲取 ×1.2 倍" value={form.effect}
                                    onChange={e => setForm(f => ({ ...f, effect: e.target.value }))}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-bold outline-none focus:border-violet-500 text-sm" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">背景說明</label>
                                <textarea rows={2} placeholder="法寶典故或說明..." value={form.description}
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-bold outline-none focus:border-violet-500 text-sm resize-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">價格（金幣）</label>
                                    <input type="number" min={0} value={form.price}
                                        onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-bold outline-none focus:border-violet-500 text-sm text-center" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">購買上限</label>
                                    <input type="number" min={1} value={form.limit}
                                        onChange={e => setForm(f => ({ ...f, limit: Number(e.target.value) }))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-bold outline-none focus:border-violet-500 text-sm text-center" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-baseline gap-2 px-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">互斥法寶 ID（選填）</label>
                                    <span className="text-[10px] text-red-400 font-bold">＊兩個法寶只能擇一持有，購買其中一個後將無法再購買另一個</span>
                                </div>
                                <input placeholder="e.g. a1" value={form.exclusive_with ?? ''}
                                    onChange={e => setForm(f => ({ ...f, exclusive_with: e.target.value.trim() || null }))}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-bold outline-none focus:border-violet-500 text-sm" />
                            </div>
                            {/* 經驗加成 */}
                            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">經驗加成（空白 = 無效果）</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-sky-500 px-1">個人經驗加倍（×）</label>
                                        <input type="number" min={1} step={0.01} placeholder="e.g. 1.2"
                                            value={form.exp_multiplier_personal ?? ''}
                                            onChange={e => setForm(f => ({ ...f, exp_multiplier_personal: e.target.value === '' ? null : Number(e.target.value) }))}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-3 text-white font-bold outline-none focus:border-sky-500 text-sm text-center" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-indigo-400 px-1">全隊經驗加倍（×）</label>
                                        <input type="number" min={1} step={0.01} placeholder="e.g. 1.5"
                                            value={form.exp_multiplier_team ?? ''}
                                            onChange={e => setForm(f => ({ ...f, exp_multiplier_team: e.target.value === '' ? null : Number(e.target.value) }))}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-3 text-white font-bold outline-none focus:border-indigo-500 text-sm text-center" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-sky-500 px-1">個人修為加分（+）</label>
                                        <input type="number" min={0} step={1} placeholder="e.g. 150"
                                            value={form.exp_bonus_personal ?? ''}
                                            onChange={e => setForm(f => ({ ...f, exp_bonus_personal: e.target.value === '' ? null : Number(e.target.value) }))}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-3 text-white font-bold outline-none focus:border-sky-500 text-sm text-center" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-indigo-400 px-1">全隊修為加分（+）</label>
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

// ── 成就殿堂管理 ─────────────────────────────────────────────────────────────

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

function AchievementConfigSection() {
    const [collapsed, setCollapsed] = React.useState(false);
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
        setFormOpen(false); load();
    };

    const handleToggle = async (r: AchievementConfigRow) => {
        const { upsertAchievementConfig } = await import('@/app/actions/admin');
        await upsertAchievementConfig({ ...r, is_active: !r.is_active });
        setRows(prev => prev.map(x => x.id === r.id ? { ...x, is_active: !x.is_active } : x));
    };

    const handleDelete = async (id: string) => {
        if (!confirm(`確定刪除成就 ${id}？`)) return;
        setDeleting(id);
        const { deleteAchievementConfig } = await import('@/app/actions/admin');
        await deleteAchievementConfig(id);
        setDeleting(null); load();
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
        setSeeding(false); load();
    };

    const displayed = rarityFilter === 'all' ? rows : rows.filter(r => r.rarity === rarityFilter);

    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between">
                <button onClick={() => setCollapsed(c => !c)}
                    className="flex items-center gap-2 text-yellow-400 font-black text-sm uppercase tracking-widest hover:text-yellow-300 transition-colors">
                    <Trophy size={16} /> 成就殿堂管理
                    {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
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
                        className={`px-3 py-1 rounded-xl text-[11px] font-black transition-colors ${rarityFilter === r ? 'bg-yellow-500 text-black' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                        {r === 'all' ? '全部' : RARITY_LABEL[r]}
                    </button>
                ))}
                <span className="text-[11px] text-slate-600 ml-auto">{displayed.length} 個成就</span>
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
                                    <span className="text-[9px] font-black text-slate-600 font-mono block mt-0.5">{r.id}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-black text-white text-sm">{r.name}</span>
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${RARITY_COLOR[r.rarity] ?? ''}`}>{RARITY_LABEL[r.rarity]}</span>
                                        {r.role_exclusive && <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-400">{r.role_exclusive}</span>}
                                        {isFromDb && <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${r.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-500'}`}>{r.is_active ? '啟用' : '停用'}</span>}
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-0.5 italic">「{r.hint}」</p>
                                    <p className="text-[11px] text-slate-400 mt-0.5">{r.description}</p>
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
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">成就 ID *</label>
                                    <input required placeholder="e.g. streak_7" value={form.id} disabled={!!editingId}
                                        onChange={e => setForm(f => ({ ...f, id: e.target.value.trim() }))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-bold outline-none focus:border-yellow-500 text-sm disabled:opacity-50" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">排序</label>
                                    <input type="number" value={form.sort_order}
                                        onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-bold outline-none focus:border-yellow-500 text-sm" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">成就名稱 *</label>
                                <input required placeholder="e.g. 七日精進" value={form.name}
                                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-bold outline-none focus:border-yellow-500 text-sm" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">稀有度</label>
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
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">圖示</label>
                                    <IconPicker value={form.icon} onChange={v => setForm(f => ({ ...f, icon: v || '🏅' }))} />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">提示語（hint）</label>
                                <input placeholder="e.g. 七，是完整的數字…" value={form.hint}
                                    onChange={e => setForm(f => ({ ...f, hint: e.target.value }))}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-bold outline-none focus:border-yellow-500 text-sm" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">達成條件說明</label>
                                <textarea rows={2} placeholder="e.g. 連續 7 天完成打拳定課" value={form.description}
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-bold outline-none focus:border-yellow-500 text-sm resize-none" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">職業專屬（選填）</label>
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

// ── 角色管理 ──────────────────────────────────────────────────────────────────

function RoleConfigSection() {
    const [collapsed, setCollapsed] = React.useState(false);
    const [roles, setRoles] = React.useState<Record<string, {
        poison: string; color: string; talent: string; curseName: string; curseEffect: string;
        avatar: string; baseHP: number; hpScale: number; baseDEF: number; bonusStat: string;
    }>>({});
    const [growth, setGrowth] = React.useState<Record<string, Record<string, number>>>({});

    React.useEffect(() => {
        import('@/lib/constants').then(m => {
            setRoles(m.ROLE_CURE_MAP as any);
            setGrowth(m.ROLE_GROWTH_RATES as any);
        });
    }, []);

    const STAT_LABELS: Record<string, string> = {
        Spirit: '心靈', Physique: '體魄', Charisma: '魅力', Savvy: '悟性', Luck: '福運', Potential: '潛能'
    };

    return (
        <section className="space-y-4">
            <button onClick={() => setCollapsed(p => !p)}
                className="flex items-center gap-2 text-teal-400 font-black text-sm uppercase tracking-widest w-full">
                <Users size={16} />
                角色管理
                <ChevronDown size={14} className={`transition-transform ${collapsed ? '-rotate-90' : ''}`} />
            </button>
            {!collapsed && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(roles).map(([name, r]) => (
                        <div key={name} className="bg-slate-900 border border-slate-700 rounded-2xl p-4 space-y-3">
                            <div className="flex items-center gap-3">
                                <span className="text-3xl">{r.avatar}</span>
                                <div>
                                    <p className="font-black text-white text-base">{name}</p>
                                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${r.color} text-white`}>{r.poison}</span>
                                </div>
                            </div>
                            <div className="space-y-1.5 text-xs">
                                <p className="text-emerald-400"><span className="text-slate-500 mr-1">天賦</span>{r.talent}</p>
                                <p className="text-red-400"><span className="text-slate-500 mr-1">詛咒</span>{r.curseName}：{r.curseEffect}</p>
                            </div>
                            <div className="grid grid-cols-3 gap-1 text-[10px]">
                                <div className="bg-slate-800 rounded-lg px-2 py-1 text-center">
                                    <p className="text-slate-500">基礎HP</p>
                                    <p className="font-black text-white">{r.baseHP}</p>
                                </div>
                                <div className="bg-slate-800 rounded-lg px-2 py-1 text-center">
                                    <p className="text-slate-500">基礎防禦</p>
                                    <p className="font-black text-white">{r.baseDEF}</p>
                                </div>
                                <div className="bg-slate-800 rounded-lg px-2 py-1 text-center">
                                    <p className="text-slate-500">加成屬性</p>
                                    <p className="font-black text-teal-400">{STAT_LABELS[r.bonusStat] ?? r.bonusStat}</p>
                                </div>
                            </div>
                            {growth[name] && (
                                <div className="flex flex-wrap gap-1">
                                    {Object.entries(growth[name]).map(([stat, val]) => (
                                        <span key={stat} className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded-md">
                                            {STAT_LABELS[stat] ?? stat} +{val}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}

// ── 任務角色管理 ──────────────────────────────────────────────────────────────

import { DEFAULT_QUEST_ROLES } from '@/lib/constants';

const DEFAULT_CARD_MOTTOS = [
    "對別人的期待\n就是對自己的期待",
    "勇敢不是沒有恐懼\n而是帶著恐懼依然前行",
    "外求一物是一物\n內求一心是全部",
    "一切都好",
    "沒有奇蹟\n只有累積",
    "相由心生",
    "流動情緒",
    "外圓內方",
    "給出什麼\n就得到什麼",
    "內在有什麼\n外在就得到什麼",
];

function BasicParamsSection({ systemSettings, updateGlobalSetting }: { systemSettings: SystemSettings; updateGlobalSetting: (key: string, value: string) => void }) {
    const [collapsed, setCollapsed] = React.useState(false);
    const [siteName, setSiteName] = React.useState(systemSettings.SiteName || '');
    const [saving, setSaving] = React.useState(false);
    const [saved, setSaved] = React.useState(false);
    const [logoPreview, setLogoPreview] = React.useState<string | null>(systemSettings.SiteLogo || null);
    const [logoSaving, setLogoSaving] = React.useState(false);
    const logoInputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        setSiteName(systemSettings.SiteName || '');
        setLogoPreview(systemSettings.SiteLogo || null);
    }, [systemSettings.SiteName, systemSettings.SiteLogo]);

    const handleSave = () => {
        setSaving(true);
        updateGlobalSetting('SiteName', siteName.trim() || '大無限開運西遊');
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const dataUrl = ev.target?.result as string;
            setLogoSaving(true);
            updateGlobalSetting('SiteLogo', dataUrl);
            setLogoPreview(dataUrl);
            setLogoSaving(false);
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveLogo = () => {
        updateGlobalSetting('SiteLogo', '');
        setLogoPreview(null);
    };

    return (
        <section className="space-y-4">
            <button onClick={() => setCollapsed(v => !v)}
                className="flex items-center gap-2 text-orange-400 font-black text-sm uppercase tracking-widest w-full text-left">
                <span className="text-lg">⚙️</span> 基本參數
                {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            </button>
            {!collapsed && (
                <div className="bg-slate-900 border-2 border-orange-500/20 p-6 rounded-4xl space-y-5 shadow-xl">
                    {/* Logo 上傳 */}
                    <div className="space-y-2">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">登入頁 Logo 圖片</p>
                        {logoPreview ? (
                            <div className="flex items-center gap-3">
                                <img src={logoPreview} alt="Logo 預覽" className="w-16 h-16 object-contain rounded-xl border border-orange-500/30 bg-slate-950" />
                                <div className="space-y-2 flex-1">
                                    <button onClick={() => logoInputRef.current?.click()} disabled={logoSaving}
                                        className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-colors disabled:opacity-50">
                                        {logoSaving ? '儲存中…' : '重新上傳'}
                                    </button>
                                    <button onClick={handleRemoveLogo}
                                        className="w-full py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 font-bold text-xs rounded-xl transition-colors">
                                        移除（恢復預設）
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button onClick={() => logoInputRef.current?.click()} disabled={logoSaving}
                                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-orange-500/30 hover:border-orange-500/60 text-orange-400 font-black text-sm rounded-2xl transition-colors">
                                {logoSaving ? '儲存中…' : '📷 上傳 Logo'}
                            </button>
                        )}
                        <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                        <p className="text-[10px] text-slate-600">支援 PNG / JPG，建議正方形（1:1）</p>
                    </div>

                    <div className="border-t border-slate-800" />

                    {/* 名稱設定 */}
                    <div className="space-y-2">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">網站 / 登入頁顯示名稱</p>
                        <input
                            value={siteName}
                            onChange={e => setSiteName(e.target.value)}
                            placeholder="大無限開運西遊"
                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-bold text-sm outline-none focus:border-orange-500"
                        />
                        <p className="text-[10px] text-slate-600">留空則使用預設名稱「大無限開運西遊」</p>
                    </div>
                    <button onClick={handleSave} disabled={saving}
                        className="w-full py-3 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white font-black text-sm rounded-2xl transition-colors">
                        {saving ? '儲存中…' : saved ? '✓ 已儲存' : '儲存名稱'}
                    </button>
                </div>
            )}
        </section>
    );
}

function CardMottoSection() {
    const [collapsed, setCollapsed] = React.useState(false);
    const [mottos, setMottos] = React.useState<string[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const [editIdx, setEditIdx] = React.useState<number | null>(null);
    const [editVal, setEditVal] = React.useState('');
    const [newVal, setNewVal] = React.useState('');
    const [error, setError] = React.useState('');
    const [backImage, setBackImage] = React.useState<string | null>(null);
    const [imgSaving, setImgSaving] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const load = React.useCallback(async () => {
        setLoading(true);
        const { getCardMottos, getCardBackImage } = await import('@/app/actions/admin');
        const [data, img] = await Promise.all([getCardMottos(), getCardBackImage()]);
        setMottos(data.length > 0 ? data : DEFAULT_CARD_MOTTOS);
        setBackImage(img);
        setLoading(false);
    }, []);

    React.useEffect(() => { load(); }, [load]);

    const save = async (next: string[]) => {
        setSaving(true);
        const { saveCardMottos } = await import('@/app/actions/admin');
        const res = await saveCardMottos(next);
        setSaving(false);
        if (!res.success) { setError(res.error ?? '儲存失敗'); return false; }
        setMottos(next);
        return true;
    };

    const handleAdd = async () => {
        const text = newVal.trim();
        if (!text) return;
        if (await save([...mottos, text])) setNewVal('');
    };

    const handleSaveEdit = async (idx: number) => {
        const text = editVal.trim();
        if (!text) return;
        const next = mottos.map((m, i) => i === idx ? text : m);
        if (await save(next)) setEditIdx(null);
    };

    const handleDelete = async (idx: number) => {
        if (!confirm('確定刪除這句座右銘？')) return;
        await save(mottos.filter((_, i) => i !== idx));
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const dataUrl = ev.target?.result as string;
            setImgSaving(true);
            const { saveCardBackImage } = await import('@/app/actions/admin');
            const res = await saveCardBackImage(dataUrl);
            setImgSaving(false);
            if (res.success) setBackImage(dataUrl);
            else setError(res.error ?? '圖片儲存失敗');
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveImage = async () => {
        if (!confirm('確定移除卡背圖片？（將恢復純色背景）')) return;
        setImgSaving(true);
        const { saveCardBackImage } = await import('@/app/actions/admin');
        await saveCardBackImage('');
        setImgSaving(false);
        setBackImage(null);
    };

    return (
        <section className="space-y-4">
            <button onClick={() => setCollapsed(v => !v)}
                className="flex items-center gap-2 text-purple-400 font-black text-sm uppercase tracking-widest w-full text-left">
                <span className="text-lg">🃏</span> 卡牌座右銘管理
                {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            </button>
            {!collapsed && (
                <div className="bg-slate-900 border-2 border-purple-500/20 p-6 rounded-4xl space-y-4 shadow-xl">
                    {error && <p className="text-red-400 text-xs font-bold">{error}</p>}

                    {/* 卡背圖片上傳 */}
                    <div className="space-y-2">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">卡牌背面圖片</p>
                        {backImage ? (
                            <div className="flex items-center gap-3">
                                <img src={backImage} alt="卡背預覽" className="w-16 h-20 object-cover rounded-xl border border-purple-500/30" />
                                <div className="space-y-2 flex-1">
                                    <p className="text-xs text-slate-400 font-bold">已上傳自訂卡背</p>
                                    <button onClick={() => fileInputRef.current?.click()} disabled={imgSaving}
                                        className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-colors disabled:opacity-50">
                                        {imgSaving ? '儲存中…' : '重新上傳'}
                                    </button>
                                    <button onClick={handleRemoveImage} disabled={imgSaving}
                                        className="w-full py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 font-bold text-xs rounded-xl transition-colors disabled:opacity-50">
                                        移除圖片
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button onClick={() => fileInputRef.current?.click()} disabled={imgSaving}
                                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-purple-500/30 hover:border-purple-500/60 text-purple-400 font-black text-sm rounded-2xl transition-colors disabled:opacity-50">
                                {imgSaving ? '儲存中…' : '📷 上傳卡背圖片'}
                            </button>
                        )}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageUpload}
                        />
                        <p className="text-[10px] text-slate-600">支援 JPG / PNG，建議比例 3:4（直式）</p>
                    </div>
                    <div className="border-t border-slate-800" />

                    {loading ? (
                        <p className="text-slate-500 text-sm text-center py-4">載入中…</p>
                    ) : (
                        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                            {mottos.map((m, idx) => (
                                <div key={idx} className="bg-slate-950 border border-slate-800 rounded-2xl p-3 space-y-2">
                                    {editIdx === idx ? (
                                        <div className="space-y-2">
                                            <textarea
                                                value={editVal}
                                                onChange={e => setEditVal(e.target.value)}
                                                rows={3}
                                                className="w-full bg-slate-900 border border-purple-500 rounded-xl p-2 text-white text-sm font-bold outline-none resize-none"
                                            />
                                            <div className="flex gap-2">
                                                <button onClick={() => handleSaveEdit(idx)} disabled={saving}
                                                    className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs rounded-xl transition-colors disabled:opacity-50">
                                                    {saving ? '儲存中…' : '確認'}
                                                </button>
                                                <button onClick={() => setEditIdx(null)}
                                                    className="px-4 py-2 bg-slate-800 text-slate-400 font-bold text-xs rounded-xl">
                                                    取消
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-start gap-2">
                                            <p className="flex-1 text-sm text-slate-200 font-bold whitespace-pre-line leading-relaxed">{m}</p>
                                            <div className="flex gap-1 shrink-0">
                                                <button onClick={() => { setEditIdx(idx); setEditVal(m); setError(''); }}
                                                    className="p-1.5 text-slate-500 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-colors">
                                                    <Pencil size={13} />
                                                </button>
                                                <button onClick={() => handleDelete(idx)}
                                                    className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                    {/* 新增 */}
                    <div className="border-t border-slate-800 pt-4 space-y-2">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">新增座右銘</p>
                        <textarea
                            value={newVal}
                            onChange={e => setNewVal(e.target.value)}
                            placeholder={"例：一切都好\n（支援換行）"}
                            rows={3}
                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-bold text-sm outline-none focus:border-purple-500 resize-none"
                        />
                        <button onClick={handleAdd} disabled={saving || !newVal.trim()}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-black text-sm rounded-2xl transition-colors">
                            <Plus size={14} /> 加入列表
                        </button>
                    </div>
                    <p className="text-[10px] text-slate-600 text-center">共 {mottos.length} 句 · 抽卡時隨機選取</p>
                </div>
            )}
        </section>
    );
}

function QuestRoleSection() {
    type QuestRole = { id: string; name: string; duties: string[] };
    const [collapsed, setCollapsed] = React.useState(false);
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
                <ChevronDown size={14} className={`transition-transform ${collapsed ? '-rotate-90' : ''}`} />
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

// ── 圖片庫 ────────────────────────────────────────────────────────────────────

const PRESET_FOLDERS = ['gallery', 'quest-icons', 'artifacts'];

function ImageGallerySection() {
    type FileItem = { name: string; fullPath: string; publicUrl: string; size: number; createdAt: string };
    type LocalFileItem = { name: string; path: string; url: string; size: number };

    const [source, setSource] = React.useState<'storage' | 'local'>('storage');

    // Supabase Storage state
    const [folder, setFolder] = React.useState('gallery');
    const [customFolder, setCustomFolder] = React.useState('');
    const [files, setFiles] = React.useState<FileItem[]>([]);
    const [folders, setFolders] = React.useState<string[]>([]);
    const [uploading, setUploading] = React.useState(false);
    const [deleting, setDeleting] = React.useState<string | null>(null);
    const [uploadError, setUploadError] = React.useState('');
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Local images state
    const [localFolder, setLocalFolder] = React.useState('artifacts');
    const [localFolders, setLocalFolders] = React.useState<string[]>([]);
    const [localFiles, setLocalFiles] = React.useState<LocalFileItem[]>([]);

    const [loading, setLoading] = React.useState(true);
    const [copied, setCopied] = React.useState<string | null>(null);

    const activeFolder = customFolder.trim() || folder;

    const load = React.useCallback(async () => {
        setLoading(true);
        if (source === 'storage') {
            const { listStorageFiles, listStorageFolders } = await import('@/app/actions/admin');
            const [fileList, folderList] = await Promise.all([listStorageFiles(activeFolder), listStorageFolders()]);
            setFiles(fileList);
            setFolders(folderList);
        } else {
            const fRes = await fetch('/api/admin/local-images?folder=__folders__');
            const fData = await fRes.json();
            const fList: string[] = fData.folders ?? [];
            setLocalFolders(fList);
            const cur = fList.includes(localFolder) ? localFolder : (fList[0] ?? '');
            if (cur !== localFolder) setLocalFolder(cur);
            if (cur) {
                const iRes = await fetch(`/api/admin/local-images?folder=${encodeURIComponent(cur)}`);
                const iData = await iRes.json();
                setLocalFiles(iData.files ?? []);
            } else {
                setLocalFiles([]);
            }
        }
        setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [source, activeFolder, localFolder]);

    React.useEffect(() => { load(); }, [load]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const picked = e.target.files;
        if (!picked || picked.length === 0) return;
        setUploading(true);
        setUploadError('');
        const { uploadStorageFile } = await import('@/app/actions/admin');
        for (const file of Array.from(picked)) {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('folder', activeFolder);
            const res = await uploadStorageFile(fd);
            if (!res.success) { setUploadError(res.error ?? '上傳失敗'); }
        }
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        load();
    };

    const handleDelete = async (item: FileItem) => {
        if (!confirm(`確定刪除「${item.name}」？`)) return;
        setDeleting(item.fullPath);
        const { deleteStorageFile } = await import('@/app/actions/admin');
        await deleteStorageFile(item.fullPath);
        setDeleting(null);
        load();
    };

    const handleCopy = (url: string) => {
        navigator.clipboard.writeText(url).then(() => {
            setCopied(url);
            setTimeout(() => setCopied(null), 1500);
        });
    };

    const fmtSize = (b: number) => b < 1024 ? `${b}B` : b < 1024 * 1024 ? `${(b / 1024).toFixed(1)}KB` : `${(b / 1024 / 1024).toFixed(1)}MB`;
    const isImage = (name: string) => /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(name);

    const switchLocalFolder = async (f: string) => {
        setLocalFolder(f);
        setLoading(true);
        const iRes = await fetch(`/api/admin/local-images?folder=${encodeURIComponent(f)}`);
        const iData = await iRes.json();
        setLocalFiles(iData.files ?? []);
        setLoading(false);
    };

    const displayFiles = source === 'local'
        ? localFiles.map(f => ({ key: f.path, name: f.name, url: f.url, size: f.size }))
        : files.map(f => ({ key: f.fullPath, name: f.name, url: f.publicUrl, size: f.size, fullPath: f.fullPath }));

    return (
        <section className="space-y-5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-teal-400 font-black text-sm uppercase tracking-widest">
                    <ImageIcon size={16} /> 圖片庫
                </div>
                {/* 來源切換 */}
                <div className="flex items-center gap-1 bg-slate-800 rounded-xl p-1">
                    <button onClick={() => setSource('storage')}
                        className={`px-3 py-1 rounded-lg text-xs font-black transition-colors ${source === 'storage' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                        Supabase
                    </button>
                    <button onClick={() => setSource('local')}
                        className={`px-3 py-1 rounded-lg text-xs font-black transition-colors ${source === 'local' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                        本地圖片
                    </button>
                </div>
            </div>

            {source === 'storage' ? (
                <>
                    {/* 資料夾選擇 */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <FolderOpen size={14} className="text-slate-500 shrink-0" />
                        {PRESET_FOLDERS.map(f => (
                            <button key={f} onClick={() => { setFolder(f); setCustomFolder(''); }}
                                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-colors ${activeFolder === f && !customFolder ? 'bg-teal-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                                {f}/
                            </button>
                        ))}
                        {folders.filter(f => !PRESET_FOLDERS.includes(f)).map(f => (
                            <button key={f} onClick={() => { setFolder(f); setCustomFolder(''); }}
                                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-colors ${activeFolder === f && !customFolder ? 'bg-teal-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                                {f}/
                            </button>
                        ))}
                        <input value={customFolder} placeholder="自訂路徑…"
                            onChange={e => setCustomFolder(e.target.value)}
                            className="w-32 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-teal-500 placeholder:text-slate-600" />
                    </div>
                    {/* 上傳列 */}
                    <div className="flex items-center gap-3">
                        <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                            className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-black rounded-xl transition-colors shadow-lg disabled:opacity-50">
                            <Upload size={14} />
                            {uploading ? '上傳中...' : '上傳圖片'}
                        </button>
                        <span className="text-[11px] text-slate-500">上傳到：<span className="text-teal-400 font-bold">{activeFolder}/</span></span>
                        <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={handleUpload} />
                        {uploadError && <span className="text-xs text-red-400 font-bold">{uploadError}</span>}
                    </div>
                </>
            ) : (
                /* 本地資料夾選擇 */
                <div className="flex items-center gap-2 flex-wrap">
                    <FolderOpen size={14} className="text-slate-500 shrink-0" />
                    {localFolders.map(f => (
                        <button key={f} onClick={() => switchLocalFolder(f)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-colors ${localFolder === f ? 'bg-teal-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                            {f}/
                        </button>
                    ))}
                </div>
            )}

            {/* 圖片網格 */}
            <div className="bg-slate-900 border-2 border-slate-800 rounded-4xl overflow-hidden shadow-xl">
                {loading ? (
                    <p className="text-xs text-slate-500 text-center py-12">載入中...</p>
                ) : displayFiles.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-16 text-slate-600">
                        <ImageIcon size={32} strokeWidth={1} />
                        <p className="text-sm font-bold">此資料夾尚無圖片</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-px bg-slate-800">
                        {displayFiles.map(item => (
                            <div key={item.key} className="group relative bg-slate-900 aspect-square flex flex-col">
                                {/* 縮圖 */}
                                <div className="flex-1 overflow-hidden flex items-center justify-center p-2 min-h-0">
                                    {isImage(item.name) ? (
                                        <img src={item.url} alt={item.name}
                                            className="max-w-full max-h-full object-contain rounded-lg" />
                                    ) : (
                                        <div className="flex flex-col items-center gap-1 text-slate-600">
                                            <ImageIcon size={28} strokeWidth={1} />
                                            <span className="text-[10px]">{item.name.split('.').pop()?.toUpperCase()}</span>
                                        </div>
                                    )}
                                </div>
                                {/* 底部資訊 */}
                                <div className="px-2 pb-2 space-y-1">
                                    <p className="text-[10px] text-slate-400 truncate font-bold">{item.name}</p>
                                    <p className="text-[9px] text-slate-600">{fmtSize(item.size)}</p>
                                </div>
                                {/* Hover 操作 */}
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 rounded-sm">
                                    <button onClick={() => handleCopy(item.url)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-black rounded-xl transition-colors">
                                        <Copy size={11} />
                                        {copied === item.url ? '已複製！' : '複製連結'}
                                    </button>
                                    {source === 'storage' && 'fullPath' in item && (
                                        <button onClick={() => handleDelete({ fullPath: (item as { fullPath: string }).fullPath, name: item.name, publicUrl: item.url, size: item.size, createdAt: '' })}
                                            disabled={deleting === (item as { fullPath?: string }).fullPath}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/80 hover:bg-red-500 text-white text-[11px] font-black rounded-xl transition-colors disabled:opacity-50">
                                            <Trash2 size={11} />
                                            {deleting === (item as { fullPath?: string }).fullPath ? '刪除中...' : '刪除'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {!loading && displayFiles.length > 0 && (
                    <div className="px-5 py-3 border-t border-slate-800 text-[11px] text-slate-600 flex items-center justify-between">
                        <span>{displayFiles.length} 個檔案</span>
                        <span className="text-teal-600 font-bold">{source === 'local' ? `public/images/${localFolder}/` : `${activeFolder}/`}</span>
                    </div>
                )}
            </div>
        </section>
    );
}

function LineRichMenuSection() {
    const [status, setStatus] = React.useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
    const [msg, setMsg] = React.useState('');

    const handleSetup = async () => {
        setStatus('loading');
        setMsg('');
        try {
            const res = await fetch(`/api/admin/setup-richmenu?key=${encodeURIComponent(ADMIN_PASSWORD)}`);
            const data = await res.json();
            if (data.success) {
                setStatus('ok');
                setMsg(`選單已設定完成（ID: ${data.richMenuId}）`);
            } else {
                setStatus('error');
                setMsg(data.error ?? '未知錯誤');
            }
        } catch (e: unknown) {
            setStatus('error');
            setMsg(e instanceof Error ? e.message : '連線失敗');
        }
    };

    return (
        <section className="space-y-6">
            <div className="flex items-center gap-2 text-orange-500 font-black text-sm uppercase tracking-widest">
                <Settings size={16} /> LINE 機器人選單設定
            </div>
            <div className="bg-slate-900 border-2 border-slate-800 p-8 rounded-4xl space-y-4 shadow-xl">
                {status === 'ok' ? (
                    <p className="text-xs text-center font-bold text-green-400">{msg}</p>
                ) : (
                    <>
                        <p className="text-xs text-slate-400">點擊後將自動產生選單圖片並透過 LINE API 設為預設選單，需要約 10–20 秒。</p>
                        <button
                            onClick={handleSetup}
                            disabled={status === 'loading'}
                            className="w-full bg-green-700 p-4 rounded-2xl text-white font-black shadow-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                        >
                            {status === 'loading' ? '⏳ 設定中…' : '📱 設定 LINE 定課選單'}
                        </button>
                        {status === 'error' && msg && (
                            <p className="text-xs text-center font-bold text-red-400">{msg}</p>
                        )}
                    </>
                )}
            </div>
        </section>
    );
}

const ACTION_LABELS: Record<string, string> = {
    temp_quest_add: '新增臨時任務',
    temp_quest_toggle: '切換臨時任務狀態',
    temp_quest_delete: '刪除臨時任務',
    roster_import: '匯入名冊',
    auto_assign_squads: '自動分配大小隊',
    auto_draw_quests: '全服自動抽籤',
    weekly_snapshot: '每週業力結算',
    w3_compliance: 'w3 週罰款結算',
    w4_final_approve: 'w4 終審核准',
    w4_final_reject: 'w4 終審駁回',
    topic_title_update: '更新主題名稱',
};

interface AdminDashboardProps {
    adminAuth: boolean;
    onAuth: (e: { preventDefault: () => void; currentTarget: HTMLFormElement }) => void;
    systemSettings: SystemSettings;
    updateGlobalSetting: (key: string, value: string) => void;
    updateGlobalSettings: (updates: Record<string, string>) => void;
    leaderboard: CharacterStats[];
    topicHistory: TopicHistory[];
    temporaryQuests: TemporaryQuest[];
    squadApprovedW4Apps: W4Application[];
    adminLogs: AdminLog[];
    testimonies: Testimony[];
    courses: Course[];
    onAddTempQuest: (title: string, sub: string, desc: string, reward: number) => void;
    onToggleTempQuest: (id: string, active: boolean) => void;
    onDeleteTempQuest: (id: string) => void;
    onTriggerSnapshot: () => void;
    onCheckW3Compliance: () => void;
    onAutoDrawAllSquads: () => void;
    onImportRoster: (csvData: string) => Promise<void>;
    onFinalReviewW4: (appId: string, approve: boolean, notes: string) => Promise<void>;
    onUpsertCourse: (course: Omit<Course, 'created_at'>) => Promise<void>;
    onDeleteCourse: (id: string) => Promise<void>;
    onUpdateMemberAssignment: (userId: string, teamName: string, squadName: string, isCaptain: boolean, isCommandant: boolean, isGM: boolean) => Promise<void>;
    onRefreshLeaderboard: () => Promise<void>;
    onClose: () => void;
}

export function AdminDashboard({
    adminAuth, onAuth, systemSettings, updateGlobalSetting, updateGlobalSettings,
    leaderboard, topicHistory, temporaryQuests,
    squadApprovedW4Apps, adminLogs, testimonies, courses,
    onAddTempQuest, onToggleTempQuest, onDeleteTempQuest,
    onTriggerSnapshot, onCheckW3Compliance, onAutoDrawAllSquads,
    onImportRoster, onFinalReviewW4, onUpsertCourse, onDeleteCourse,
    onUpdateMemberAssignment, onRefreshLeaderboard, onClose
}: AdminDashboardProps) {
    const [csvInput, setCsvInput] = React.useState("");
    const [isImporting, setIsImporting] = React.useState(false);
    const [w4Notes, setW4Notes] = React.useState<Record<string, string>>({});
    const [reviewingW4Id, setReviewingW4Id] = React.useState<string | null>(null);
    const [volunteerPwd, setVolunteerPwd] = React.useState('');
    const [volPwdSaved, setVolPwdSaved] = React.useState(false);

    // 主線任務設定
    const [mqTitle, setMqTitle] = React.useState('');
    const [mqReward, setMqReward] = React.useState('1000');
    const [mqCoins, setMqCoins] = React.useState('100');
    React.useEffect(() => {
        setMqTitle(systemSettings.TopicQuestTitle || '');
        setMqReward(systemSettings.TopicQuestReward || '1000');
        setMqCoins(systemSettings.TopicQuestCoins || '100');
    }, [systemSettings.TopicQuestTitle, systemSettings.TopicQuestReward, systemSettings.TopicQuestCoins]);

    const mainQuestSchedule: MainQuestEntry[] = React.useMemo(() => {
        try { return JSON.parse(systemSettings.MainQuestSchedule ?? '[]'); } catch { return []; }
    }, [systemSettings.MainQuestSchedule]);

    const [mqFormEntry, setMqFormEntry] = React.useState({ title: '', reward: '1000', coins: '100', startDate: '' });

    const today = new Date().toISOString().split('T')[0];
    const activeMqEntry = [...mainQuestSchedule]
        .filter(e => e.startDate <= today)
        .sort((a, b) => b.startDate.localeCompare(a.startDate))[0];

    const handleAddMqEntry = () => {
        if (!mqFormEntry.title.trim() || !mqFormEntry.startDate) return;
        const newEntry: MainQuestEntry = {
            id: Date.now().toString(),
            title: mqFormEntry.title.trim(),
            reward: parseInt(mqFormEntry.reward, 10) || 1000,
            coins: parseInt(mqFormEntry.coins, 10) || 100,
            startDate: mqFormEntry.startDate,
        };
        const sorted = [...mainQuestSchedule, newEntry].sort((a, b) => a.startDate.localeCompare(b.startDate));
        updateGlobalSetting('MainQuestSchedule', JSON.stringify(sorted));
        setMqFormEntry({ title: '', reward: '1000', coins: '100', startDate: '' });
    };

    const handleRemoveMqEntry = (id: string) => {
        updateGlobalSetting('MainQuestSchedule', JSON.stringify(mainQuestSchedule.filter(e => e.id !== id)));
    };

    const handleApplyMqEntry = (entry: MainQuestEntry) => {
        updateGlobalSettings({
            TopicQuestTitle: entry.title,
            TopicQuestReward: String(entry.reward),
            TopicQuestCoins: String(entry.coins),
            MainQuestAppliedId: entry.id,
        });
    };

    // 大小隊分組管理
    const [squadExpandedTeams, setSquadExpandedTeams] = React.useState<Set<string>>(new Set());
    const [squadExpandedSquads, setSquadExpandedSquads] = React.useState<Set<string>>(new Set());
    const [editingMemberId, setEditingMemberId] = React.useState<string | null>(null);
    const [memberEditForm, setMemberEditForm] = React.useState({ teamName: '', squadName: '', isCaptain: false, isCommandant: false, isGM: false });
    const [memberSaving, setMemberSaving] = React.useState(false);

    // 自訂隊名（可自訂，不影響固定識別碼）
    const [squadDisplayNames, setSquadDisplayNames] = React.useState<Record<string, string>>({});
    const [battalionDisplayNames, setBattalionDisplayNames] = React.useState<Record<string, string>>({});
    const [settingDisplayNameFor, setSettingDisplayNameFor] = React.useState<{ type: 'squad' | 'battalion'; id: string } | null>(null);
    const [displayNameInput, setDisplayNameInput] = React.useState('');
    const [displayNameSaving, setDisplayNameSaving] = React.useState(false);

    // 載入自訂隊名
    React.useEffect(() => {
        if (!adminAuth) return;
        import('@/app/actions/admin').then(({ getGroupDisplayNames }) =>
            getGroupDisplayNames().then(({ squads, battalions }) => {
                setSquadDisplayNames(Object.fromEntries(squads.filter(s => s.display_name).map(s => [s.team_name, s.display_name!])));
                setBattalionDisplayNames(Object.fromEntries(battalions.filter(b => b.display_name).map(b => [b.battalion_name, b.display_name!])));
            })
        );
    }, [adminAuth]);

    const saveDisplayName = async () => {
        if (!settingDisplayNameFor) return;
        setDisplayNameSaving(true);
        if (settingDisplayNameFor.type === 'squad') {
            const { setSquadDisplayName } = await import('@/app/actions/admin');
            await setSquadDisplayName(settingDisplayNameFor.id, displayNameInput);
            setSquadDisplayNames(prev => ({ ...prev, [settingDisplayNameFor.id]: displayNameInput.trim() }));
        } else {
            const { setBattalionDisplayName } = await import('@/app/actions/admin');
            await setBattalionDisplayName(settingDisplayNameFor.id, displayNameInput);
            setBattalionDisplayNames(prev => ({ ...prev, [settingDisplayNameFor.id]: displayNameInput.trim() }));
        }
        setDisplayNameSaving(false);
        setSettingDisplayNameFor(null);
    };

    // 手動定義的大隊
    const definedBattalions: string[] = React.useMemo(() => {
        try { return JSON.parse(systemSettings.DefinedBattalions ?? '[]'); } catch { return []; }
    }, [systemSettings.DefinedBattalions]);

    const [addBattalionOpen, setAddBattalionOpen] = React.useState(false);
    const [addBattalionId, setAddBattalionId] = React.useState('');

    const saveDefinedBattalions = (next: string[]) => {
        updateGlobalSetting('DefinedBattalions', JSON.stringify(next));
    };

    const handleAddBattalion = () => {
        if (!addBattalionId.trim()) return;
        if (definedBattalions.includes(addBattalionId.trim())) return;
        saveDefinedBattalions([...definedBattalions, addBattalionId.trim()]);
        setAddBattalionId('');
        setAddBattalionOpen(false);
    };

    const handleRemoveDefinedBattalion = (teamId: string) => {
        saveDefinedBattalions(definedBattalions.filter(t => t !== teamId));
    };

    // 手動定義的小隊
    const definedSquads: { teamId: string; squadId: string }[] = React.useMemo(() => {
        try { return JSON.parse(systemSettings.DefinedSquads ?? '[]'); } catch { return []; }
    }, [systemSettings.DefinedSquads]);

    const [addSquadOpen, setAddSquadOpen] = React.useState(false);
    const [addSquadTeam, setAddSquadTeam] = React.useState('');
    const [addSquadId, setAddSquadId] = React.useState('');

    const saveDefinedSquads = (next: { teamId: string; squadId: string }[]) => {
        updateGlobalSetting('DefinedSquads', JSON.stringify(next));
    };

    const handleAddSquad = () => {
        if (!addSquadTeam.trim() || !addSquadId.trim()) return;
        const exists = definedSquads.some(s => s.teamId === addSquadTeam.trim() && s.squadId === addSquadId.trim());
        if (exists) return;
        saveDefinedSquads([...definedSquads, { teamId: addSquadTeam.trim(), squadId: addSquadId.trim() }]);
        setAddSquadId('');
        setAddSquadOpen(false);
    };

    const handleRemoveDefinedSquad = (teamId: string, squadId: string) => {
        saveDefinedSquads(definedSquads.filter(s => !(s.teamId === teamId && s.squadId === squadId)));
    };

    // 分組結構：大隊 → 小隊 → 成員（大隊長用特殊 key '__commandant__' 獨立顯示）
    const COMMANDANT_KEY = '__commandant__';
    const groupedByTeam = React.useMemo(() => {
        const map = new Map<string, Map<string, CharacterStats[]>>();
        for (const p of leaderboard) {
            const team = p.TeamName ?? '（未分配）';
            // 大隊長不歸入任何小隊，改用特殊 key
            const squad = p.IsCommandant ? COMMANDANT_KEY : (p.SquadName ?? '（未分配）');
            if (!map.has(team)) map.set(team, new Map());
            const squadMap = map.get(team)!;
            if (!squadMap.has(squad)) squadMap.set(squad, []);
            squadMap.get(squad)!.push(p);
        }
        // 合併手動定義的空大隊
        for (const teamId of definedBattalions) {
            if (!map.has(teamId)) map.set(teamId, new Map());
        }
        // 合併手動定義的空小隊
        for (const { teamId, squadId } of definedSquads) {
            if (!map.has(teamId)) map.set(teamId, new Map());
            const squadMap = map.get(teamId)!;
            if (!squadMap.has(squadId)) squadMap.set(squadId, []);
        }
        return map;
    }, [leaderboard, definedBattalions, definedSquads]);

    const allSquadNames = React.useMemo(() => [...new Set(leaderboard.map(p => p.SquadName).filter(Boolean))] as string[], [leaderboard]);
    const allTeamNames = React.useMemo(() => [...new Set(leaderboard.map(p => p.TeamName).filter(Boolean))] as string[], [leaderboard]);

    const toggleTeam = (name: string) => setSquadExpandedTeams(prev => {
        const s = new Set(prev);
        s.has(name) ? s.delete(name) : s.add(name);
        return s;
    });
    const toggleSquad = (name: string) => setSquadExpandedSquads(prev => {
        const s = new Set(prev);
        s.has(name) ? s.delete(name) : s.add(name);
        return s;
    });

    const startEditMember = (p: CharacterStats) => {
        setEditingMemberId(p.UserID);
        setMemberEditForm({ teamName: p.TeamName ?? '', squadName: p.SquadName ?? '', isCaptain: !!p.IsCaptain, isCommandant: !!p.IsCommandant, isGM: !!p.IsGM });
    };
    const saveMemberEdit = async () => {
        if (!editingMemberId) return;
        setMemberSaving(true);
        await onUpdateMemberAssignment(editingMemberId, memberEditForm.teamName, memberEditForm.squadName, memberEditForm.isCaptain, memberEditForm.isCommandant, memberEditForm.isGM);
        setMemberSaving(false);
        setEditingMemberId(null);
    };

    // helper：格式化顯示名稱「第一大隊（龍騎隊）」
    const formatTeamLabel = (id: string) => {
        const dn = battalionDisplayNames[id];
        return dn ? `${id}（${dn}）` : id;
    };
    const formatSquadLabel = (id: string) => {
        const dn = squadDisplayNames[id];
        return dn ? `${id}（${dn}）` : id;
    };

    // 課程報名名單
    const [regListCourseId, setRegListCourseId] = React.useState<string>('');
    const [regList, setRegList] = React.useState<{ userId: string; userName: string; teamName: string; squadName: string; registeredAt: string; attended: boolean; attendedAt: string | null; checkedInBy: string | null }[]>([]);
    const [regListLoading, setRegListLoading] = React.useState(false);
    const [regFilter, setRegFilter] = React.useState('');
    const [regAttendFilter, setRegAttendFilter] = React.useState<'all' | 'attended' | 'not_attended'>('all');
    type RegSortKey = 'teamName' | 'squadName' | 'userName' | 'registeredAt' | 'attended' | 'attendedAt';
    const [regSort, setRegSort] = React.useState<{ key: RegSortKey; dir: 'asc' | 'desc' }>({ key: 'registeredAt', dir: 'asc' });

    const handleRegSort = (key: RegSortKey) => {
        setRegSort(prev => prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });
    };

    const filteredRegList = React.useMemo(() => {
        let list = [...regList];
        if (regFilter.trim()) {
            const kw = regFilter.trim().toLowerCase();
            list = list.filter(r => r.userName.toLowerCase().includes(kw) || r.teamName.toLowerCase().includes(kw) || r.squadName.toLowerCase().includes(kw));
        }
        if (regAttendFilter === 'attended') list = list.filter(r => r.attended);
        if (regAttendFilter === 'not_attended') list = list.filter(r => !r.attended);
        list.sort((a, b) => {
            const va = a[regSort.key];
            const vb = b[regSort.key];
            const cmp = typeof va === 'boolean' ? (va === vb ? 0 : va ? -1 : 1) : String(va).localeCompare(String(vb), 'zh-TW');
            return regSort.dir === 'asc' ? cmp : -cmp;
        });
        return list;
    }, [regList, regFilter, regAttendFilter, regSort]);

    const loadRegList = async (courseId: string) => {
        setRegListCourseId(courseId);
        setRegListLoading(true);
        const list = await getCourseRegistrations(courseId);
        setRegList(list);
        setRegListLoading(false);
    };

    const downloadRegListCsv = () => {
        if (regList.length === 0) return;
        const courseName = courses.find(c => c.id === regListCourseId)?.name ?? regListCourseId;
        const header = ['#', '大隊', '小隊', '姓名', '報名時間', '報到狀態', '報到時間', '掃碼者'];
        const rows = regList.map((r, i) => [
            i + 1,
            r.teamName,
            r.squadName,
            r.userName,
            new Date(r.registeredAt).toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
            r.attended ? '已報到' : '未報到',
            r.attendedAt ? new Date(r.attendedAt).toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—',
            r.checkedInBy ?? '—',
        ]);
        const csv = '\uFEFF' + [header, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${courseName}_報名名單.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // 手動新增人員
    const [addMemberOpen, setAddMemberOpen] = React.useState(false);
    const [addMemberSaving, setAddMemberSaving] = React.useState(false);
    const [addMemberForm, setAddMemberForm] = React.useState({
        name: '', phone: '', email: '', role: '孫悟空',
        teamName: '', squadName: '', isCaptain: false, isCommandant: false,
    });
    const handleAddMember = async () => {
        if (!addMemberForm.name.trim() || !addMemberForm.phone.trim()) return;
        setAddMemberSaving(true);
        const { adminCreateMember } = await import('@/app/actions/admin');
        const res = await adminCreateMember(addMemberForm);
        setAddMemberSaving(false);
        if (!res.success) { alert(`新增失敗：${res.error}`); return; }
        setAddMemberOpen(false);
        setAddMemberForm({ name: '', phone: '', email: '', role: '孫悟空', teamName: '', squadName: '', isCaptain: false, isCommandant: false });
        await onRefreshLeaderboard();
    };

    // 參與人員名單
    type MemberSortKey = 'Name' | 'TeamName' | 'SquadName' | 'Level' | 'Exp' | 'Streak' | 'TotalFines';
    const [memberFilter, setMemberFilter] = React.useState('');
    const [memberTeamFilter, setMemberTeamFilter] = React.useState('');
    const [memberDetailTarget, setMemberDetailTarget] = React.useState<CharacterStats | null>(null);
    const [memberSort, setMemberSort] = React.useState<{ key: MemberSortKey; dir: 'asc' | 'desc' }>({ key: 'Exp', dir: 'desc' });
    const handleMemberSort = (key: MemberSortKey) => {
        setMemberSort(prev => prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' });
    };
    const allTeams = React.useMemo(() => [...new Set(leaderboard.map(p => p.TeamName).filter(Boolean))].sort() as string[], [leaderboard]);
    const filteredMembers = React.useMemo(() => {
        let list = [...leaderboard];
        if (memberFilter.trim()) {
            const kw = memberFilter.trim().toLowerCase();
            list = list.filter(p => p.Name.toLowerCase().includes(kw) || (p.TeamName ?? '').toLowerCase().includes(kw) || (p.SquadName ?? '').toLowerCase().includes(kw));
        }
        if (memberTeamFilter) list = list.filter(p => p.TeamName === memberTeamFilter);
        list.sort((a, b) => {
            const va = a[memberSort.key] ?? 0;
            const vb = b[memberSort.key] ?? 0;
            const cmp = typeof va === 'number' ? (va as number) - (vb as number) : String(va).localeCompare(String(vb), 'zh-TW');
            return memberSort.dir === 'asc' ? cmp : -cmp;
        });
        return list;
    }, [leaderboard, memberFilter, memberTeamFilter, memberSort]);
    const downloadMembersCsv = () => {
        if (filteredMembers.length === 0) return;
        const header = ['#', '姓名', '大隊', '小隊', '職位', '等級', '修為', '連勝', '罰金餘額'];
        const rows = filteredMembers.map((p, i) => [
            i + 1, p.Name, p.TeamName ?? '—', p.SquadName ?? '—',
            p.IsCommandant ? '大隊長' : p.IsCaptain ? '小隊長' : '學員',
            p.Level, p.Exp, p.Streak, p.TotalFines - p.FinePaid,
        ]);
        const csv = '\uFEFF' + [header, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = '參與人員名單.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    // 課程管理
    const DOW = ['日', '一', '二', '三', '四', '五', '六'];
    const genDateDisplay = (date: string) => {
        if (!date) return '';
        const d = new Date(date + 'T00:00:00');
        return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${DOW[d.getDay()]}）`;
    };

    // 課程報名彈窗
    const [regModalCourse, setRegModalCourse] = React.useState<Course | null>(null);

    type CourseFormState = { id: string; name: string; date: string; startTime: string; endTime: string; location: string; address: string; is_active: boolean; sort_order: number };
    const emptyCourseForm: CourseFormState = { id: '', name: '', date: '', startTime: '', endTime: '', location: '', address: '', is_active: true, sort_order: 0 };
    const [courseForm, setCourseForm] = React.useState<CourseFormState>(emptyCourseForm);
    const [editingCourseId, setEditingCourseId] = React.useState<string | null>(null);
    const [courseSubmitting, setCourseSubmitting] = React.useState(false);

    const handleCourseSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        setCourseSubmitting(true);
        const timeStr = courseForm.startTime && courseForm.endTime
            ? `${courseForm.startTime}–${courseForm.endTime}`
            : courseForm.startTime || '';
        await onUpsertCourse({
            id: courseForm.id,
            name: courseForm.name,
            date: courseForm.date,
            date_display: genDateDisplay(courseForm.date),
            time: timeStr,
            location: courseForm.location,
            address: courseForm.address,
            is_active: courseForm.is_active,
            sort_order: Number(courseForm.sort_order),
        });
        setCourseSubmitting(false);
        setCourseForm(emptyCourseForm);
        setEditingCourseId(null);
    };

    const handleEditCourse = (c: Course) => {
        const [startTime = '', endTime = ''] = c.time.split('–');
        setCourseForm({ id: c.id, name: c.name, date: c.date, startTime: startTime.trim(), endTime: endTime.trim(), location: c.location, address: c.address ?? '', is_active: c.is_active, sort_order: c.sort_order });
        setEditingCourseId(c.id);
    };

    const handleImportSubmit = async (e: { preventDefault: () => void }) => {
        e.preventDefault();
        if (!csvInput.trim()) return;
        setIsImporting(true);
        await onImportRoster(csvInput);
        setIsImporting(false);
        setCsvInput("");
    };

    const handleW4Review = async (appId: string, approve: boolean) => {
        setReviewingW4Id(appId);
        await onFinalReviewW4(appId, approve, w4Notes[appId] || '');
        setReviewingW4Id(null);
        setW4Notes(prev => { const n = { ...prev }; delete n[appId]; return n; });
    };

    const [adminModule, setAdminModule] = React.useState<'personnel' | 'course' | 'quest' | 'params' | 'gallery' | null>(null);

    if (!adminAuth) {
        return (
            <div className="min-h-screen bg-slate-950 text-slate-200 p-8 flex flex-col justify-center items-center animate-in fade-in">
                <div className="max-w-sm w-full space-y-8 text-center mx-auto">
                    <div className="w-20 h-20 bg-slate-800 rounded-3xl mx-auto flex items-center justify-center border border-slate-700 text-orange-500"><Lock size={40} /></div>
                    <h1 className="text-3xl font-black text-white text-center mx-auto">大會中樞驗證</h1>
                    <form onSubmit={onAuth} className="space-y-6">
                        <input name="password" type="password" required className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl p-5 text-white text-center text-xl outline-none focus:border-orange-500 font-bold" placeholder="密令" autoFocus />
                        <div className="flex gap-4">
                            <button type="button" onClick={onClose} className="flex-1 py-4 bg-slate-800 text-slate-400 font-bold rounded-2xl">取消</button>
                            <button className="flex-2 py-4 bg-orange-600 text-white font-black rounded-2xl shadow-lg active:scale-95 transition-all">驗證登入</button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    const NAV_ITEMS = [
        { key: null as null,          label: '首頁',    icon: <BarChart3 size={17} />, accent: 'slate' },
        { key: 'personnel' as const,  label: '人員管理', icon: <Users size={17} />,    accent: 'cyan' },
        { key: 'course' as const,     label: '課程管理', icon: <BookOpen size={17} />, accent: 'amber' },
        { key: 'quest' as const,      label: '任務管理', icon: <Settings size={17} />, accent: 'orange' },
        { key: 'params' as const,     label: '參數管理', icon: <Save size={17} />,        accent: 'violet' },
        { key: 'gallery' as const,    label: '圖片庫',   icon: <ImageIcon size={17} />,   accent: 'teal' },
    ] as const;

    const accentClass: Record<string, string> = {
        slate:  'bg-slate-800 text-white border-slate-600',
        cyan:   'bg-cyan-950/70 text-cyan-300 border-cyan-700/50',
        amber:  'bg-amber-950/70 text-amber-300 border-amber-700/50',
        orange: 'bg-orange-950/70 text-orange-300 border-orange-700/50',
        violet: 'bg-violet-950/70 text-violet-300 border-violet-700/50',
        teal:   'bg-teal-950/70 text-teal-300 border-teal-700/50',
    };
    const accentDot: Record<string, string> = {
        slate: 'bg-slate-400', cyan: 'bg-cyan-400', amber: 'bg-amber-400', orange: 'bg-orange-400', violet: 'bg-violet-400', teal: 'bg-teal-400',
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 flex animate-in fade-in">

            {/* ══ 左側導覽列（桌機）══ */}
            <aside className="hidden md:flex flex-col w-48 shrink-0 bg-slate-900 border-r border-white/5 sticky top-0 h-screen">
                {/* Logo */}
                <div className="flex items-center gap-2.5 px-4 py-5 border-b border-white/5">
                    <div className="p-2 bg-orange-600 rounded-xl text-white shadow-md shrink-0"><Settings size={16} /></div>
                    <div className="leading-tight">
                        <p className="text-xs font-black text-white">大會管理後台</p>
                        <p className="text-[10px] text-slate-600">Admin Dashboard</p>
                    </div>
                </div>
                {/* Nav */}
                <nav className="flex flex-col gap-1 p-3 flex-1">
                    {NAV_ITEMS.map(item => {
                        const isActive = adminModule === item.key;
                        return (
                            <button key={String(item.key)} onClick={() => setAdminModule(item.key)}
                                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold border transition-all text-left w-full
                                    ${isActive
                                        ? accentClass[item.accent] + ' border'
                                        : 'text-slate-500 border-transparent hover:text-slate-200 hover:bg-white/5'}`}>
                                {isActive && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${accentDot[item.accent]}`} />}
                                <span className={isActive ? '' : 'opacity-60'}>{item.icon}</span>
                                {item.label}
                            </button>
                        );
                    })}
                </nav>
                {/* Close */}
                <div className="p-3 border-t border-white/5">
                    <button onClick={onClose}
                        className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-slate-600 hover:text-red-400 text-sm font-bold transition-colors hover:bg-red-500/5">
                        <X size={15} /> 關閉後台
                    </button>
                </div>
            </aside>

            {/* ══ 主內容區 ══ */}
            <div className="flex-1 min-w-0 flex flex-col">

                {/* 手機頂部橫向 tab */}
                <div className="md:hidden sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-white/5 flex items-center gap-2 px-3 py-2.5 overflow-x-auto">
                    {NAV_ITEMS.map(item => {
                        const isActive = adminModule === item.key;
                        return (
                            <button key={String(item.key)} onClick={() => setAdminModule(item.key)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap border shrink-0 transition-all
                                    ${isActive ? accentClass[item.accent] + ' border' : 'text-slate-500 border-transparent bg-slate-800'}`}>
                                {item.icon}{item.label}
                            </button>
                        );
                    })}
                    <button onClick={onClose} className="ml-auto shrink-0 p-1.5 rounded-xl text-slate-600 hover:text-red-400 transition-colors">
                        <X size={16} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                <div className="max-w-5xl mx-auto space-y-10 pb-20 p-6 md:p-8">

                {/* ── 頁頭 ── */}
                <header className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-orange-600 rounded-2xl text-white shadow-lg md:hidden"><Settings size={20} /></div>
                        <div>
                            <h1 className="text-xl md:text-2xl font-black text-white">
                                {adminModule === null ? '首頁' : adminModule === 'personnel' ? '人員管理' : adminModule === 'course' ? '課程管理' : adminModule === 'quest' ? '任務管理' : adminModule === 'params' ? '參數管理' : '圖片庫'}
                            </h1>
                            <p className="text-[10px] text-slate-600">大會管理後台</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="md:hidden p-3 bg-slate-900 rounded-2xl text-slate-500 border border-slate-800 hover:text-red-400"><X size={18} /></button>
                </header>

                {/* ══ 首頁：模組選單 ══ */}
                {adminModule === null && (<>

                    {/* 模組導航卡片 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
                        <button onClick={() => setAdminModule('personnel')}
                            className="text-left bg-slate-900 border-2 border-cyan-500/30 hover:border-cyan-400/60 p-6 rounded-4xl shadow-xl transition-all hover:bg-slate-800 group">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-cyan-600/20 rounded-2xl text-cyan-400 group-hover:bg-cyan-600/30 transition-colors"><Users size={22} /></div>
                                <h2 className="text-lg font-black text-white">人員管理</h2>
                            </div>
                            <ul className="text-xs text-slate-400 space-y-1.5 font-bold">
                                <li>・戰隊名冊管理</li>
                                <li>・大小隊分組管理</li>
                                <li>・參與人員名單</li>
                            </ul>
                        </button>
                        <button onClick={() => setAdminModule('course')}
                            className="text-left bg-slate-900 border-2 border-amber-500/30 hover:border-amber-400/60 p-6 rounded-4xl shadow-xl transition-all hover:bg-slate-800 group">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-amber-600/20 rounded-2xl text-amber-400 group-hover:bg-amber-600/30 transition-colors"><BookOpen size={22} /></div>
                                <h2 className="text-lg font-black text-white">課程管理</h2>
                            </div>
                            <ul className="text-xs text-slate-400 space-y-1.5 font-bold">
                                <li>・課程新增 / 編輯</li>
                                <li>・報名名單查詢</li>
                                <li>・志工掃碼授權</li>
                            </ul>
                        </button>
                        <button onClick={() => setAdminModule('quest')}
                            className="text-left bg-slate-900 border-2 border-orange-500/30 hover:border-orange-400/60 p-6 rounded-4xl shadow-xl transition-all hover:bg-slate-800 group">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-orange-600/20 rounded-2xl text-orange-400 group-hover:bg-orange-600/30 transition-colors"><BarChart3 size={22} /></div>
                                <h2 className="text-lg font-black text-white">任務管理</h2>
                            </div>
                            <ul className="text-xs text-slate-400 space-y-1.5 font-bold">
                                <li>・臨時加分任務管理</li>
                                <li>・全域修行設定</li>
                                <li>・動態難度系統 (DDA)</li>
                            </ul>
                        </button>
                        <button onClick={() => setAdminModule('params')}
                            className="text-left bg-slate-900 border-2 border-violet-500/30 hover:border-violet-400/60 p-6 rounded-4xl shadow-xl transition-all hover:bg-slate-800 group">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-violet-600/20 rounded-2xl text-violet-400 group-hover:bg-violet-600/30 transition-colors"><Save size={22} /></div>
                                <h2 className="text-lg font-black text-white">參數管理</h2>
                            </div>
                            <ul className="text-xs text-slate-400 space-y-1.5 font-bold">
                                <li>・定課管理</li>
                                <li>・道具管理</li>
                            </ul>
                        </button>
                    </div>

                    {/* ❤️ w4 傳愛分數終審 */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-2 text-pink-500 font-black text-sm uppercase tracking-widest">❤️ 傳愛分數終審（管理員）</div>
                        <div className="bg-slate-900 border-2 border-pink-500/20 p-8 rounded-4xl shadow-xl space-y-4">
                            {squadApprovedW4Apps.length === 0 ? (
                                <p className="text-sm text-slate-500 text-center py-4">目前無待終審申請</p>
                            ) : (
                                squadApprovedW4Apps.map(app => (
                                    <div key={app.id} className="bg-slate-800 rounded-2xl p-5 space-y-3">
                                        <div className="flex justify-between items-start flex-wrap gap-2">
                                            <div>
                                                <p className="font-black text-white">{app.user_name}</p>
                                                <p className="text-xs text-slate-400">{app.squad_name} · 訪談：{app.interview_target} · {app.interview_date}</p>
                                                {app.squad_review_notes && <p className="text-xs text-indigo-400 mt-1">小隊長備註：{app.squad_review_notes}</p>}
                                            </div>
                                            <span className="text-[10px] font-black text-blue-400 bg-blue-400/10 px-2 py-1 rounded-lg">待終審</span>
                                        </div>
                                        {app.description && <p className="text-xs text-slate-400 italic">{app.description}</p>}
                                        <textarea placeholder="終審備註（選填）" value={w4Notes[app.id] || ''}
                                            onChange={e => setW4Notes(prev => ({ ...prev, [app.id]: e.target.value }))}
                                            rows={2} className="w-full bg-slate-700 border border-slate-600 rounded-xl p-3 text-white text-xs outline-none focus:border-pink-500 resize-none" />
                                        <div className="flex gap-3">
                                            <button disabled={reviewingW4Id === app.id} onClick={() => handleW4Review(app.id, false)}
                                                className="flex-1 py-2 bg-red-600/20 text-red-400 font-black rounded-xl text-sm border border-red-600/30 active:scale-95 transition-all disabled:opacity-50">❌ 駁回</button>
                                            <button disabled={reviewingW4Id === app.id} onClick={() => handleW4Review(app.id, true)}
                                                className="flex-2 py-2 bg-emerald-600 text-white font-black rounded-xl text-sm shadow-lg active:scale-95 transition-all disabled:opacity-50">✅ 核准入帳</button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>

                    {/* LINE 選單設定 */}
                    <LineRichMenuSection />

                    {/* 親證故事列表 */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-2 text-orange-500 font-black text-sm uppercase tracking-widest"><BarChart3 size={16} /> 親證故事存檔（{testimonies.length} 筆）</div>
                        <div className="bg-slate-900 border-2 border-slate-800 rounded-4xl overflow-hidden shadow-xl max-h-[500px] overflow-y-auto divide-y divide-slate-800">
                            {testimonies.length === 0 ? (
                                <p className="text-sm text-slate-500 text-center py-8">尚無親證故事記錄</p>
                            ) : testimonies.map(t => (
                                <div key={t.id} className="p-4 hover:bg-white/5 transition-colors space-y-1">
                                    <div className="flex justify-between items-start gap-2">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-black text-white">
                                                {t.parsed_name ?? t.display_name ?? '未知'}
                                                {t.parsed_category && <span className="ml-2 text-[10px] font-normal bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-lg">{t.parsed_category}</span>}
                                            </p>
                                            <p className="text-xs text-slate-400 mt-1 leading-relaxed line-clamp-3">{t.content}</p>
                                        </div>
                                        <div className="text-right shrink-0 text-[10px] text-slate-500 space-y-1">
                                            <p>{t.parsed_date ?? '日期未填'}</p>
                                            <p>{new Date(t.created_at).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* 修為榜 + 操作日誌 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <section className="space-y-6">
                            <div className="flex items-center gap-2 text-orange-500 font-black text-sm uppercase tracking-widest"><Users size={16} /> 修行者修為榜預覽</div>
                            <div className="bg-slate-900 border-2 border-slate-800 rounded-4xl overflow-hidden divide-y divide-slate-800 shadow-xl max-h-[400px] overflow-y-auto">
                                {leaderboard.map((p, i) => (
                                    <div key={p.UserID} className="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors">
                                        <span className="text-xs font-black text-slate-600 w-4 text-center">{i + 1}</span>
                                        <div className="flex-1 text-left">
                                            <p className="font-bold text-white text-sm">{p.Name}</p>
                                            <p className="text-[10px] text-slate-500 italic">{p.Role}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-black text-orange-500">{p.Exp} 修為</p>
                                            <p className="text-[10px] text-red-500">罰金 NT${p.TotalFines}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                        <section className="space-y-6">
                            <div className="flex items-center gap-2 text-orange-500 font-black text-sm uppercase tracking-widest"><BarChart3 size={16} /> 管理操作日誌</div>
                            <div className="bg-slate-900 border-2 border-slate-800 rounded-4xl overflow-hidden shadow-xl max-h-[400px] overflow-y-auto divide-y divide-slate-800">
                                {adminLogs.length === 0 ? (
                                    <p className="text-sm text-slate-500 text-center py-8">尚無操作記錄</p>
                                ) : adminLogs.map(log => (
                                    <div key={log.id} className={`p-4 hover:bg-white/5 transition-colors ${log.result === 'error' ? 'bg-red-950/20' : ''}`}>
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-xs font-black ${log.result === 'error' ? 'text-red-400' : 'text-slate-200'}`}>{ACTION_LABELS[log.action] || log.action}</p>
                                                {log.target_name && <p className="text-[10px] text-slate-500 truncate">對象：{log.target_name}</p>}
                                                {log.details && <p className="text-[10px] text-slate-600 truncate">{Object.entries(log.details).map(([k, v]) => `${k}: ${v}`).join(' · ')}</p>}
                                            </div>
                                            <div className="text-right shrink-0">
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${log.result === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                                    {log.result === 'error' ? '失敗' : '成功'}
                                                </span>
                                                <p className="text-[10px] text-slate-600 mt-1">{new Date(log.created_at).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                </>)}

                {/* ══ 人員管理模組 ══ */}
                {adminModule === 'personnel' && (<>

                    {/* 戰隊名冊管理 */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-2 text-orange-500 font-black text-sm uppercase tracking-widest"><Users size={16} /> 戰隊名冊管理</div>
                        <div className="bg-slate-900 border-2 border-slate-800 p-8 rounded-4xl space-y-6 shadow-xl">
                            <div className="space-y-3">
                                <p className="text-xs font-black text-slate-500 uppercase tracking-widest">登入模式</p>
                                <div className={`flex items-center justify-between p-4 rounded-2xl border-2 ${systemSettings.RegistrationMode === 'roster' ? 'border-indigo-500/50 bg-indigo-950/30' : 'border-emerald-500/50 bg-emerald-950/30'}`}>
                                    <div>
                                        <p className={`font-black text-sm ${systemSettings.RegistrationMode === 'roster' ? 'text-indigo-300' : 'text-emerald-300'}`}>
                                            {systemSettings.RegistrationMode === 'roster' ? '🔐 名單驗證模式' : '🌐 自由註冊模式'}
                                        </p>
                                        <p className="text-[10px] text-slate-500 mt-0.5">
                                            {systemSettings.RegistrationMode === 'roster' ? '僅限名冊內信箱登入，新生需由管理員預先匯入' : '任何人可自行填表註冊'}
                                        </p>
                                    </div>
                                    <button onClick={() => updateGlobalSetting('RegistrationMode', systemSettings.RegistrationMode === 'roster' ? 'open' : 'roster')}
                                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${systemSettings.RegistrationMode === 'roster' ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white'}`}>
                                        切換為{systemSettings.RegistrationMode === 'roster' ? '自由註冊' : '名單驗證'}
                                    </button>
                                </div>
                            </div>
                            <div className="border-t border-white/5 pt-4" />
                            <form onSubmit={handleImportSubmit} className="space-y-4 text-center">
                                <div className="flex items-start justify-between gap-4">
                                    <p className="text-xs text-slate-400 text-left">
                                        請貼上 CSV 格式資料（含表頭行將自動略過）<br />
                                        格式：<span className="text-orange-400 font-mono">email, 姓名, 生日(YYYY-MM-DD), 大隊, 小隊, 是否小隊長, 是否大隊長</span>
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const header = 'email,姓名,生日(YYYY-MM-DD),大隊,小隊,是否小隊長,是否大隊長';
                                            const example = [
                                                'user1@gmail.com,王小明,1960-03-15,第一大隊,第一小隊,false,false',
                                                'user2@gmail.com,李大華,1985-07-22,第一大隊,第一小隊,true,false',
                                                'user3@gmail.com,張美玲,1970-11-08,第二大隊,第二小隊,false,true',
                                            ].join('\n');
                                            const blob = new Blob([header + '\n' + example], { type: 'text/csv;charset=utf-8;' });
                                            const url = URL.createObjectURL(blob);
                                            const a = document.createElement('a');
                                            a.href = url;
                                            a.download = '名冊匯入範本.csv';
                                            a.click();
                                            URL.revokeObjectURL(url);
                                        }}
                                        className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-black rounded-xl border border-slate-700 transition-colors"
                                    >
                                        <Download size={13} /> 下載範本
                                    </button>
                                </div>
                                {/* 上傳 CSV 檔案 */}
                                <label className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-slate-700 hover:border-orange-500/60 rounded-2xl text-slate-400 hover:text-orange-400 text-xs font-black cursor-pointer transition-colors bg-slate-950/50">
                                    <Upload size={14} /> 點擊上傳 CSV 檔案（會自動填入下方）
                                    <input type="file" accept=".csv,text/csv" className="hidden"
                                        onChange={e => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            const reader = new FileReader();
                                            reader.onload = ev => setCsvInput((ev.target?.result as string) ?? '');
                                            reader.readAsText(file, 'UTF-8');
                                            e.target.value = '';
                                        }} />
                                </label>
                                <textarea value={csvInput} onChange={(e) => setCsvInput(e.target.value)}
                                    placeholder={`ex:\nuser1@gmail.com,王小明,1960-03-15,第一大隊,第一小隊,true,false\nuser2@gmail.com,李大華,1985-07-22,第一大隊,第一小隊,false,false`}
                                    className="w-full h-36 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-mono text-xs outline-none focus:border-orange-500 resize-none" />
                                <button disabled={isImporting || !csvInput} className="w-full bg-emerald-600 p-4 rounded-2xl text-white font-black shadow-lg hover:bg-emerald-500 active:scale-95 transition-all disabled:opacity-50">
                                    {isImporting ? '匯入中...' : '📥 批量匯入名冊'}
                                </button>
                            </form>
                        </div>
                    </section>

                    {/* 大小隊分組管理 */}
                    <section className="space-y-6">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2 text-cyan-400 font-black text-sm uppercase tracking-widest">
                                <Users size={16} /> 大小隊分組管理
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => { setAddBattalionOpen(v => !v); setAddSquadOpen(false); setAddBattalionId(''); }}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 text-xs font-black rounded-xl border border-amber-600/30 transition-colors"
                                >
                                    <Plus size={13} /> 新增大隊
                                </button>
                                <button
                                    onClick={() => { setAddSquadOpen(v => !v); setAddBattalionOpen(false); setAddSquadTeam(''); setAddSquadId(''); }}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 text-xs font-black rounded-xl border border-cyan-600/30 transition-colors"
                                >
                                    <Plus size={13} /> 新增小隊
                                </button>
                            </div>
                        </div>

                        {/* 新增大隊表單 */}
                        {addBattalionOpen && (
                            <div className="bg-slate-900 border-2 border-amber-500/30 rounded-2xl p-4 space-y-3">
                                <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">新增大隊</p>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-slate-500 font-black uppercase">大隊識別碼（必填）</label>
                                    <input
                                        value={addBattalionId}
                                        onChange={e => setAddBattalionId(e.target.value)}
                                        placeholder="ex: 第一大隊"
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-bold outline-none focus:border-amber-500"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleAddBattalion}
                                        disabled={!addBattalionId.trim()}
                                        className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-black rounded-xl disabled:opacity-40 transition-colors"
                                    >
                                        ✅ 新增
                                    </button>
                                    <button onClick={() => setAddBattalionOpen(false)}
                                        className="px-4 py-2 bg-slate-800 text-slate-400 text-xs font-bold rounded-xl hover:text-white transition-colors">
                                        取消
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* 新增小隊表單 */}
                        {addSquadOpen && (
                            <div className="bg-slate-900 border-2 border-cyan-500/30 rounded-2xl p-4 space-y-3">
                                <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">新增小隊</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-500 font-black uppercase">大隊（必填）</label>
                                        <input
                                            list="add-squad-team-options"
                                            value={addSquadTeam}
                                            onChange={e => setAddSquadTeam(e.target.value)}
                                            placeholder="ex: 第一大隊"
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-bold outline-none focus:border-cyan-500"
                                        />
                                        <datalist id="add-squad-team-options">
                                            {allTeamNames.map(t => <option key={t} value={t}>{formatTeamLabel(t)}</option>)}
                                        </datalist>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-500 font-black uppercase">小隊識別碼（必填）</label>
                                        <input
                                            value={addSquadId}
                                            onChange={e => setAddSquadId(e.target.value)}
                                            placeholder="ex: 第一小隊"
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-bold outline-none focus:border-cyan-500"
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleAddSquad}
                                        disabled={!addSquadTeam.trim() || !addSquadId.trim()}
                                        className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black rounded-xl disabled:opacity-40 transition-colors"
                                    >
                                        ✅ 新增
                                    </button>
                                    <button onClick={() => setAddSquadOpen(false)}
                                        className="px-4 py-2 bg-slate-800 text-slate-400 text-xs font-bold rounded-xl hover:text-white transition-colors">
                                        取消
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="bg-slate-900 border-2 border-cyan-500/20 rounded-4xl shadow-xl overflow-hidden">
                            {leaderboard.length === 0 ? (
                                <p className="text-sm text-slate-500 text-center py-8">尚無成員資料</p>
                            ) : (
                                <div className="divide-y divide-slate-800">
                                    {[...groupedByTeam.entries()].map(([teamId, squadMap]) => (
                                        <div key={teamId}>
                                            <div className="flex items-center">
                                                <button onClick={() => toggleTeam(teamId)}
                                                    className="flex-1 flex items-center justify-between px-6 py-4 hover:bg-white/5 transition-colors text-left">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[10px] font-black text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-lg">大隊</span>
                                                        <span className="font-black text-white">{formatTeamLabel(teamId)}</span>
                                                        <span className="text-xs text-slate-500">{[...squadMap.values()].flat().length} 人・{[...squadMap.keys()].filter(k => k !== COMMANDANT_KEY).length} 小隊</span>
                                                    </div>
                                                    <span className="text-slate-500">{squadExpandedTeams.has(teamId) ? '▲' : '▼'}</span>
                                                </button>
                                                <div className="flex items-center gap-1 mr-4">
                                                    <button onClick={() => { setSettingDisplayNameFor({ type: 'battalion', id: teamId }); setDisplayNameInput(battalionDisplayNames[teamId] ?? ''); }}
                                                        className="px-3 py-1.5 text-[10px] font-black text-slate-500 bg-slate-800 rounded-lg hover:text-cyan-400 transition-colors">
                                                        設定隊名
                                                    </button>
                                                    {[...squadMap.entries()].filter(([k]) => k !== COMMANDANT_KEY).flatMap(([, v]) => v).length === 0 && !squadMap.has(COMMANDANT_KEY) && definedBattalions.includes(teamId) && (
                                                        <button onClick={() => handleRemoveDefinedBattalion(teamId)}
                                                            className="p-1.5 text-slate-700 bg-slate-800 rounded-lg hover:text-red-400 hover:bg-red-900/20 transition-colors"
                                                            title="移除此空大隊">
                                                            <Trash2 size={11} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {settingDisplayNameFor?.type === 'battalion' && settingDisplayNameFor.id === teamId && (
                                                <div className="px-6 pb-4 flex gap-2 flex-wrap items-center bg-slate-950/40">
                                                    <span className="text-xs text-slate-500 font-black">{teamId}</span>
                                                    <span className="text-slate-600">→</span>
                                                    <input autoFocus value={displayNameInput} onChange={e => setDisplayNameInput(e.target.value)}
                                                        placeholder="自訂隊名（如：龍騎隊）"
                                                        className="flex-1 min-w-[160px] bg-slate-900 border border-cyan-500/50 rounded-xl px-3 py-2 text-white text-xs font-bold outline-none" />
                                                    <button onClick={saveDisplayName} disabled={displayNameSaving}
                                                        className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black rounded-xl disabled:opacity-50 transition-colors">
                                                        {displayNameSaving ? '儲存中…' : '確認'}
                                                    </button>
                                                    <button onClick={() => setSettingDisplayNameFor(null)}
                                                        className="px-3 py-2 bg-slate-800 text-slate-400 text-xs font-bold rounded-xl hover:text-white transition-colors">
                                                        取消
                                                    </button>
                                                </div>
                                            )}

                                            {squadExpandedTeams.has(teamId) && (
                                                <div className="divide-y divide-slate-800/50">
                                                    {/* 大隊長顯示在小隊列表之前 */}
                                                    {(squadMap.get(COMMANDANT_KEY) ?? []).map(p => (
                                                        <div key={p.UserID} className="flex items-center justify-between px-8 py-2.5 bg-amber-950/20">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-black bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">大隊長</span>
                                                                <span className="text-sm text-slate-200">{p.Name}</span>
                                                                <span className="text-[10px] text-slate-600">Lv.{p.Level}</span>
                                                            </div>
                                                            <button onClick={() => startEditMember(p)}
                                                                className="p-1.5 rounded-lg text-slate-600 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors">
                                                                <Pencil size={13} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    {[...squadMap.entries()].filter(([squadId]) => squadId !== COMMANDANT_KEY).map(([squadId, members]) => (
                                                        <div key={squadId} className="bg-slate-950/30">
                                                            <div className="flex items-center justify-between px-8 py-3">
                                                                <button onClick={() => toggleSquad(squadId)}
                                                                    className="flex items-center gap-3 text-left hover:text-white transition-colors flex-1">
                                                                    <span className="text-[10px] font-black text-slate-500 bg-slate-800 px-2 py-0.5 rounded-lg">小隊</span>
                                                                    <span className="font-bold text-slate-200">{formatSquadLabel(squadId)}</span>
                                                                    <span className="text-xs text-slate-600">{members.length} 人</span>
                                                                    <span className="text-slate-600">{squadExpandedSquads.has(squadId) ? '▲' : '▼'}</span>
                                                                </button>
                                                                <div className="flex items-center gap-1 ml-2">
                                                                    <button onClick={() => { setSettingDisplayNameFor({ type: 'squad', id: squadId }); setDisplayNameInput(squadDisplayNames[squadId] ?? ''); }}
                                                                        className="px-3 py-1 text-[10px] font-black text-slate-500 bg-slate-800 rounded-lg hover:text-cyan-400 transition-colors">
                                                                        設定隊名
                                                                    </button>
                                                                    {members.length === 0 && definedSquads.some(s => s.teamId === teamId && s.squadId === squadId) && (
                                                                        <button onClick={() => handleRemoveDefinedSquad(teamId, squadId)}
                                                                            className="p-1.5 text-slate-700 bg-slate-800 rounded-lg hover:text-red-400 hover:bg-red-900/20 transition-colors"
                                                                            title="移除此空小隊">
                                                                            <Trash2 size={11} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {settingDisplayNameFor?.type === 'squad' && settingDisplayNameFor.id === squadId && (
                                                                <div className="px-8 pb-4 flex gap-2 flex-wrap items-center">
                                                                    <span className="text-xs text-slate-500 font-black">{squadId}</span>
                                                                    <span className="text-slate-600">→</span>
                                                                    <input autoFocus value={displayNameInput} onChange={e => setDisplayNameInput(e.target.value)}
                                                                        placeholder="自訂隊名（如：鳳凰隊）"
                                                                        className="flex-1 min-w-[140px] bg-slate-900 border border-cyan-500/50 rounded-xl px-3 py-2 text-white text-xs font-bold outline-none" />
                                                                    <button onClick={saveDisplayName} disabled={displayNameSaving}
                                                                        className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black rounded-xl disabled:opacity-50 transition-colors">
                                                                        {displayNameSaving ? '儲存中…' : '確認'}
                                                                    </button>
                                                                    <button onClick={() => setSettingDisplayNameFor(null)}
                                                                        className="px-3 py-2 bg-slate-800 text-slate-400 text-xs font-bold rounded-xl hover:text-white transition-colors">
                                                                        取消
                                                                    </button>
                                                                </div>
                                                            )}

                                                            {squadExpandedSquads.has(squadId) && (
                                                                <div className="pb-3 px-8 space-y-1">
                                                                    {members.map(p => (
                                                                        <div key={p.UserID}>
                                                                            {editingMemberId === p.UserID ? (
                                                                                <div className="bg-slate-900 border border-cyan-500/30 rounded-2xl p-4 space-y-3">
                                                                                    <div className="flex items-center gap-2 mb-1">
                                                                                        <span className="font-black text-white">{p.Name}</span>
                                                                                        <span className="text-xs text-slate-500">調整分組</span>
                                                                                    </div>
                                                                                    <div className={`grid gap-2 ${memberEditForm.isCommandant ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
                                                                                        <div className="space-y-1">
                                                                                            <label className="text-[10px] text-slate-500 font-black uppercase">大隊（固定識別碼）</label>
                                                                                            <input list="team-id-options" value={memberEditForm.teamName}
                                                                                                onChange={e => setMemberEditForm(f => ({ ...f, teamName: e.target.value }))}
                                                                                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-bold outline-none focus:border-cyan-500" />
                                                                                            <datalist id="team-id-options">
                                                                                                {allTeamNames.map(t => <option key={t} value={t}>{formatTeamLabel(t)}</option>)}
                                                                                            </datalist>
                                                                                        </div>
                                                                                        {!memberEditForm.isCommandant && (
                                                                                            <div className="space-y-1">
                                                                                                <label className="text-[10px] text-slate-500 font-black uppercase">小隊（固定識別碼）</label>
                                                                                                <input list="squad-id-options" value={memberEditForm.squadName}
                                                                                                    onChange={e => setMemberEditForm(f => ({ ...f, squadName: e.target.value }))}
                                                                                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-bold outline-none focus:border-cyan-500" />
                                                                                                <datalist id="squad-id-options">
                                                                                                    {allSquadNames.map(s => <option key={s} value={s}>{formatSquadLabel(s)}</option>)}
                                                                                                </datalist>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                    <div className="flex gap-4 flex-wrap">
                                                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                                                            <input type="checkbox" checked={memberEditForm.isCaptain}
                                                                                                onChange={e => setMemberEditForm(f => ({ ...f, isCaptain: e.target.checked, isCommandant: e.target.checked ? false : f.isCommandant }))}
                                                                                                className="accent-cyan-500 w-4 h-4" />
                                                                                            <span className="text-xs font-bold text-slate-300">小隊長</span>
                                                                                        </label>
                                                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                                                            <input type="checkbox" checked={memberEditForm.isCommandant}
                                                                                                onChange={e => setMemberEditForm(f => ({ ...f, isCommandant: e.target.checked, isCaptain: e.target.checked ? false : f.isCaptain, squadName: e.target.checked ? '' : f.squadName }))}
                                                                                                className="accent-amber-500 w-4 h-4" />
                                                                                            <span className="text-xs font-bold text-slate-300">大隊長</span>
                                                                                        </label>
                                                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                                                            <input type="checkbox" checked={memberEditForm.isGM}
                                                                                                onChange={e => setMemberEditForm(f => ({ ...f, isGM: e.target.checked }))}
                                                                                                className="accent-red-500 w-4 h-4" />
                                                                                            <span className="text-xs font-bold text-red-400">GM 模式</span>
                                                                                        </label>
                                                                                    </div>
                                                                                    <div className="flex gap-2">
                                                                                        <button onClick={saveMemberEdit} disabled={memberSaving}
                                                                                            className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black rounded-xl disabled:opacity-50 transition-colors">
                                                                                            {memberSaving ? '儲存中…' : '✅ 儲存'}
                                                                                        </button>
                                                                                        <button onClick={() => setEditingMemberId(null)}
                                                                                            className="px-4 py-2 bg-slate-800 text-slate-400 text-xs font-bold rounded-xl hover:text-white transition-colors">
                                                                                            取消
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                            ) : (
                                                                                <div className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/5 transition-colors">
                                                                                    <div className="flex items-center gap-2">
                                                                                        {p.IsCommandant
                                                                                            ? <span className="text-[10px] font-black bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">大隊長</span>
                                                                                            : p.IsCaptain
                                                                                                ? <span className="text-[10px] font-black bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded">小隊長</span>
                                                                                                : <span className="text-[10px] text-slate-700 px-1.5 py-0.5">學員</span>}
                                                                                        <span className="text-sm text-slate-200">{p.Name}</span>
                                                                                        <span className="text-[10px] text-slate-600">Lv.{p.Level}</span>
                                                                                    </div>
                                                                                    <button onClick={() => startEditMember(p)}
                                                                                        className="p-1.5 rounded-lg text-slate-600 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors">
                                                                                        <Pencil size={13} />
                                                                                    </button>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>

                    {/* 參與人員名單 */}
                    <section className="space-y-6">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                            <div className="flex items-center gap-2 text-violet-400 font-black text-sm uppercase tracking-widest">
                                <Users size={16} /> 參與人員名單（{leaderboard.length} 人）
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setAddMemberOpen(v => !v)}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-violet-600/20 hover:bg-violet-600/30 text-violet-400 text-xs font-black rounded-xl border border-violet-600/30 transition-colors"
                                >
                                    <Plus size={13} /> 新增人員
                                </button>
                                {filteredMembers.length > 0 && (
                                    <button onClick={downloadMembersCsv} className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-black rounded-xl transition-colors">
                                        ⬇️ 下載 Excel
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* 新增人員表單 */}
                        {addMemberOpen && (
                            <div className="bg-slate-900 border-2 border-violet-500/30 rounded-2xl p-5 space-y-4">
                                <p className="text-[10px] font-black text-violet-400 uppercase tracking-widest">新增人員</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-500 font-black uppercase">姓名（必填）</label>
                                        <input value={addMemberForm.name} onChange={e => setAddMemberForm(f => ({ ...f, name: e.target.value }))}
                                            placeholder="王小明"
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-bold outline-none focus:border-violet-500" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-500 font-black uppercase">手機號碼（必填，作為登入 ID）</label>
                                        <input value={addMemberForm.phone} onChange={e => setAddMemberForm(f => ({ ...f, phone: e.target.value }))}
                                            placeholder="0912345678"
                                            inputMode="numeric"
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-bold outline-none focus:border-violet-500" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-500 font-black uppercase">Email（選填）</label>
                                        <input value={addMemberForm.email} onChange={e => setAddMemberForm(f => ({ ...f, email: e.target.value }))}
                                            placeholder="user@example.com" type="email"
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-bold outline-none focus:border-violet-500" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-500 font-black uppercase">角色</label>
                                        <div className="flex gap-2">
                                            <select value={addMemberForm.role} onChange={e => setAddMemberForm(f => ({ ...f, role: e.target.value }))}
                                                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-bold outline-none focus:border-violet-500 [color-scheme:dark]">
                                                {Object.keys(ROLE_CURE_MAP).map(r => <option key={r} value={r}>{r}</option>)}
                                            </select>
                                            <button type="button"
                                                onClick={() => {
                                                    const roles = Object.keys(ROLE_CURE_MAP);
                                                    const pick = roles[Math.floor(Math.random() * roles.length)];
                                                    setAddMemberForm(f => ({ ...f, role: pick }));
                                                }}
                                                className="px-3 py-2 bg-slate-700 hover:bg-violet-700 text-slate-300 hover:text-white text-xs font-black rounded-xl border border-slate-600 transition-colors shrink-0"
                                                title="隨機選角色"
                                            >
                                                🎲
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-500 font-black uppercase">大隊</label>
                                        <input list="add-member-team-opts" value={addMemberForm.teamName} onChange={e => setAddMemberForm(f => ({ ...f, teamName: e.target.value }))}
                                            placeholder="第一大隊"
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-bold outline-none focus:border-violet-500" />
                                        <datalist id="add-member-team-opts">
                                            {allTeamNames.map(t => <option key={t} value={t}>{formatTeamLabel(t)}</option>)}
                                        </datalist>
                                    </div>
                                    {!addMemberForm.isCommandant && (
                                        <div className="space-y-1">
                                            <label className="text-[10px] text-slate-500 font-black uppercase">小隊</label>
                                            <input list="add-member-squad-opts" value={addMemberForm.squadName} onChange={e => setAddMemberForm(f => ({ ...f, squadName: e.target.value }))}
                                                placeholder="第一小隊"
                                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-bold outline-none focus:border-violet-500" />
                                            <datalist id="add-member-squad-opts">
                                                {allSquadNames.map(s => <option key={s} value={s}>{formatSquadLabel(s)}</option>)}
                                            </datalist>
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-4 flex-wrap">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={addMemberForm.isCaptain}
                                            onChange={e => setAddMemberForm(f => ({ ...f, isCaptain: e.target.checked, isCommandant: e.target.checked ? false : f.isCommandant }))}
                                            className="accent-cyan-500 w-4 h-4" />
                                        <span className="text-xs font-bold text-slate-300">小隊長</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={addMemberForm.isCommandant}
                                            onChange={e => setAddMemberForm(f => ({ ...f, isCommandant: e.target.checked, isCaptain: e.target.checked ? false : f.isCaptain, squadName: e.target.checked ? '' : f.squadName }))}
                                            className="accent-amber-500 w-4 h-4" />
                                        <span className="text-xs font-bold text-slate-300">大隊長</span>
                                    </label>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={handleAddMember} disabled={addMemberSaving || !addMemberForm.name.trim() || !addMemberForm.phone.trim()}
                                        className="flex-1 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-black rounded-xl disabled:opacity-40 transition-colors">
                                        {addMemberSaving ? '新增中…' : '✅ 新增人員'}
                                    </button>
                                    <button onClick={() => setAddMemberOpen(false)}
                                        className="px-4 py-2 bg-slate-800 text-slate-400 text-xs font-bold rounded-xl hover:text-white transition-colors">
                                        取消
                                    </button>
                                </div>
                            </div>
                        )}
                        <div className="bg-slate-900 border-2 border-violet-500/20 rounded-4xl shadow-xl overflow-hidden">
                            <div className="p-5 border-b border-slate-800 flex gap-2 flex-wrap">
                                <input type="text" placeholder="搜尋姓名 / 大隊 / 小隊..." value={memberFilter}
                                    onChange={e => setMemberFilter(e.target.value)}
                                    className="flex-1 min-w-[160px] bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs font-bold outline-none focus:border-violet-500" />
                                <select value={memberTeamFilter} onChange={e => setMemberTeamFilter(e.target.value)}
                                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs font-bold outline-none focus:border-violet-500 [color-scheme:dark]">
                                    <option value="">全部大隊</option>
                                    {allTeams.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                                {(memberFilter || memberTeamFilter) && (
                                    <button onClick={() => { setMemberFilter(''); setMemberTeamFilter(''); }}
                                        className="px-3 py-2 bg-slate-800 text-slate-400 rounded-xl text-xs font-bold hover:text-white transition-colors">
                                        清除
                                    </button>
                                )}
                                {filteredMembers.length !== leaderboard.length && (
                                    <p className="text-xs text-violet-400 font-bold self-center">篩選後 {filteredMembers.length} 人</p>
                                )}
                            </div>
                            <div className="overflow-auto max-h-[500px]">
                                <table className="w-full text-xs min-w-[600px]">
                                    <thead className="sticky top-0 bg-slate-900 z-10">
                                        <tr className="border-b border-slate-800">
                                            <th className="text-left px-4 py-3 text-slate-500 font-black w-8">#</th>
                                            {([
                                                { key: 'Name', label: '姓名' },
                                                { key: 'TeamName', label: '大隊' },
                                                { key: 'SquadName', label: '小隊' },
                                                { key: 'Level', label: '等級' },
                                                { key: 'Exp', label: '修為' },
                                                { key: 'Streak', label: '連勝' },
                                                { key: 'TotalFines', label: '罰金餘額' },
                                            ] as { key: MemberSortKey; label: string }[]).map(col => (
                                                <th key={col.key} onClick={() => handleMemberSort(col.key)}
                                                    className="text-left px-4 py-3 text-slate-500 font-black cursor-pointer hover:text-white transition-colors select-none">
                                                    {col.label}
                                                    {memberSort.key === col.key && <span className="ml-1 text-violet-400">{memberSort.dir === 'asc' ? '↑' : '↓'}</span>}
                                                </th>
                                            ))}
                                            <th className="text-left px-4 py-3 text-slate-500 font-black">職位</th>
                                            <th className="px-4 py-3 w-16"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/60">
                                        {filteredMembers.length === 0 ? (
                                            <tr><td colSpan={10} className="text-center py-8 text-slate-500">無符合條件的成員</td></tr>
                                        ) : filteredMembers.map((p, i) => {
                                            const fineBalance = p.TotalFines - p.FinePaid;
                                            return (
                                                <tr key={p.UserID} className="hover:bg-white/5 transition-colors">
                                                    <td className="px-4 py-3 text-slate-600">{i + 1}</td>
                                                    <td className="px-4 py-3 font-bold text-white">{p.Name}</td>
                                                    <td className="px-4 py-3 text-slate-300">{p.TeamName ?? '—'}</td>
                                                    <td className="px-4 py-3 text-slate-300">{p.SquadName ?? '—'}</td>
                                                    <td className="px-4 py-3 text-slate-400">Lv.{p.Level}</td>
                                                    <td className="px-4 py-3 text-orange-400 font-bold">{p.Exp.toLocaleString()}</td>
                                                    <td className="px-4 py-3 text-slate-300">{p.Streak}</td>
                                                    <td className="px-4 py-3">
                                                        {fineBalance > 0
                                                            ? <span className="text-red-400 font-bold">NT${fineBalance}</span>
                                                            : <span className="text-slate-600">—</span>}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {p.IsCommandant
                                                            ? <span className="text-[10px] font-black bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-lg">大隊長</span>
                                                            : p.IsCaptain
                                                                ? <span className="text-[10px] font-black bg-violet-500/20 text-violet-400 px-2 py-0.5 rounded-lg">小隊長</span>
                                                                : <span className="text-[10px] text-slate-600">學員</span>}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <button onClick={() => setMemberDetailTarget(p)}
                                                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 text-[10px] font-black transition-colors">
                                                            詳情 <ChevronRight size={11} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>

                </>)}

                {/* ══ 人員詳情 Modal ══ */}
                {memberDetailTarget && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in"
                        onClick={() => setMemberDetailTarget(null)}>
                        <div className="bg-slate-900 border border-slate-700 rounded-4xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl"
                            onClick={e => e.stopPropagation()}>

                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-slate-800 shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow">
                                        {memberDetailTarget.Name[0]}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-lg font-black text-white">{memberDetailTarget.Name}</h3>
                                            {memberDetailTarget.IsCommandant && <span className="text-[10px] font-black bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-lg">大隊長</span>}
                                            {memberDetailTarget.IsCaptain && !memberDetailTarget.IsCommandant && <span className="text-[10px] font-black bg-violet-500/20 text-violet-400 px-2 py-0.5 rounded-lg">小隊長</span>}
                                            {memberDetailTarget.IsGM && <span className="text-[10px] font-black bg-red-500/20 text-red-400 px-2 py-0.5 rounded-lg">GM</span>}
                                        </div>
                                        <p className="text-xs text-slate-400">{memberDetailTarget.Role} · {memberDetailTarget.TeamName ?? '—'} / {memberDetailTarget.SquadName ?? '—'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            startEditMember(memberDetailTarget);
                                        }}
                                        className="flex items-center gap-1.5 px-3 py-2 bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600/30 rounded-xl text-xs font-black transition-colors border border-cyan-600/30"
                                    >
                                        <Pencil size={13} /> 編輯
                                    </button>
                                    <button onClick={() => setMemberDetailTarget(null)} className="p-2 bg-slate-800 rounded-xl text-slate-400 hover:text-white"><X size={18} /></button>
                                </div>
                            </div>

                            {/* Body */}
                            <div className="overflow-y-auto flex-1 p-6 space-y-6">
                                {/* 修行數值 */}
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">修行數值</p>
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                        {[
                                            { label: '等級', value: `Lv.${memberDetailTarget.Level}`, color: 'text-yellow-400' },
                                            { label: '修為', value: memberDetailTarget.Exp.toLocaleString(), color: 'text-orange-400' },
                                            { label: '金幣', value: memberDetailTarget.Coins, color: 'text-yellow-500' },
                                            { label: '戰鬥金幣', value: memberDetailTarget.GameGold ?? 0, color: 'text-emerald-400' },
                                            { label: '連勝', value: `${memberDetailTarget.Streak} 天`, color: 'text-sky-400' },
                                            { label: '能量骰', value: memberDetailTarget.EnergyDice, color: 'text-indigo-400' },
                                            { label: '黃金骰', value: memberDetailTarget.GoldenDice ?? 0, color: 'text-amber-400' },
                                            { label: '難度', value: memberDetailTarget.DDA_Difficulty ?? 'normal', color: 'text-slate-300' },
                                        ].map(({ label, value, color }) => (
                                            <div key={label} className="bg-slate-800 rounded-2xl p-3 text-center">
                                                <p className="text-[10px] text-slate-500 font-bold mb-1">{label}</p>
                                                <p className={`text-sm font-black ${color}`}>{value}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* 五行屬性 */}
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">五行屬性</p>
                                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                        {[
                                            { label: '靈性', value: memberDetailTarget.Spirit },
                                            { label: '體魄', value: memberDetailTarget.Physique },
                                            { label: '魅力', value: memberDetailTarget.Charisma },
                                            { label: '悟性', value: memberDetailTarget.Savvy },
                                            { label: '福緣', value: memberDetailTarget.Luck },
                                            { label: '潛力', value: memberDetailTarget.Potential },
                                        ].map(({ label, value }) => (
                                            <div key={label} className="bg-slate-800 rounded-2xl p-3 text-center">
                                                <p className="text-[10px] text-slate-500 font-bold mb-1">{label}</p>
                                                <p className="text-sm font-black text-white">{value}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* 地圖 & 戰鬥 */}
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">地圖 & 戰鬥</p>
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                        {[
                                            { label: 'HP', value: `${memberDetailTarget.HP ?? '—'} / ${memberDetailTarget.MaxHP ?? '—'}` },
                                            { label: '座標 Q', value: memberDetailTarget.CurrentQ },
                                            { label: '座標 R', value: memberDetailTarget.CurrentR },
                                            { label: '朝向', value: memberDetailTarget.Facing ?? '—' },
                                        ].map(({ label, value }) => (
                                            <div key={label} className="bg-slate-800 rounded-2xl p-3 text-center">
                                                <p className="text-[10px] text-slate-500 font-bold mb-1">{label}</p>
                                                <p className="text-sm font-black text-slate-200">{String(value)}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* 財務 */}
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">財務</p>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="bg-slate-800 rounded-2xl p-3 text-center">
                                            <p className="text-[10px] text-slate-500 font-bold mb-1">總罰金</p>
                                            <p className="text-sm font-black text-red-400">NT${memberDetailTarget.TotalFines}</p>
                                        </div>
                                        <div className="bg-slate-800 rounded-2xl p-3 text-center">
                                            <p className="text-[10px] text-slate-500 font-bold mb-1">已繳金額</p>
                                            <p className="text-sm font-black text-emerald-400">NT${memberDetailTarget.FinePaid}</p>
                                        </div>
                                        <div className="bg-slate-800 rounded-2xl p-3 text-center">
                                            <p className="text-[10px] text-slate-500 font-bold mb-1">未繳餘額</p>
                                            <p className={`text-sm font-black ${memberDetailTarget.TotalFines - memberDetailTarget.FinePaid > 0 ? 'text-red-400' : 'text-slate-500'}`}>
                                                NT${memberDetailTarget.TotalFines - memberDetailTarget.FinePaid}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* 道具 */}
                                {(memberDetailTarget.Inventory?.length > 0 || (memberDetailTarget.GameInventory?.length ?? 0) > 0) && (
                                    <div>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">道具</p>
                                        <div className="space-y-2">
                                            {memberDetailTarget.Inventory?.length > 0 && (
                                                <div className="flex flex-wrap gap-2">
                                                    {memberDetailTarget.Inventory.map(id => {
                                                        const art = ARTIFACTS_CONFIG.find(a => a.id === id);
                                                        return (
                                                            <span key={id} className="text-[10px] font-black bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2.5 py-1.5 rounded-xl">
                                                                {art ? art.name : id}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                            {(memberDetailTarget.GameInventory?.length ?? 0) > 0 && (
                                                <div className="flex flex-wrap gap-2">
                                                    {memberDetailTarget.GameInventory!.map(({ id, count }) => (
                                                        <span key={id} className="text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1.5 rounded-xl">
                                                            {id} ×{count}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* 帳號資訊 */}
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">帳號資訊</p>
                                    <div className="bg-slate-800 rounded-2xl p-4 space-y-2 text-xs">
                                        {[
                                            { label: 'UserID', value: memberDetailTarget.UserID },
                                            { label: 'Email', value: memberDetailTarget.Email ?? '—' },
                                            { label: 'LINE ID', value: memberDetailTarget.LineUserId ?? '未綁定' },
                                            { label: '生日', value: memberDetailTarget.Birthday ?? '—' },
                                            { label: '最後打卡', value: memberDetailTarget.LastCheckIn ? new Date(memberDetailTarget.LastCheckIn).toLocaleString('zh-TW') : '—' },
                                        ].map(({ label, value }) => (
                                            <div key={label} className="flex items-start gap-3">
                                                <span className="text-slate-500 font-bold w-20 shrink-0">{label}</span>
                                                <span className="text-slate-300 font-mono break-all">{value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* ── 編輯表單 ── */}
                                {editingMemberId === memberDetailTarget.UserID && (
                                    <div className="border-t border-slate-700 pt-4 space-y-3">
                                        <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">編輯人員資料</p>
                                        <div className={`grid gap-3 ${memberEditForm.isCommandant ? 'grid-cols-1' : 'grid-cols-2'}`}>
                                            <div className="space-y-1">
                                                <label className="text-[10px] text-slate-500 font-black uppercase">大隊</label>
                                                <input list="detail-team-options" value={memberEditForm.teamName}
                                                    onChange={e => setMemberEditForm(f => ({ ...f, teamName: e.target.value }))}
                                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-bold outline-none focus:border-cyan-500" />
                                                <datalist id="detail-team-options">
                                                    {allTeamNames.map(s => <option key={s} value={s}>{formatTeamLabel(s)}</option>)}
                                                </datalist>
                                            </div>
                                            {!memberEditForm.isCommandant && (
                                                <div className="space-y-1">
                                                    <label className="text-[10px] text-slate-500 font-black uppercase">小隊</label>
                                                    <input list="detail-squad-options" value={memberEditForm.squadName}
                                                        onChange={e => setMemberEditForm(f => ({ ...f, squadName: e.target.value }))}
                                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-bold outline-none focus:border-cyan-500" />
                                                    <datalist id="detail-squad-options">
                                                        {allSquadNames.map(s => <option key={s} value={s}>{formatSquadLabel(s)}</option>)}
                                                    </datalist>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-4 flex-wrap">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="checkbox" checked={memberEditForm.isCaptain}
                                                    onChange={e => setMemberEditForm(f => ({ ...f, isCaptain: e.target.checked, isCommandant: e.target.checked ? false : f.isCommandant }))}
                                                    className="accent-cyan-500 w-4 h-4" />
                                                <span className="text-xs font-bold text-slate-300">小隊長</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="checkbox" checked={memberEditForm.isCommandant}
                                                    onChange={e => setMemberEditForm(f => ({ ...f, isCommandant: e.target.checked, isCaptain: e.target.checked ? false : f.isCaptain, squadName: e.target.checked ? '' : f.squadName }))}
                                                    className="accent-amber-500 w-4 h-4" />
                                                <span className="text-xs font-bold text-slate-300">大隊長</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="checkbox" checked={memberEditForm.isGM}
                                                    onChange={e => setMemberEditForm(f => ({ ...f, isGM: e.target.checked }))}
                                                    className="accent-red-500 w-4 h-4" />
                                                <span className="text-xs font-bold text-red-400">GM 模式</span>
                                            </label>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={async () => { await saveMemberEdit(); setMemberDetailTarget(null); }} disabled={memberSaving}
                                                className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black rounded-xl disabled:opacity-50 transition-colors">
                                                {memberSaving ? '儲存中…' : '✅ 儲存'}
                                            </button>
                                            <button onClick={() => setEditingMemberId(null)}
                                                className="px-4 py-2 bg-slate-800 text-slate-400 text-xs font-bold rounded-xl hover:text-white transition-colors">
                                                取消
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ══ 課程管理模組 ══ */}
                {adminModule === 'course' && (<>

                    {/* 志工掃碼授權 */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-2 text-teal-500 font-black text-sm uppercase tracking-widest"><QrCode size={16} /> 志工掃碼授權</div>
                        <div className="bg-slate-900 border-2 border-teal-500/20 p-8 rounded-4xl space-y-5 shadow-xl">
                            <p className="text-xs text-slate-400">
                                志工掃碼密碼為 6 位數字，每天凌晨 12 點自動更新。手動更新後，已登入的志工將立即被登出。
                            </p>

                            {/* 目前密碼顯示 */}
                            <div className="flex items-center gap-4 bg-slate-950 border border-teal-500/30 rounded-2xl p-4">
                                <div className="flex-1">
                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">目前密碼</p>
                                    <p className="text-3xl font-black text-teal-300 tracking-[0.3em] font-mono">
                                        {systemSettings.VolunteerPassword || '——'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        const newPwd = String(Math.floor(100000 + Math.random() * 900000));
                                        updateGlobalSetting('VolunteerPassword', newPwd);
                                    }}
                                    className="flex items-center gap-2 px-4 py-3 bg-teal-600 hover:bg-teal-500 active:scale-95 text-white text-xs font-black rounded-2xl transition-all shrink-0"
                                >
                                    🎲 手動更新
                                </button>
                            </div>
                            <p className="text-[10px] text-slate-600 text-center">自動輪換：每日 00:00（台灣時間）</p>

                            {/* 自訂密碼（進階） */}
                            <details className="group">
                                <summary className="text-[10px] text-slate-600 hover:text-slate-400 cursor-pointer font-black uppercase tracking-widest">▶ 自訂密碼（進階）</summary>
                                <div className="flex gap-2 mt-3">
                                    <input type="text" value={volunteerPwd} onChange={e => { setVolunteerPwd(e.target.value); setVolPwdSaved(false); }}
                                        placeholder="輸入自訂密碼"
                                        className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white text-sm font-bold outline-none focus:border-teal-500" />
                                    <button onClick={() => { if (!volunteerPwd.trim()) return; updateGlobalSetting('VolunteerPassword', volunteerPwd.trim()); setVolPwdSaved(true); }}
                                        disabled={!volunteerPwd.trim()} className="bg-teal-600 px-5 rounded-2xl text-white font-black hover:bg-teal-500 transition-colors disabled:opacity-40">
                                        <Save size={16} />
                                    </button>
                                </div>
                                {volPwdSaved && <p className="text-xs text-teal-400 font-bold text-center mt-2">✅ 已儲存</p>}
                            </details>
                        </div>
                    </section>

                    {/* 課程管理 */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-2 text-amber-500 font-black text-sm uppercase tracking-widest">
                            <BookOpen size={16} /> 課程管理
                        </div>
                        <div className="bg-slate-900 border-2 border-amber-500/20 p-8 rounded-4xl space-y-6 shadow-xl">
                            <form onSubmit={handleCourseSubmit} className="space-y-4">
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                                    {editingCourseId ? `✏️ 編輯課程：${editingCourseId}` : '➕ 新增課程'}
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <input required placeholder="課程代碼（唯一，如 class_d）" value={courseForm.id} disabled={!!editingCourseId}
                                        onChange={e => setCourseForm(f => ({ ...f, id: e.target.value.trim() }))}
                                        className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold outline-none focus:border-amber-500 disabled:opacity-40" />
                                    <input required placeholder="課程名稱（如 課後課）" value={courseForm.name}
                                        onChange={e => setCourseForm(f => ({ ...f, name: e.target.value }))}
                                        className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold outline-none focus:border-amber-500" />
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">日期</label>
                                        <input type="date" required value={courseForm.date} onChange={e => setCourseForm(f => ({ ...f, date: e.target.value }))}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold outline-none focus:border-amber-500 [color-scheme:dark]" />
                                        {courseForm.date && <p className="text-[10px] text-amber-400 font-bold px-1">{genDateDisplay(courseForm.date)}</p>}
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">時間區間</label>
                                        <div className="flex items-center gap-2">
                                            <input type="time" required value={courseForm.startTime} onChange={e => setCourseForm(f => ({ ...f, startTime: e.target.value }))}
                                                className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold outline-none focus:border-amber-500 [color-scheme:dark]" />
                                            <span className="text-slate-500 font-black">–</span>
                                            <input type="time" value={courseForm.endTime} onChange={e => setCourseForm(f => ({ ...f, endTime: e.target.value }))}
                                                className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold outline-none focus:border-amber-500 [color-scheme:dark]" />
                                        </div>
                                    </div>
                                    <input required placeholder="地點名稱（如 Ticc 國際會議中心 201室）" value={courseForm.location}
                                        onChange={e => setCourseForm(f => ({ ...f, location: e.target.value }))}
                                        className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold outline-none focus:border-amber-500" />
                                    <input placeholder="詳細地址（選填，如 台北市中山區…）" value={courseForm.address}
                                        onChange={e => setCourseForm(f => ({ ...f, address: e.target.value }))}
                                        className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold outline-none focus:border-amber-500" />
                                    <input type="number" placeholder="排序（數字越小越前面）" value={courseForm.sort_order}
                                        onChange={e => setCourseForm(f => ({ ...f, sort_order: Number(e.target.value) }))}
                                        className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold outline-none focus:border-amber-500" />
                                </div>
                                <div className="flex gap-3">
                                    {editingCourseId && (
                                        <button type="button" onClick={() => { setCourseForm(emptyCourseForm); setEditingCourseId(null); }}
                                            className="px-6 py-3 bg-slate-800 text-slate-300 rounded-2xl font-black text-sm">取消</button>
                                    )}
                                    <button type="submit" disabled={courseSubmitting}
                                        className="flex-1 bg-amber-600 p-4 rounded-2xl text-white font-black shadow-lg hover:bg-amber-500 transition-colors disabled:opacity-50">
                                        {courseSubmitting ? '儲存中...' : editingCourseId ? '💾 更新課程' : '➕ 新增課程'}
                                    </button>
                                </div>
                            </form>
                            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                                {courses.length === 0 && <p className="text-xs text-slate-500 text-center py-4">尚無課程</p>}
                                {courses.map(c => (
                                    <div key={c.id} className="flex justify-between items-start bg-slate-950 p-4 rounded-2xl border border-slate-800 gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-black text-white">{c.name}</span>
                                                <span className="text-[10px] font-mono text-slate-500">{c.id}</span>
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${c.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-500'}`}>
                                                    {c.is_active ? '開放' : '關閉'}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-400 mt-1">{c.date_display}・{c.time}</p>
                                            <p className="text-xs text-slate-500">{c.location}{c.address ? `・${c.address}` : ''}</p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <button onClick={() => { setRegModalCourse(c); loadRegList(c.id); }}
                                                className="px-3 py-1.5 rounded-xl bg-sky-700 hover:bg-sky-600 text-white text-xs font-black transition-colors">報名名單</button>
                                            <button onClick={() => onUpsertCourse({ ...c, is_active: !c.is_active })}
                                                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-amber-400 transition-colors">
                                                {c.is_active ? <ToggleRight size={16} className="text-emerald-400" /> : <ToggleLeft size={16} />}
                                            </button>
                                            <button onClick={() => handleEditCourse(c)} className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-amber-400 transition-colors"><Pencil size={15} /></button>
                                            <button onClick={() => onDeleteCourse(c.id)} className="p-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"><X size={15} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                </>)}

                {/* ══ 任務管理模組 ══ */}
                {adminModule === 'quest' && (<>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <section className="space-y-6">
                            <div className="flex items-center gap-2 text-orange-500 font-black text-sm uppercase tracking-widest"><BarChart3 size={16} /> 全域修行設定</div>
                            <div className="bg-slate-900 border-2 border-slate-800 p-6 rounded-4xl space-y-5 shadow-xl">
                                <p className="text-xs font-black text-yellow-500 uppercase tracking-widest">⚔️ 當前主線任務</p>
                                <div className="space-y-3">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">任務名稱</label>
                                        <input
                                            value={mqTitle}
                                            onChange={e => setMqTitle(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-bold outline-none focus:border-yellow-500 text-sm"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1"><Zap size={10} /> 修為獎勵</label>
                                            <input type="number" value={mqReward} onChange={e => setMqReward(e.target.value)}
                                                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-bold outline-none focus:border-yellow-500 text-sm text-center" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">🪙 金幣獎勵</label>
                                            <input type="number" value={mqCoins} onChange={e => setMqCoins(e.target.value)}
                                                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-bold outline-none focus:border-yellow-500 text-sm text-center" />
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => updateGlobalSettings({ TopicQuestTitle: mqTitle, TopicQuestReward: mqReward, TopicQuestCoins: mqCoins })}
                                        className="w-full flex items-center justify-center gap-2 bg-yellow-500 text-slate-950 p-3 rounded-2xl font-black text-sm shadow-lg hover:bg-yellow-400 transition-colors">
                                        <Save size={15} /> 儲存當前主線任務
                                    </button>
                                </div>
                                {topicHistory.length > 0 && (
                                    <div className="bg-slate-950/50 rounded-2xl border border-white/5 overflow-hidden">
                                        <div className="p-2.5 bg-slate-900 border-b border-white/5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">歷史主題紀錄</div>
                                        <div className="max-h-28 overflow-y-auto divide-y divide-white/5">
                                            {topicHistory.map(h => (
                                                <div key={h.id} className="px-3 py-2 text-xs flex justify-between items-center text-slate-300">
                                                    <span>{h.TopicTitle}</span>
                                                    <span className="text-[10px] text-slate-600">{new Date(h.created_at).toLocaleDateString('zh-TW')}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>
                        <section className="space-y-6">
                            <div className="flex items-center gap-2 text-orange-500 font-black text-sm uppercase tracking-widest"><Settings size={16} /> 動態難度與共業系統 (DDA)</div>
                            <div className="bg-slate-900 border-2 border-slate-800 p-8 rounded-4xl space-y-6 shadow-xl text-center">
                                <div className="space-y-2">
                                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest">目前共業狀態</p>
                                    <p className="text-xl font-bold text-white">{systemSettings.WorldState || 'normal'}</p>
                                    <p className="text-xs text-slate-400 mt-2">{systemSettings.WorldStateMsg || '環境保持平衡。'}</p>
                                </div>
                                <button onClick={onTriggerSnapshot} className="w-full bg-blue-600 p-4 rounded-2xl text-white font-black shadow-lg hover:bg-blue-500 transition-colors">🔄 執行每週業力結算 (Weekly Snapshot)</button>
                                <button onClick={onCheckW3Compliance} className="w-full bg-red-700 p-4 rounded-2xl text-white font-black shadow-lg hover:bg-red-600 transition-colors">⚖️ 執行 w3 週罰款結算（未完成者 +NT$200）</button>
                                <button onClick={onAutoDrawAllSquads} className="w-full bg-indigo-600 p-4 rounded-2xl text-white font-black shadow-lg hover:bg-indigo-500 transition-colors">🎲 全服自動抽籤（為未抽小隊代選本週定課）</button>
                            </div>
                        </section>
                    </div>

                    {/* ── 主線任務列表 ── */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-2 text-yellow-500 font-black text-sm uppercase tracking-widest"><Calendar size={16} /> 主線任務排程列表</div>
                        <div className="bg-slate-900 border-2 border-yellow-500/20 p-6 rounded-4xl space-y-6 shadow-xl">
                            {/* 現有排程列表 */}
                            {mainQuestSchedule.length > 0 ? (
                                <div className="space-y-2">
                                    {mainQuestSchedule.map(entry => {
                                        const isActive = activeMqEntry?.id === entry.id;
                                        const isPast = entry.startDate <= today;
                                        return (
                                            <div key={entry.id} className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${isActive ? 'border-yellow-500/60 bg-yellow-500/10' : isPast ? 'border-slate-700 bg-slate-800/50 opacity-60' : 'border-slate-700 bg-slate-800/50'}`}>
                                                <div className="text-xs font-black text-slate-400 w-24 shrink-0">{entry.startDate}</div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-white truncate">{entry.title}</p>
                                                    <p className="text-[10px] text-slate-400">+{entry.reward} 修為 · +{entry.coins} 🪙</p>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    {isActive && <span className="text-[10px] font-black text-yellow-400 bg-yellow-500/20 px-2 py-0.5 rounded-lg">當前</span>}
                                                    {!isActive && (
                                                        <button onClick={() => handleApplyMqEntry(entry)}
                                                            className="text-[10px] font-black text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 px-2 py-1 rounded-lg transition-colors">
                                                            套用
                                                        </button>
                                                    )}
                                                    <button onClick={() => handleRemoveMqEntry(entry.id)}
                                                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-500 text-center py-4">尚無排程。新增後系統將依開始日期自動切換。</p>
                            )}
                            {/* 新增排程 */}
                            <div className="border-t border-slate-800 pt-5 space-y-3">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">新增排程</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="col-span-2 space-y-1">
                                        <label className="text-[10px] text-slate-500 font-bold">任務名稱</label>
                                        <input value={mqFormEntry.title} onChange={e => setMqFormEntry(p => ({ ...p, title: e.target.value }))}
                                            placeholder="例：感恩修行實踐" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold outline-none focus:border-yellow-500 text-sm" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-500 font-bold">修為</label>
                                        <input type="number" value={mqFormEntry.reward} onChange={e => setMqFormEntry(p => ({ ...p, reward: e.target.value }))}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold outline-none focus:border-yellow-500 text-sm text-center" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-500 font-bold">金幣</label>
                                        <input type="number" value={mqFormEntry.coins} onChange={e => setMqFormEntry(p => ({ ...p, coins: e.target.value }))}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold outline-none focus:border-yellow-500 text-sm text-center" />
                                    </div>
                                    <div className="col-span-2 space-y-1">
                                        <label className="text-[10px] text-slate-500 font-bold flex items-center gap-1"><Calendar size={10} /> 開始日期（到期自動套用）</label>
                                        <input type="date" value={mqFormEntry.startDate} onChange={e => setMqFormEntry(p => ({ ...p, startDate: e.target.value }))}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold outline-none focus:border-yellow-500 text-sm" />
                                    </div>
                                </div>
                                <button onClick={handleAddMqEntry}
                                    disabled={!mqFormEntry.title.trim() || !mqFormEntry.startDate}
                                    className="w-full flex items-center justify-center gap-2 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-40 text-white p-3 rounded-2xl font-black text-sm shadow-lg transition-colors">
                                    <Plus size={15} /> 加入排程列表
                                </button>
                            </div>
                        </div>
                    </section>

                    <section className="space-y-6">
                        <div className="flex items-center gap-2 text-orange-500 font-black text-sm uppercase tracking-widest"><Settings size={16} /> 臨時加分任務管理</div>
                        <div className="bg-slate-900 border-2 border-slate-800 p-8 rounded-4xl space-y-6 shadow-xl">
                            <form onSubmit={(e) => {
                                e.preventDefault();
                                const fd = new FormData(e.currentTarget);
                                const title = fd.get('title') as string;
                                const sub = fd.get('sub') as string;
                                const desc = fd.get('desc') as string;
                                const reward = parseInt(fd.get('reward') as string, 10);
                                if (title && reward) { onAddTempQuest(title, sub, desc, reward); e.currentTarget.reset(); }
                            }} className="space-y-4">
                                <div className="grid grid-cols-1 gap-3">
                                    <input name="title" required placeholder="主標題（固定顯示：特殊仙緣任務）" className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold outline-none focus:border-orange-500" />
                                    <input name="sub" required placeholder="任務名稱（例：跟父母三道菜）" className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold outline-none focus:border-orange-500" />
                                    <input name="desc" placeholder="任務說明（例：面對面或是視訊）" className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold outline-none focus:border-orange-500" />
                                </div>
                                <div className="flex gap-4 items-center">
                                    <input name="reward" type="number" required defaultValue={500} placeholder="加分額度" className="w-32 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold text-center outline-none focus:border-orange-500" />
                                    <button type="submit" className="flex-1 bg-orange-600 p-4 rounded-2xl text-white font-black shadow-lg hover:bg-orange-500 transition-colors">➕ 新增臨時任務</button>
                                </div>
                            </form>
                            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                                {temporaryQuests.map(tq => (
                                    <div key={tq.id} className="flex justify-between items-center bg-slate-950 p-4 rounded-2xl border border-slate-800">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-slate-200">{tq.title}</h4>
                                                <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-lg">+{tq.reward}</span>
                                            </div>
                                            {tq.sub && <p className="text-xs text-orange-400 font-bold mt-1">{tq.sub}</p>}
                                            {tq.desc && <p className="text-xs text-slate-500 mt-0.5">{tq.desc}</p>}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button onClick={() => onToggleTempQuest(tq.id, !tq.active)}
                                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${tq.active ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/50' : 'bg-slate-800 text-slate-400'}`}>
                                                {tq.active ? '🟢 啟用中' : '🔴 已暫停'}
                                            </button>
                                            <button onClick={() => onDeleteTempQuest(tq.id)} className="p-2 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-colors"><X size={16} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                </>)}

                {/* ══ 參數管理模組 ══ */}
                {adminModule === 'params' && (<>
                    <BasicParamsSection systemSettings={systemSettings} updateGlobalSetting={updateGlobalSetting} />
                    <DailyQuestConfigSection />
                    <GameItemConfigSection />
                    <AchievementConfigSection />
                    <RoleConfigSection />
                    <QuestRoleSection />
                    <CardMottoSection />
                </>)}

                {/* ══ 圖片庫模組 ══ */}
                {adminModule === 'gallery' && <ImageGallerySection />}

                {/* 報名名單彈窗（固定，不受模組切換影響）*/}
                {regModalCourse && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in" onClick={() => setRegModalCourse(null)}>
                        <div className="bg-slate-900 border border-slate-700 rounded-4xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between p-6 border-b border-slate-800 shrink-0">
                                <div>
                                    <p className="text-[10px] text-sky-400 font-black uppercase tracking-widest">報名名單</p>
                                    <h3 className="text-lg font-black text-white">{regModalCourse.name}</h3>
                                    <p className="text-xs text-slate-400">{regModalCourse.date_display}・{regModalCourse.time}・{regModalCourse.location}</p>
                                </div>
                                <button onClick={() => setRegModalCourse(null)} className="p-2 bg-slate-800 rounded-xl text-slate-400 hover:text-white"><X size={18} /></button>
                            </div>
                            <div className="px-6 pt-4 pb-3 space-y-3 shrink-0">
                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                    <p className="text-xs font-black text-slate-400">
                                        共 {regList.length} 人報名・{regList.filter(r => r.attended).length} 人已報到
                                        {filteredRegList.length !== regList.length && <span className="text-sky-400 ml-2">（篩選後 {filteredRegList.length} 人）</span>}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        {regListLoading && <p className="text-xs text-sky-400 font-bold">載入中...</p>}
                                        {regList.length > 0 && !regListLoading && (
                                            <button onClick={downloadRegListCsv} className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-black rounded-xl transition-colors">⬇️ 下載 Excel</button>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                    <input type="text" placeholder="搜尋姓名 / 大隊 / 小隊..." value={regFilter}
                                        onChange={e => setRegFilter(e.target.value)}
                                        className="flex-1 min-w-[160px] bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs font-bold outline-none focus:border-sky-500" />
                                    {(['all', 'attended', 'not_attended'] as const).map(v => (
                                        <button key={v} onClick={() => setRegAttendFilter(v)}
                                            className={`px-3 py-2 rounded-xl text-xs font-black transition-colors ${regAttendFilter === v ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                                            {v === 'all' ? '全部' : v === 'attended' ? '✅ 已報到' : '⭕ 未報到'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="overflow-auto flex-1 px-6 pb-6">
                                {regList.length === 0 && !regListLoading ? (
                                    <p className="text-xs text-slate-500 text-center py-8">尚無報名紀錄</p>
                                ) : (
                                    <table className="w-full text-xs min-w-[680px]">
                                        <thead className="sticky top-0 bg-slate-900">
                                            <tr className="border-b border-slate-800">
                                                <th className="text-left px-3 py-2 text-slate-500 font-black w-6">#</th>
                                                {([
                                                    { key: 'teamName', label: '大隊' },
                                                    { key: 'squadName', label: '小隊' },
                                                    { key: 'userName', label: '姓名' },
                                                    { key: 'registeredAt', label: '報名時間' },
                                                    { key: 'attended', label: '報到狀態' },
                                                    { key: 'attendedAt', label: '報到時間' },
                                                ] as { key: RegSortKey; label: string }[]).map(col => (
                                                    <th key={col.key} onClick={() => handleRegSort(col.key)}
                                                        className="text-left px-3 py-2 text-slate-500 font-black cursor-pointer hover:text-white transition-colors select-none">
                                                        {col.label}{regSort.key === col.key && <span className="ml-1 text-sky-400">{regSort.dir === 'asc' ? '↑' : '↓'}</span>}
                                                    </th>
                                                ))}
                                                <th className="text-left px-3 py-2 text-slate-500 font-black">掃碼者</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800">
                                            {filteredRegList.length === 0 ? (
                                                <tr><td colSpan={8} className="text-center py-6 text-slate-500">無符合條件的紀錄</td></tr>
                                            ) : filteredRegList.map((r, i) => (
                                                <tr key={r.userId} className="hover:bg-white/5 transition-colors">
                                                    <td className="px-3 py-3 text-slate-600">{i + 1}</td>
                                                    <td className="px-3 py-3 text-slate-300">{r.teamName}</td>
                                                    <td className="px-3 py-3 text-slate-300">{r.squadName}</td>
                                                    <td className="px-3 py-3 font-bold text-white">{r.userName}</td>
                                                    <td className="px-3 py-3 text-slate-500">{new Date(r.registeredAt).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                                                    <td className="px-3 py-3">
                                                        <span className={`flex items-center gap-1 font-black ${r.attended ? 'text-emerald-400' : 'text-slate-600'}`}>
                                                            {r.attended ? <><CheckCircle size={13} /> 已報到</> : <><Circle size={13} /> 未報到</>}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-3 text-slate-400 font-mono">
                                                        {r.attendedAt
                                                            ? new Date(r.attendedAt).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
                                                            : <span className="text-slate-700">—</span>}
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        {r.checkedInBy
                                                            ? <span className="text-[10px] font-black bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded-lg">
                                                                {r.checkedInBy.startsWith('checkin-') ? `掃碼・${r.checkedInBy.replace('checkin-', '')}` : r.checkedInBy}
                                                              </span>
                                                            : <span className="text-slate-700">—</span>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>
                )}

            </div>
                </div>
            </div>
        </div>
    );
}
