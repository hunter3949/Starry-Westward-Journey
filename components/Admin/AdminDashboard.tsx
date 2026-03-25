import React from 'react';
import { Settings, X, BarChart3, Save, Users, Shield, Plus, Lock, QrCode, BookOpen, Pencil, ToggleLeft, ToggleRight, CheckCircle, Circle, ChevronRight, ChevronDown, Trophy, Image as ImageIcon, Upload, Trash2, Copy, FolderOpen, Download, Calendar, Zap, Search, LogIn, Tag, RefreshCw } from 'lucide-react';
import { SystemSettings, CharacterStats, TopicHistory, TemporaryQuest, W4Application, AdminLog, Testimony, Course, MainQuestEntry, BonusQuestRule, PeakTrial, PeakTrialRegistration, PeakTrialReview } from '@/types';
import { RankTab } from '@/components/Tabs/RankTab';
import { getCourseRegistrations } from '@/app/actions/course';
import { listPeakTrials, upsertPeakTrial, deletePeakTrial, togglePeakTrialActive, getPeakTrialRegistrations, markPeakTrialAttendance, listPeakTrialReviews, approvePeakTrialReview, rejectPeakTrialReview, recalcPeakTrialReview } from '@/app/actions/peakTrials';

import { ADMIN_PASSWORD, ARTIFACTS_CONFIG, ROLE_CURE_MAP } from '@/lib/constants';
import { logAdminAction, checkExistingRosterPhones } from '@/app/actions/admin';
import type { DailyQuestConfigRow, ArtifactConfigRow, AchievementConfigRow } from '@/app/actions/admin';

// ── 名冊預覽列型別 ───────────────────────────────────────────────────────────
interface ParsedRosterRow {
    rawPhone: string;
    userId: string;
    name: string;
    birthday: string;
    bigTeam: string;
    isCommandant: boolean;
    littleTeam: string;
    isCaptain: boolean;
    phoneError: string | null;   // 格式錯誤 → 該列匯入時將被跳過
    isDupInBatch: boolean;       // 批次內重複（同一電話出現多次）
    isDupInDb: boolean;          // DB 已存在（將覆蓋）
}

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

// ── 圖片庫選取器（用於 Logo / 卡背等圖片欄位）────────────────────────────
function GalleryPickerButton({ onSelect, label = '🖼 從圖片庫選取' }: { onSelect: (url: string) => void; label?: string }) {
    const [open, setOpen] = React.useState(false);
    const FOLDERS = ['gallery', 'quest-icons', 'artifacts'];
    const [folder, setFolder] = React.useState('gallery');
    const [files, setFiles] = React.useState<{ name: string; publicUrl: string }[]>([]);
    const [loading, setLoading] = React.useState(false);

    const load = React.useCallback(async (f: string) => {
        setLoading(true);
        const { listStorageFiles } = await import('@/app/actions/admin');
        const res = await listStorageFiles(f);
        setFiles(res.filter(x => /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(x.name)));
        setLoading(false);
    }, []);

    React.useEffect(() => { if (open) load(folder); }, [open, folder, load]);

    if (!open) return (
        <button type="button" onClick={() => setOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-black rounded-xl border border-slate-700 transition-colors">
            {label}
        </button>
    );

    return (
        <div className="bg-slate-900 border-2 border-slate-700 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex gap-1.5 flex-wrap">
                    {FOLDERS.map(f => (
                        <button key={f} type="button" onClick={() => { setFolder(f); load(f); }}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all ${folder === f ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
                            {f}
                        </button>
                    ))}
                </div>
                <button type="button" onClick={() => setOpen(false)} className="p-1 rounded-lg text-slate-500 hover:text-white transition-colors"><X size={14} /></button>
            </div>
            {loading ? (
                <p className="text-xs text-slate-500 text-center py-4">載入中…</p>
            ) : files.length === 0 ? (
                <p className="text-xs text-slate-600 text-center py-4">此資料夾無圖片</p>
            ) : (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto">
                    {files.map(f => (
                        <button key={f.publicUrl} type="button" onClick={() => { onSelect(f.publicUrl); setOpen(false); }}
                            className="aspect-square rounded-xl overflow-hidden border-2 border-transparent hover:border-orange-500 transition-all">
                            <img src={f.publicUrl} alt={f.name} className="w-full h-full object-cover" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── 定課管理元件 ──────────────────────────────────────────────────────────

const EMPTY_QUEST_FORM: Omit<DailyQuestConfigRow, 'created_at'> = {
    id: '', title: '', sub: '', desc: '', reward: 100, coins: null, dice: 1, icon: '', limit: null, sort_order: 0, is_active: true,
};

function DailyQuestConfigSection() {
    const [collapsed, setCollapsed] = React.useState(true);
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
            {/* 可收折標題列 */}
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

// ── 加分副本管理 ─────────────────────────────────────────────────────────────

const DEFAULT_BONUS_RULES: BonusQuestRule[] = [
    { id: 'b1', label: '家人互動親證', keywords: ['小天使通話', '與家人互動', '親證圓夢'], bonusType: 'energy_dice', bonusAmount: 1, active: true },
    { id: 'b2', label: '參加心成活動', keywords: ['心成', '同學會', '定聚'], bonusType: 'energy_dice', bonusAmount: 2, active: true },
    { id: 'b3', label: '傳愛分數', keywords: ['傳愛'], bonusType: 'energy_dice', bonusAmount: 1, active: true },
    { id: 'b4', label: '大會主題活動', keywords: ['主題親證', '會長交接', '大會'], bonusType: 'golden_dice', bonusAmount: 1, active: true },
];

function BonusQuestConfigSection({ systemSettings, updateGlobalSetting }: { systemSettings: SystemSettings; updateGlobalSetting: (key: string, value: string) => void }) {
    const [collapsed, setCollapsed] = React.useState(true);
    const [editingId, setEditingId] = React.useState<string | null>(null);
    const [formOpen, setFormOpen] = React.useState(false);
    const [form, setForm] = React.useState<BonusQuestRule>({ id: '', label: '', keywords: [], bonusType: 'energy_dice', bonusAmount: 1, active: true });
    const [keywordsStr, setKeywordsStr] = React.useState('');

    const rules: BonusQuestRule[] = React.useMemo(() => {
        try { return JSON.parse(systemSettings.BonusQuestConfig ?? '[]'); } catch { return DEFAULT_BONUS_RULES; }
    }, [systemSettings.BonusQuestConfig]);

    const save = (updated: BonusQuestRule[]) => updateGlobalSetting('BonusQuestConfig', JSON.stringify(updated));

    const openNew = () => {
        setForm({ id: `b${Date.now()}`, label: '', keywords: [], bonusType: 'energy_dice' as const, bonusAmount: 1, active: true });
        setKeywordsStr('');
        setEditingId(null);
        setFormOpen(true);
    };

    const openEdit = (r: BonusQuestRule) => {
        setForm({ ...r });
        setKeywordsStr(r.keywords.join('、'));
        setEditingId(r.id);
        setFormOpen(true);
    };

    const handleSave = () => {
        const kws = keywordsStr.split(/[,、，]/).map(k => k.trim()).filter(Boolean);
        if (!form.label.trim() || kws.length === 0) return;
        const updated = { ...form, keywords: kws };
        const newRules = editingId
            ? rules.map(r => r.id === editingId ? updated : r)
            : [...rules, updated];
        save(newRules);
        setFormOpen(false);
    };

    const handleDelete = (id: string) => {
        save(rules.filter(r => r.id !== id));
    };

    const handleToggle = (id: string) => {
        save(rules.map(r => r.id === id ? { ...r, active: !r.active } : r));
    };

    const handleSeedDefaults = () => {
        if (!confirm('將重置為預設的加分副本規則（覆蓋現有設定）。確定執行？')) return;
        save(DEFAULT_BONUS_RULES);
    };

    return (
        <section className="space-y-4">
            <button onClick={() => setCollapsed(v => !v)}
                className="flex items-center gap-2 text-orange-400 font-black text-sm uppercase tracking-widest w-full text-left">
                <span className="text-lg">🎯</span> 加分副本管理
                {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            </button>
            {!collapsed && (
                <div className="bg-slate-900 border-2 border-orange-500/20 p-6 rounded-4xl space-y-5 shadow-xl">
                    <p className="text-xs text-slate-500">打卡任務標題包含以下關鍵字時，自動給予額外骰子獎勵。</p>

                    {/* 規則列表 */}
                    <div className="space-y-2">
                        {rules.map(r => (
                            <div key={r.id} className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${r.active ? 'border-slate-700 bg-slate-800/50' : 'border-slate-800 bg-slate-900/50 opacity-50'}`}>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-bold text-sm text-white">{r.label}</p>
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${r.bonusType === 'energy_dice' ? 'bg-blue-500/20 text-blue-300' : 'bg-yellow-500/20 text-yellow-300'}`}>
                                            {r.bonusType === 'energy_dice' ? `⚡ +${r.bonusAmount} 能量骰` : `✨ +${r.bonusAmount} 黃金骰`}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-0.5">關鍵字：{r.keywords.join('、')}</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button onClick={() => handleToggle(r.id)}
                                        className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-colors ${r.active ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/50' : 'bg-slate-800 text-slate-500'}`}>
                                        {r.active ? '啟用' : '停用'}
                                    </button>
                                    <button onClick={() => openEdit(r)} className="p-2 bg-slate-800 text-slate-400 hover:text-orange-400 rounded-xl transition-colors"><Pencil size={13} /></button>
                                    <button onClick={() => handleDelete(r.id)} className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl transition-colors"><X size={13} /></button>
                                </div>
                            </div>
                        ))}
                        {rules.length === 0 && (
                            <p className="text-sm text-slate-500 text-center py-6">尚無加分副本規則。</p>
                        )}
                    </div>

                    {/* 新增/編輯表單 */}
                    {formOpen && (
                        <div className="border-t border-slate-800 pt-5 space-y-3">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{editingId ? '編輯副本' : '新增副本'}</p>
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] text-slate-500 font-bold">副本名稱</label>
                                    <input value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))}
                                        placeholder="例：參加心成活動" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold outline-none focus:border-orange-500 text-sm" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-slate-500 font-bold">觸發關鍵字（逗號或頓號分隔）</label>
                                    <input value={keywordsStr} onChange={e => setKeywordsStr(e.target.value)}
                                        placeholder="例：心成、同學會、定聚" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold outline-none focus:border-orange-500 text-sm" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-500 font-bold">骰子類型</label>
                                        <select value={form.bonusType} onChange={e => setForm(p => ({ ...p, bonusType: e.target.value as 'energy_dice' | 'golden_dice' }))}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold outline-none focus:border-orange-500 text-sm">
                                            <option value="energy_dice">⚡ 能量骰</option>
                                            <option value="golden_dice">✨ 黃金骰</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-500 font-bold">數量</label>
                                        <input type="number" min={1} value={form.bonusAmount} onChange={e => setForm(p => ({ ...p, bonusAmount: parseInt(e.target.value) || 1 }))}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold text-center outline-none focus:border-orange-500 text-sm" />
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={handleSave} disabled={!form.label.trim() || !keywordsStr.trim()}
                                    className="flex-1 flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white p-3 rounded-2xl font-black text-sm shadow-lg transition-colors">
                                    <Save size={14} /> 儲存
                                </button>
                                <button onClick={() => setFormOpen(false)} className="px-5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl font-bold text-sm transition-colors">取消</button>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 border-t border-slate-800 pt-5">
                        <button onClick={openNew} className="flex items-center gap-2 bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 border border-orange-600/40 px-4 py-2.5 rounded-2xl font-black text-sm transition-colors">
                            <Plus size={14} /> 新增副本
                        </button>
                        <button onClick={handleSeedDefaults} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-400 px-4 py-2.5 rounded-2xl font-black text-sm transition-colors">
                            <Download size={14} /> 套用預設規則
                        </button>
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
    const [collapsed, setCollapsed] = React.useState(true);
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
                {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
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
    const [collapsed, setCollapsed] = React.useState(true);
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
        logAdminAction('site_name_update', 'admin', undefined, siteName.trim() || '大無限開運西遊');
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
            logAdminAction('logo_upload', 'admin', undefined, undefined, { source: 'file' });
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveLogo = () => {
        updateGlobalSetting('SiteLogo', '');
        setLogoPreview(null);
        logAdminAction('logo_remove', 'admin');
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
                        <GalleryPickerButton label="🖼 從圖片庫選取 Logo" onSelect={url => { updateGlobalSetting('SiteLogo', url); setLogoPreview(url); logAdminAction('logo_upload', 'admin', undefined, undefined, { source: 'gallery', url }); }} />
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
    const [collapsed, setCollapsed] = React.useState(true);
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
        logAdminAction('motto_save', 'admin', undefined, undefined, { count: next.length });
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
            if (res.success) { setBackImage(dataUrl); logAdminAction('card_back_image_upload', 'admin', undefined, undefined, { source: 'file' }); }
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
        logAdminAction('card_back_image_remove', 'admin');
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
                        <GalleryPickerButton label="🖼 從圖片庫選取卡背" onSelect={async url => { setImgSaving(true); const { saveCardBackImage } = await import('@/app/actions/admin'); const res = await saveCardBackImage(url); setImgSaving(false); if (res.success) { setBackImage(url); await logAdminAction('card_back_image_upload', 'admin', undefined, undefined, { source: 'gallery', url }); } }} />
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
        await logAdminAction('gallery_upload', 'admin', undefined, activeFolder, { count: Array.from(picked).length });
        load();
    };

    const handleDelete = async (item: FileItem) => {
        if (!confirm(`確定刪除「${item.name}」？`)) return;
        setDeleting(item.fullPath);
        const { deleteStorageFile } = await import('@/app/actions/admin');
        await deleteStorageFile(item.fullPath);
        setDeleting(null);
        await logAdminAction('gallery_delete', 'admin', item.fullPath, item.name);
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
    quest_config_create: '新增定課設定',
    quest_config_update: '修改定課設定',
    quest_config_toggle: '切換定課啟用',
    quest_config_delete: '刪除定課設定',
    quest_config_seed: '套用預設定課',
    artifact_config_create: '新增法寶設定',
    artifact_config_update: '修改法寶設定',
    artifact_config_toggle: '切換法寶啟用',
    artifact_config_delete: '刪除法寶設定',
    artifact_config_seed: '套用預設法寶',
    achievement_config_create: '新增成就設定',
    achievement_config_update: '修改成就設定',
    achievement_config_toggle: '切換成就啟用',
    achievement_config_delete: '刪除成就設定',
    achievement_config_seed: '套用預設成就',
    site_name_update: '修改站台名稱',
    logo_upload: '更換 Logo',
    logo_remove: '移除 Logo',
    card_back_image_upload: '更換卡背圖片',
    card_back_image_remove: '移除卡背圖片',
    motto_save: '儲存格言',
    display_name_save: '設定顯示名稱',
    member_assignment_update: '修改成員分配',
    member_add: '新增成員',
    gallery_upload: '上傳圖片至圖庫',
    gallery_delete: '刪除圖庫圖片',
    course_create: '新增課程',
    course_update: '修改課程',
    course_delete: '刪除課程',
};

const DETAIL_LABELS: Record<string, string> = {
    active: '啟用',
    count: '數量',
    exp: '修為獎勵',
    coins: '銅錢',
    dice: '骰子數',
    price: '售價',
    teamBinding: '隊伍共享',
    effect: '效果',
    rarity: '稀有度',
    team: '大隊',
    squad: '小隊',
    isCaptain: '小隊長',
    isCommandant: '大隊長',
    isGM: 'GM',
    source: '來源',
    url: '圖片',
    date: '日期',
    time: '時間',
    location: '地點',
    notes: '備註',
    type: '類型',
    interviewTarget: '傳愛對象',
    questId: '任務ID',
    worldState: '世界狀態',
    rate: '活躍率',
    error: '錯誤',
    checkInError: '入帳錯誤',
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
    onAddTempQuest: (title: string, sub: string, desc: string, reward: number, coins?: number) => void;
    onToggleTempQuest: (id: string, active: boolean) => void;
    onDeleteTempQuest: (id: string) => void;
    onUpdateTempQuest: (id: string, reward: number, coins: number | null) => void;
    onTriggerSnapshot: () => void;
    onCheckW3Compliance: () => void;
    onAutoDrawAllSquads: () => void;
    onImportRoster: (csvData: string) => Promise<void>;
    onFinalReviewW4: (appId: string, approve: boolean, notes: string) => Promise<void>;
    onUpsertCourse: (course: Omit<Course, 'created_at'>) => Promise<void>;
    onDeleteCourse: (id: string) => Promise<void>;
    onUpdateMemberAssignment: (userId: string, teamName: string, squadName: string, isCaptain: boolean, isCommandant: boolean, isGM: boolean) => Promise<void>;
    onRefreshLeaderboard: () => Promise<void>;
    onDeleteAdminLog: (id: string) => Promise<void>;
    onClose: () => void;
    onQuickLogin?: (userId: string) => void;
}

export function AdminDashboard({
    adminAuth, onAuth, systemSettings, updateGlobalSetting, updateGlobalSettings,
    leaderboard, topicHistory, temporaryQuests,
    squadApprovedW4Apps, adminLogs, testimonies, courses,
    onAddTempQuest, onToggleTempQuest, onDeleteTempQuest, onUpdateTempQuest,
    onTriggerSnapshot, onCheckW3Compliance, onAutoDrawAllSquads,
    onImportRoster, onFinalReviewW4, onUpsertCourse, onDeleteCourse,
    onUpdateMemberAssignment, onRefreshLeaderboard, onClose, onQuickLogin
}: AdminDashboardProps) {
    const [csvInput, setCsvInput] = React.useState("");
    const [isImporting, setIsImporting] = React.useState(false);
    const [rosterPreviewRows, setRosterPreviewRows] = React.useState<ParsedRosterRow[]>([]);
    const [showRosterPreview, setShowRosterPreview] = React.useState(false);
    const [rosterCheckLoading, setRosterCheckLoading] = React.useState(false);
    const [w4Notes, setW4Notes] = React.useState<Record<string, string>>({});
    const [reviewingW4Id, setReviewingW4Id] = React.useState<string | null>(null);
    const [volunteerPwd, setVolunteerPwd] = React.useState('');
    const [volPwdSaved, setVolPwdSaved] = React.useState(false);

    // 主線任務設定
    const mainQuestSchedule: MainQuestEntry[] = React.useMemo(() => {
        try { return JSON.parse(systemSettings.MainQuestSchedule ?? '[]'); } catch { return []; }
    }, [systemSettings.MainQuestSchedule]);

    const [mqFormEntry, setMqFormEntry] = React.useState({ topicTitle: '', title: '', description: '', reward: '1000', coins: '100', startDate: '' });

    // 臨時任務內聯編輯
    const [tqEditId, setTqEditId] = React.useState<string | null>(null);
    const [tqEditReward, setTqEditReward] = React.useState('');
    const [tqEditCoins, setTqEditCoins] = React.useState('');

    const today = new Date().toISOString().split('T')[0];
    const activeMqEntry = [...mainQuestSchedule]
        .filter(e => e.startDate <= today)
        .sort((a, b) => b.startDate.localeCompare(a.startDate))[0];

    const handleAddMqEntry = () => {
        if (!mqFormEntry.title.trim() || !mqFormEntry.startDate) return;
        const newEntry: MainQuestEntry = {
            id: Date.now().toString(),
            topicTitle: mqFormEntry.topicTitle.trim() || undefined,
            title: mqFormEntry.title.trim(),
            description: mqFormEntry.description.trim() || undefined,
            reward: parseInt(mqFormEntry.reward, 10) || 1000,
            coins: parseInt(mqFormEntry.coins, 10) || 100,
            startDate: mqFormEntry.startDate,
        };
        const sorted = [...mainQuestSchedule, newEntry].sort((a, b) => a.startDate.localeCompare(b.startDate));
        updateGlobalSetting('MainQuestSchedule', JSON.stringify(sorted));
        setMqFormEntry({ topicTitle: '', title: '', description: '', reward: '1000', coins: '100', startDate: '' });
    };

    const handleRemoveMqEntry = (id: string) => {
        updateGlobalSetting('MainQuestSchedule', JSON.stringify(mainQuestSchedule.filter(e => e.id !== id)));
    };

    const handleApplyMqEntry = (entry: MainQuestEntry) => {
        updateGlobalSettings({
            TopicQuestTitle: entry.topicTitle || entry.title,
            TopicQuestReward: String(entry.reward),
            TopicQuestCoins: String(entry.coins),
            TopicQuestDescription: entry.description || '',
            MainQuestAppliedId: entry.id,
        });
    };

    // 大小隊分組管理
    const [squadExpandedTeams, setSquadExpandedTeams] = React.useState<Set<string>>(new Set());
    const [squadExpandedSquads, setSquadExpandedSquads] = React.useState<Set<string>>(new Set());
    const [editingMemberId, setEditingMemberId] = React.useState<string | null>(null);
    const [memberEditForm, setMemberEditForm] = React.useState({ teamName: '', squadName: '', isCaptain: false, isCommandant: false, isGM: false });
    const [memberSaving, setMemberSaving] = React.useState(false);

    // 任務角色
    type QuestRoleConfig = { id: string; name: string; duties: string[] };
    const parseQuestRoles = (raw: string | null | undefined): string[] => {
        if (!raw) return [];
        try { const p = JSON.parse(raw); return Array.isArray(p) ? p : [raw]; } catch { return [raw]; }
    };
    const [questRolesConfig, setQuestRolesConfig] = React.useState<QuestRoleConfig[]>(DEFAULT_QUEST_ROLES);
    const [rolesSaving, setRolesSaving] = React.useState(false);
    const [memberDetailRoles, setMemberDetailRoles] = React.useState<string[]>([]);
    React.useEffect(() => {
        if (!adminAuth) return;
        import('@/app/actions/admin').then(({ getQuestRoles }) =>
            getQuestRoles().then(r => setQuestRolesConfig(r.length > 0 ? r : DEFAULT_QUEST_ROLES))
        );
    }, [adminAuth]);

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
                setSquadDisplayNames(Object.fromEntries(squads.filter(s => s.display_name).map(s => [s.LittleTeamLeagelName, s.display_name!])));
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
        await logAdminAction('display_name_save', 'admin', settingDisplayNameFor.id ?? '', displayNameInput, { type: settingDisplayNameFor.type });
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
            const team = p.BigTeamLeagelName ?? '（未分配）';
            // 大隊長不歸入任何小隊，改用特殊 key
            const squad = p.IsCommandant ? COMMANDANT_KEY : (p.LittleTeamLeagelName ?? '（未分配）');
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

    const allSquadNames = React.useMemo(() => [...new Set(leaderboard.map(p => p.LittleTeamLeagelName).filter(Boolean))] as string[], [leaderboard]);
    const allTeamNames = React.useMemo(() => [...new Set(leaderboard.map(p => p.BigTeamLeagelName).filter(Boolean))] as string[], [leaderboard]);

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
        setMemberEditForm({ teamName: p.BigTeamLeagelName ?? '', squadName: p.LittleTeamLeagelName ?? '', isCaptain: !!p.IsCaptain, isCommandant: !!p.IsCommandant, isGM: !!p.IsGM });
    };
    const saveMemberEdit = async () => {
        if (!editingMemberId) return;
        setMemberSaving(true);
        await onUpdateMemberAssignment(editingMemberId, memberEditForm.teamName, memberEditForm.squadName, memberEditForm.isCaptain, memberEditForm.isCommandant, memberEditForm.isGM);
        await logAdminAction('member_assignment_update', 'admin', editingMemberId ?? '', undefined, { team: memberEditForm.teamName, squad: memberEditForm.squadName, isCaptain: memberEditForm.isCaptain, isCommandant: memberEditForm.isCommandant });
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
        name: '', phone: '', email: '', birthday: '', role: '孫悟空',
        teamName: '', squadName: '', isCaptain: false, isCommandant: false,
    });
    const handleAddMember = async () => {
        if (!addMemberForm.name.trim() || !addMemberForm.phone.trim()) return;
        setAddMemberSaving(true);
        const { adminCreateMember } = await import('@/app/actions/admin');
        const res = await adminCreateMember(addMemberForm);
        setAddMemberSaving(false);
        if (!res.success) { alert(`新增失敗：${res.error}`); return; }
        await logAdminAction('member_add', 'admin', undefined, addMemberForm.name, { team: addMemberForm.teamName, squad: addMemberForm.squadName });
        setAddMemberOpen(false);
        setAddMemberForm({ name: '', phone: '', email: '', birthday: '', role: '孫悟空', teamName: '', squadName: '', isCaptain: false, isCommandant: false });
        await onRefreshLeaderboard();
    };

    // 參與人員名單
    type MemberSortKey = 'Name' | 'BigTeamLeagelName' | 'LittleTeamLeagelName' | 'Level' | 'Exp' | 'Streak' | 'TotalFines';
    const [memberFilter, setMemberFilter] = React.useState('');
    const [memberTeamFilter, setMemberTeamFilter] = React.useState('');
    const [memberSquadFilter, setMemberSquadFilter] = React.useState('');
    const [memberDetailTarget, setMemberDetailTarget] = React.useState<CharacterStats | null>(null);
    const [memberSort, setMemberSort] = React.useState<{ key: MemberSortKey; dir: 'asc' | 'desc' }>({ key: 'Exp', dir: 'desc' });
    const handleMemberSort = (key: MemberSortKey) => {
        setMemberSort(prev => prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' });
    };
    const allTeams = React.useMemo(() => [...new Set(leaderboard.map(p => p.BigTeamLeagelName).filter(Boolean))].sort() as string[], [leaderboard]);
    const allSquadsForTeam = React.useMemo(() => {
        const src = memberTeamFilter ? leaderboard.filter(p => p.BigTeamLeagelName === memberTeamFilter) : leaderboard;
        return [...new Set(src.map(p => p.LittleTeamLeagelName).filter(Boolean))].sort() as string[];
    }, [leaderboard, memberTeamFilter]);
    const filteredMembers = React.useMemo(() => {
        let list = [...leaderboard];
        if (memberFilter.trim()) {
            const kw = memberFilter.trim().toLowerCase();
            list = list.filter(p => p.Name.toLowerCase().includes(kw) || (p.BigTeamLeagelName ?? '').toLowerCase().includes(kw) || (p.LittleTeamLeagelName ?? '').toLowerCase().includes(kw));
        }
        if (memberTeamFilter) list = list.filter(p => p.BigTeamLeagelName === memberTeamFilter);
        if (memberSquadFilter) list = list.filter(p => p.LittleTeamLeagelName === memberSquadFilter);
        list.sort((a, b) => {
            const va = a[memberSort.key] ?? 0;
            const vb = b[memberSort.key] ?? 0;
            const cmp = typeof va === 'number' ? (va as number) - (vb as number) : String(va).localeCompare(String(vb), 'zh-TW');
            return memberSort.dir === 'asc' ? cmp : -cmp;
        });
        return list;
    }, [leaderboard, memberFilter, memberTeamFilter, memberSquadFilter, memberSort]);
    const downloadMembersCsv = () => {
        if (filteredMembers.length === 0) return;
        const header = ['#', '姓名', '大隊', '小隊', '職位', '任務角色', '等級', '修為'];
        const rows = filteredMembers.map((p, i) => [
            i + 1, p.Name, p.BigTeamLeagelName ?? '—', p.LittleTeamLeagelName ?? '—',
            p.IsCommandant ? '大隊長' : p.IsCaptain ? '小隊長' : '學員',
            parseQuestRoles(p.QuestRole).map(id => questRolesConfig.find(rc => rc.id === id)?.name ?? id).join('・') || '—',
            p.Level, p.Exp,
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
    const [showCourseModal, setShowCourseModal] = React.useState(false);
    const [showMqModal, setShowMqModal] = React.useState(false);
    const [showTqModal, setShowTqModal] = React.useState(false);
    const [tqFormTitle, setTqFormTitle] = React.useState('');
    const [tqFormSub, setTqFormSub] = React.useState('');
    const [tqFormDesc, setTqFormDesc] = React.useState('');
    const [tqFormReward, setTqFormReward] = React.useState('500');
    const [tqFormCoins, setTqFormCoins] = React.useState('');

    // ── 巔峰試煉管理 state ───────────────────────────────────
    const emptyPtForm = { title: '', description: '', date: '', time: '', location: '', max_participants: '' };
    const [peakTrials, setPeakTrials] = React.useState<PeakTrial[]>([]);
    const [ptForm, setPtForm] = React.useState(emptyPtForm);
    const [showPtForm, setShowPtForm] = React.useState(false);
    const [ptEditingId, setPtEditingId] = React.useState<string | null>(null);
    const [ptSaving, setPtSaving] = React.useState(false);
    const [ptDeletingId, setPtDeletingId] = React.useState<string | null>(null);
    const [ptViewRegs, setPtViewRegs] = React.useState<{ trialId: string; regs: PeakTrialRegistration[] } | null>(null);
    const [ptMarkingId, setPtMarkingId] = React.useState<string | null>(null);

    const refreshPtList = () => listPeakTrials().then(res => { if (res.success) setPeakTrials(res.trials); });

    React.useEffect(() => { refreshPtList(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── 巔峰試煉審核 state ───────────────────────────────────
    const [ptReviews, setPtReviews] = React.useState<PeakTrialReview[]>([]);
    const [ptReviewNotes, setPtReviewNotes] = React.useState<Record<string, string>>({});
    const [ptReviewingId, setPtReviewingId] = React.useState<string | null>(null);
    const [ptPhotoOpen, setPtPhotoOpen] = React.useState<string | null>(null);
    const [ptRecalculating, setPtRecalculating] = React.useState(false);
    const [ptBatchApproving, setPtBatchApproving] = React.useState(false);
    const [ptBatchRejecting, setPtBatchRejecting] = React.useState(false);
    const [ptSelectedIds, setPtSelectedIds] = React.useState<Set<string>>(new Set());
    const [ptParticipants, setPtParticipants] = React.useState<Record<string, PeakTrialRegistration[]>>({});
    const [ptLoadingParticipants, setPtLoadingParticipants] = React.useState<string | null>(null);

    const refreshPtReviews = () => listPeakTrialReviews().then(res => { if (res.success) setPtReviews(res.reviews); });

    React.useEffect(() => { refreshPtReviews(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handlePtApprove = async (reviewId: string) => {
        setPtReviewingId(reviewId);
        const res = await approvePeakTrialReview(reviewId, 'admin');
        setPtReviewingId(null);
        if (res.success) {
            alert(`✅ 已核准，${res.membersRewarded} 位隊員獲得修為`);
            refreshPtReviews();
        } else {
            alert(res.error || '核准失敗');
        }
    };

    const handlePtReject = async (reviewId: string) => {
        setPtReviewingId(reviewId);
        const res = await rejectPeakTrialReview(reviewId, 'admin', ptReviewNotes[reviewId] || '');
        setPtReviewingId(null);
        if (res.success) {
            alert('已駁回審核');
            refreshPtReviews();
        } else {
            alert(res.error || '駁回失敗');
        }
    };

    const handlePtRecalcAll = async () => {
        const pending = ptReviews.filter(r => r.status === 'pending');
        if (pending.length === 0) { alert('目前無待審核申請'); return; }
        setPtRecalculating(true);
        let successCount = 0;
        for (const rv of pending) {
            const res = await recalcPeakTrialReview(rv.id);
            if (res.success) successCount++;
        }
        setPtRecalculating(false);
        alert(`已重新計算 ${successCount} 筆審核修為`);
        refreshPtReviews();
    };

    const togglePtSelect = (id: string) => setPtSelectedIds(prev => {
        const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
    });

    const handleLoadParticipants = async (reviewId: string, trialId: string, battalionName: string) => {
        if (ptParticipants[reviewId]) { setPtParticipants(prev => { const n = { ...prev }; delete n[reviewId]; return n; }); return; }
        setPtLoadingParticipants(reviewId);
        const res = await getPeakTrialRegistrations(trialId);
        setPtLoadingParticipants(null);
        if (res.success) {
            const own = res.registrations.filter(r => r.battalion_name === battalionName);
            const cross = res.registrations.filter(r => r.battalion_name !== battalionName);
            setPtParticipants(prev => ({ ...prev, [reviewId]: [...own, ...cross] }));
        }
    };

    const handlePtBatchApprove = async () => {
        const targets = ptReviews.filter(r => r.status === 'pending' && ptSelectedIds.has(r.id));
        if (targets.length === 0) { alert('請先勾選要核准的申請'); return; }
        if (!confirm(`確認批次核准 ${targets.length} 筆勾選申請並發放修為？`)) return;
        setPtBatchApproving(true);
        let successCount = 0;
        const errors: string[] = [];
        for (const rv of targets) {
            const res = await approvePeakTrialReview(rv.id, 'admin');
            if (res.success) { successCount++; setPtSelectedIds(prev => { const n = new Set(prev); n.delete(rv.id); return n; }); }
            else errors.push(`${rv.battalion_name}：${res.error}`);
        }
        setPtBatchApproving(false);
        alert(`批次核准完成：${successCount} 筆成功${errors.length > 0 ? `\n失敗：${errors.join('\n')}` : ''}`);
        refreshPtReviews();
    };

    const handlePtBatchReject = async () => {
        const targets = ptReviews.filter(r => r.status === 'pending' && ptSelectedIds.has(r.id));
        if (targets.length === 0) { alert('請先勾選要駁回的申請'); return; }
        if (!confirm(`確認批次駁回 ${targets.length} 筆勾選申請？`)) return;
        setPtBatchRejecting(true);
        let successCount = 0;
        for (const rv of targets) {
            const res = await rejectPeakTrialReview(rv.id, 'admin', ptReviewNotes[rv.id] || '');
            if (res.success) { successCount++; setPtSelectedIds(prev => { const n = new Set(prev); n.delete(rv.id); return n; }); }
        }
        setPtBatchRejecting(false);
        alert(`批次駁回完成：${successCount} 筆`);
        refreshPtReviews();
    };

    const openPtEdit = (trial: PeakTrial) => {
        setPtForm({
            title: trial.title,
            description: trial.description || '',
            date: trial.date,
            time: trial.time || '',
            location: trial.location || '',
            max_participants: trial.max_participants?.toString() || '',
        });
        setPtEditingId(trial.id);
        setShowPtForm(true);
    };

    const handleSavePt = async () => {
        if (!ptForm.title || !ptForm.date) return;
        setPtSaving(true);
        const res = await upsertPeakTrial({
            ...(ptEditingId ? { id: ptEditingId } : {}),
            title: ptForm.title,
            description: ptForm.description || undefined,
            date: ptForm.date,
            time: ptForm.time || undefined,
            location: ptForm.location || undefined,
            max_participants: ptForm.max_participants ? parseInt(ptForm.max_participants) : undefined,
            created_by: 'admin',
            is_active: true,
        });
        setPtSaving(false);
        if (res.success) {
            await refreshPtList();
            setPtForm(emptyPtForm);
            setShowPtForm(false);
            setPtEditingId(null);
        }
    };

    const handleDeletePt = async (id: string) => {
        setPtDeletingId(id);
        const res = await deletePeakTrial(id);
        setPtDeletingId(null);
        if (res.success) setPeakTrials(prev => prev.filter(t => t.id !== id));
    };

    const handleViewPtRegs = async (trialId: string) => {
        if (ptViewRegs?.trialId === trialId) { setPtViewRegs(null); return; }
        const res = await getPeakTrialRegistrations(trialId);
        if (res.success) setPtViewRegs({ trialId, regs: res.registrations });
    };

    const handleMarkPtAttendance = async (regId: string, trialId: string) => {
        setPtMarkingId(regId);
        const res = await markPeakTrialAttendance(regId);
        setPtMarkingId(null);
        if (res.success) {
            const updated = await getPeakTrialRegistrations(trialId);
            if (updated.success) setPtViewRegs({ trialId, regs: updated.registrations });
        }
    };

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
        await logAdminAction(courseForm.id ? 'course_update' : 'course_create', 'admin', courseForm.id, courseForm.name, { date: courseForm.date, time: courseForm.startTime && courseForm.endTime ? `${courseForm.startTime}–${courseForm.endTime}` : courseForm.startTime, location: courseForm.location });
        setCourseSubmitting(false);
        setCourseForm(emptyCourseForm);
        setEditingCourseId(null);
        setShowCourseModal(false);
    };

    const handleEditCourse = (c: Course) => {
        const [startTime = '', endTime = ''] = c.time.split('–');
        setCourseForm({ id: c.id, name: c.name, date: c.date, startTime: startTime.trim(), endTime: endTime.trim(), location: c.location, address: c.address ?? '', is_active: c.is_active, sort_order: c.sort_order });
        setEditingCourseId(c.id);
        setShowCourseModal(true);
    };

    const handleImportSubmit = async (e: { preventDefault: () => void }) => {
        e.preventDefault();
        if (!csvInput.trim()) return;
        setIsImporting(true);
        await onImportRoster(csvInput);
        setIsImporting(false);
        setCsvInput("");
        setShowRosterPreview(false);
    };

    const parseBoolLocal = (s: string) => ['true', '1', 'y', 'yes'].includes(String(s).toLowerCase().trim());

    const handlePreviewRoster = async () => {
        if (!csvInput.trim()) return;
        setRosterCheckLoading(true);
        const lines = csvInput.split('\n').map(l => l.trim()).filter(Boolean);
        const rows: ParsedRosterRow[] = [];
        const phonesSeen = new Map<string, number>(); // userId → first occurrence index

        for (const line of lines) {
            const cols = line.split(',').map(c => c.trim());
            const rawPhone = cols[0]?.replace(/\D/g, '') ?? '';
            // 格式驗證：10碼首位為0，或 9碼首位為9
            const isValidPhone = /^0\d{9}$/.test(rawPhone) || /^9\d{8}$/.test(rawPhone);
            const userId = rawPhone.replace(/^0+/, '');

            // 跳過表頭行
            if (!rawPhone || rawPhone === '電話' || cols[0]?.includes('電話')) continue;

            const phoneError = !isValidPhone
                ? (rawPhone ? `格式錯誤（${rawPhone.length} 碼）` : '電話欄位空白')
                : null;

            const isDupInBatch = !phoneError && phonesSeen.has(userId);
            if (!phoneError) {
                if (!phonesSeen.has(userId)) phonesSeen.set(userId, rows.length);
                else {
                    // 標記先前那筆也重複
                    const prevIdx = phonesSeen.get(userId)!;
                    rows[prevIdx].isDupInBatch = true;
                }
            }

            const isCommandant = parseBoolLocal(cols[4] || '');
            rows.push({
                rawPhone: cols[0] ?? '',
                userId,
                name: cols[1] ?? '',
                birthday: cols[2] ?? '',
                bigTeam: cols[3] ?? '',
                isCommandant,
                littleTeam: isCommandant ? '' : (cols[5] ?? ''),
                isCaptain: parseBoolLocal(cols[6] || ''),
                phoneError,
                isDupInBatch,
                isDupInDb: false,
            });
        }

        // 查詢 DB 重複
        const validIds = rows.filter(r => !r.phoneError).map(r => r.userId);
        try {
            const existingIds = await checkExistingRosterPhones(validIds);
            const existingSet = new Set(existingIds);
            for (const r of rows) {
                if (!r.phoneError && existingSet.has(r.userId)) r.isDupInDb = true;
            }
        } catch { /* 查詢失敗不阻斷預覽 */ }

        setRosterPreviewRows(rows);
        setRosterCheckLoading(false);
        setShowRosterPreview(true);
    };

    const handleW4Review = async (appId: string, approve: boolean) => {
        setReviewingW4Id(appId);
        await onFinalReviewW4(appId, approve, w4Notes[appId] || '');
        await logAdminAction(approve ? 'w4_final_approve' : 'w4_final_reject', 'admin', appId, undefined, { notes: w4Notes[appId] });
        setReviewingW4Id(null);
        setW4Notes(prev => { const n = { ...prev }; delete n[appId]; return n; });
    };

    const [adminModule, setAdminModule] = React.useState<'personnel' | 'course' | 'quest' | 'params' | 'gallery' | 'dashboard' | 'logs' | 'review' | null>('dashboard');

    // 切換到審核中心時自動重新載入
    React.useEffect(() => { if (adminModule === 'review') refreshPtReviews(); }, [adminModule]); // eslint-disable-line react-hooks/exhaustive-deps

    // 儀表板統計
    type DashStats = { total: number; active: number; fallen: number; fallenUsers: { name: string; teamName: string | null; squadName: string | null }[] };
    const [dashStats, setDashStats] = React.useState<DashStats | null>(null);
    const [dashLoading, setDashLoading] = React.useState(false);
    const [showFallenModal, setShowFallenModal] = React.useState(false);

    const loadDashStats = React.useCallback(async () => {
        setDashLoading(true);
        const { getDashboardStats } = await import('@/app/actions/admin');
        const res = await getDashboardStats();
        if (res.success) setDashStats({ total: res.total, active: res.active, fallen: res.fallen, fallenUsers: res.fallenUsers });
        setDashLoading(false);
    }, []);

    React.useEffect(() => {
        if (adminModule !== 'dashboard') return;
        loadDashStats();
    }, [adminModule, loadDashStats]);

    const [trashedLogIds, setTrashedLogIds] = React.useState<Set<string>>(new Set());
    const [showTrash, setShowTrash] = React.useState(false);
    const [freshLogs, setFreshLogs] = React.useState<AdminLog[]>(adminLogs);
    const [loadingLogs, setLoadingLogs] = React.useState(false);

    const refreshLogs = React.useCallback(async () => {
        setLoadingLogs(true);
        const { getAdminActivityLog } = await import('@/app/actions/w4');
        const res = await getAdminActivityLog(200);
        if (res.success) setFreshLogs(res.logs as AdminLog[]);
        setLoadingLogs(false);
    }, []);

    React.useEffect(() => {
        if (adminModule === 'logs') refreshLogs();
    }, [adminModule, refreshLogs]);

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
        { key: null as null,             label: '首頁',    icon: <BarChart3 size={17} />, accent: 'slate' },
        { key: 'dashboard' as const,     label: '儀表板',   icon: <BarChart3 size={17} />, accent: 'sky' },
        { key: 'review' as const,        label: '審核中心', icon: <CheckCircle size={17} />, accent: 'pink' },
        { key: 'personnel' as const,     label: '人員管理', icon: <Users size={17} />,    accent: 'cyan' },
        { key: 'course' as const,        label: '課程管理', icon: <BookOpen size={17} />, accent: 'amber' },
        { key: 'quest' as const,         label: '任務管理', icon: <Settings size={17} />, accent: 'orange' },
        { key: 'params' as const,        label: '參數管理', icon: <Save size={17} />,     accent: 'violet' },
        { key: 'gallery' as const,       label: '圖片庫',   icon: <ImageIcon size={17} />, accent: 'teal' },
        { key: 'logs' as const,          label: 'Log 紀錄', icon: <BarChart3 size={17} />, accent: 'rose' },
    ] as const;

    const accentClass: Record<string, string> = {
        slate:  'bg-slate-800 text-white border-slate-600',
        cyan:   'bg-cyan-950/70 text-cyan-300 border-cyan-700/50',
        amber:  'bg-amber-950/70 text-amber-300 border-amber-700/50',
        orange: 'bg-orange-950/70 text-orange-300 border-orange-700/50',
        violet: 'bg-violet-950/70 text-violet-300 border-violet-700/50',
        teal:   'bg-teal-950/70 text-teal-300 border-teal-700/50',
        sky:    'bg-sky-950/70 text-sky-300 border-sky-700/50',
        rose:   'bg-rose-950/70 text-rose-300 border-rose-700/50',
        pink:   'bg-pink-950/70 text-pink-300 border-pink-700/50',
    };
    const accentDot: Record<string, string> = {
        slate: 'bg-slate-400', cyan: 'bg-cyan-400', amber: 'bg-amber-400', orange: 'bg-orange-400', violet: 'bg-violet-400', teal: 'bg-teal-400', sky: 'bg-sky-400', rose: 'bg-rose-400', pink: 'bg-pink-400',
    };
    const reviewPendingCount = squadApprovedW4Apps.length;

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
                        const badge = item.key === 'review' && reviewPendingCount > 0 ? reviewPendingCount : 0;
                        return (
                            <button key={String(item.key)} onClick={() => setAdminModule(item.key)}
                                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold border transition-all text-left w-full
                                    ${isActive
                                        ? accentClass[item.accent] + ' border'
                                        : 'text-slate-500 border-transparent hover:text-slate-200 hover:bg-white/5'}`}>
                                {isActive && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${accentDot[item.accent]}`} />}
                                <span className={isActive ? '' : 'opacity-60'}>{item.icon}</span>
                                <span className="flex-1">{item.label}</span>
                                {badge > 0 && <span className="ml-auto min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-black rounded-full px-1">{badge}</span>}
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
                        const badge = item.key === 'review' && reviewPendingCount > 0 ? reviewPendingCount : 0;
                        return (
                            <button key={String(item.key)} onClick={() => setAdminModule(item.key)}
                                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap border shrink-0 transition-all
                                    ${isActive ? accentClass[item.accent] + ' border' : 'text-slate-500 border-transparent bg-slate-800'}`}>
                                {item.icon}{item.label}
                                {badge > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] flex items-center justify-center bg-red-500 text-white text-[9px] font-black rounded-full px-0.5">{badge}</span>}
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
                                {adminModule === null ? '首頁' : adminModule === 'dashboard' ? '儀表板' : adminModule === 'review' ? '審核中心' : adminModule === 'personnel' ? '人員管理' : adminModule === 'course' ? '課程管理' : adminModule === 'quest' ? '任務管理' : adminModule === 'params' ? '參數管理' : adminModule === 'gallery' ? '圖片庫' : 'Log 紀錄'}
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <button onClick={() => setAdminModule('dashboard')}
                            className="text-left bg-slate-900 border-2 border-sky-500/30 hover:border-sky-400/60 p-6 rounded-4xl shadow-xl transition-all hover:bg-slate-800 group">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-sky-600/20 rounded-2xl text-sky-400 group-hover:bg-sky-600/30 transition-colors"><BarChart3 size={22} /></div>
                                <h2 className="text-lg font-black text-white">儀表板</h2>
                            </div>
                            <ul className="text-xs text-slate-400 space-y-1.5 font-bold">
                                <li>・功能尚未想好</li>
                            </ul>
                        </button>
                        <button onClick={() => setAdminModule('logs')}
                            className="text-left bg-slate-900 border-2 border-rose-500/30 hover:border-rose-400/60 p-6 rounded-4xl shadow-xl transition-all hover:bg-slate-800 group">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-rose-600/20 rounded-2xl text-rose-400 group-hover:bg-rose-600/30 transition-colors"><BarChart3 size={22} /></div>
                                <h2 className="text-lg font-black text-white">Log 紀錄</h2>
                            </div>
                            <ul className="text-xs text-slate-400 space-y-1.5 font-bold">
                                <li>・逐筆後台操作記錄</li>
                                <li>・可刪除單筆記錄</li>
                            </ul>
                        </button>
                    </div>

                    {/* LINE 選單設定 */}
                    <LineRichMenuSection />

                </>)}

                {/* ══ 審核中心模組 ══ */}
                {adminModule === 'review' && (<>
                    <div className="space-y-8">
                        <div className="flex items-center gap-2 text-pink-400 font-black text-sm uppercase tracking-widest">
                            <CheckCircle size={16} /> 審核中心
                        </div>

                        {/* 傳愛分數終審 */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-2 text-pink-500 font-black text-sm uppercase tracking-widest">
                                ❤️ 傳愛分數終審（管理員）
                                {reviewPendingCount > 0 && <span className="text-[10px] font-black text-white bg-red-500 px-2 py-0.5 rounded-full">{reviewPendingCount} 待審</span>}
                            </div>
                            <div className="bg-slate-900 border-2 border-pink-500/20 p-8 rounded-4xl shadow-xl space-y-4">
                                {squadApprovedW4Apps.length === 0 ? (
                                    <p className="text-sm text-slate-500 text-center py-4">目前無待審核申請</p>
                                ) : (
                                    squadApprovedW4Apps.map(app => (
                                        <div key={app.id} className="bg-slate-800 rounded-2xl p-5 space-y-3">
                                            <div className="flex justify-between items-start flex-wrap gap-2">
                                                <div>
                                                    <p className="font-black text-white">{app.user_name}</p>
                                                    <p className="text-xs text-slate-400">{app.squad_name} · 訪談：{app.interview_target} · {app.interview_date}</p>
                                                    {app.squad_review_notes && <p className="text-xs text-indigo-400 mt-1">小隊長備註：{app.squad_review_notes}</p>}
                                                </div>
                                                <span className="text-[10px] font-black text-violet-400 bg-violet-400/10 px-2 py-1 rounded-lg">待管理員審核</span>
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

                        {/* 親證故事存檔 */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-2 text-orange-500 font-black text-sm uppercase tracking-widest">
                                <BarChart3 size={16} /> 親證故事存檔（{testimonies.length} 筆）
                            </div>
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

                        {/* 巔峰試煉審核 */}
                        <section className="space-y-4">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-2 text-indigo-400 font-black text-sm uppercase tracking-widest">
                                    🏆 巔峰試煉審核
                                    {ptReviews.filter(r => r.status === 'pending').length > 0 && (
                                        <span className="text-[10px] font-black text-white bg-indigo-500 px-2 py-0.5 rounded-full">
                                            {ptReviews.filter(r => r.status === 'pending').length} 待審
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <button
                                        onClick={() => refreshPtReviews()}
                                        disabled={ptRecalculating || ptBatchApproving || ptBatchRejecting}
                                        className="px-3 py-1.5 bg-slate-700/60 border border-slate-600/40 hover:bg-slate-700 text-slate-400 text-xs font-black rounded-xl active:scale-95 transition-all disabled:opacity-50"
                                    >
                                        ↻ 重整
                                    </button>
                                    <button
                                        onClick={handlePtRecalcAll}
                                        disabled={ptRecalculating || ptBatchApproving || ptBatchRejecting}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-amber-600/20 border border-amber-500/30 hover:bg-amber-600/30 text-amber-400 text-xs font-black rounded-xl active:scale-95 transition-all disabled:opacity-50"
                                    >
                                        {ptRecalculating ? '計算中…' : '🔄 重新計算修為'}
                                    </button>
                                    <button
                                        onClick={handlePtBatchReject}
                                        disabled={ptBatchRejecting || ptBatchApproving || ptRecalculating}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-red-600/20 border border-red-500/30 hover:bg-red-600/30 text-red-400 text-xs font-black rounded-xl active:scale-95 transition-all disabled:opacity-50"
                                    >
                                        {ptBatchRejecting ? '處理中…' : '❌ 批次駁回'}
                                    </button>
                                    <button
                                        onClick={handlePtBatchApprove}
                                        disabled={ptBatchApproving || ptBatchRejecting || ptRecalculating}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600/20 border border-emerald-500/30 hover:bg-emerald-600/30 text-emerald-400 text-xs font-black rounded-xl active:scale-95 transition-all disabled:opacity-50"
                                    >
                                        {ptBatchApproving ? '處理中…' : '✅ 批次核准'}
                                    </button>
                                </div>
                            </div>
                            <div className="bg-slate-900 border-2 border-indigo-500/20 p-6 rounded-4xl shadow-xl space-y-4">
                                {ptReviews.length === 0 ? (
                                    <p className="text-sm text-slate-500 text-center py-4">目前無審核申請</p>
                                ) : ptReviews.map(rv => (
                                    <div key={rv.id} className="bg-slate-800 rounded-2xl p-5 space-y-4">
                                        {/* Header */}
                                        <div className="flex items-start justify-between gap-3 flex-wrap">
                                            <div className="flex items-start gap-3">
                                                {rv.status === 'pending' && (
                                                    <input
                                                        type="checkbox"
                                                        checked={ptSelectedIds.has(rv.id)}
                                                        onChange={() => togglePtSelect(rv.id)}
                                                        className="mt-1 w-4 h-4 accent-indigo-500 cursor-pointer shrink-0"
                                                    />
                                                )}
                                                <div>
                                                    <p className="text-white font-black text-sm">{rv.trial_title}</p>
                                                    <p className="text-xs text-indigo-400 mt-0.5">{rv.battalion_name}</p>
                                                    <p className="text-[10px] text-slate-500 mt-0.5">{new Date(rv.created_at).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                                                </div>
                                            </div>
                                            <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${rv.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : rv.status === 'rejected' ? 'bg-red-500/20 text-red-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
                                                {rv.status === 'approved' ? '✅ 已核准' : rv.status === 'rejected' ? '❌ 已駁回' : '⏳ 待審核'}
                                            </span>
                                        </div>

                                        {/* 修為統計 */}
                                        <div className="grid grid-cols-3 gap-2 text-center">
                                            <div className="bg-purple-500/10 rounded-xl p-2">
                                                <p className="text-[10px] text-slate-400">本隊參與</p>
                                                <p className="text-white font-black">{rv.own_participants} 人</p>
                                                <p className="text-purple-400 text-[10px]">+{(Math.min(rv.own_participants, 21) * 1500).toLocaleString()}</p>
                                            </div>
                                            <div className="bg-amber-500/10 rounded-xl p-2">
                                                <p className="text-[10px] text-slate-400">跨隊參與</p>
                                                <p className="text-white font-black">{rv.cross_participants} 人</p>
                                                <p className="text-amber-400 text-[10px]">+{(Math.min(rv.cross_participants, 21) * 1050).toLocaleString()}</p>
                                            </div>
                                            <div className="bg-indigo-500/10 rounded-xl p-2">
                                                <p className="text-[10px] text-slate-400">每人修為</p>
                                                <p className="text-indigo-300 font-black">{rv.reward_per_person.toLocaleString()}</p>
                                                <p className="text-slate-500 text-[10px]">× {rv.total_members} 人</p>
                                            </div>
                                        </div>

                                        {/* 參與名單 */}
                                        <div>
                                            <button
                                                onClick={() => handleLoadParticipants(rv.id, rv.trial_id, rv.battalion_name)}
                                                disabled={ptLoadingParticipants === rv.id}
                                                className="text-xs text-indigo-400 hover:text-indigo-300 font-black transition-colors disabled:opacity-50"
                                            >
                                                {ptLoadingParticipants === rv.id ? '載入中…' : ptParticipants[rv.id] ? '▲ 收起名單' : '▼ 查看參與名單'}
                                            </button>
                                            {ptParticipants[rv.id] && (
                                                <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                                                    {ptParticipants[rv.id].length === 0 ? (
                                                        <p className="text-xs text-slate-500 text-center py-2">無報名記錄</p>
                                                    ) : ptParticipants[rv.id].map(r => (
                                                        <div key={r.id} className="flex items-center justify-between bg-slate-700/50 rounded-xl px-3 py-1.5">
                                                            <div>
                                                                <span className="text-white text-xs font-black">{r.user_name}</span>
                                                                <span className="text-slate-400 text-[10px] ml-1.5">{r.battalion_name === rv.battalion_name ? '本隊' : `跨隊 · ${r.battalion_name}`}{r.squad_name ? ` · ${r.squad_name}` : ''}</span>
                                                            </div>
                                                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-lg ${r.attended ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-600/60 text-slate-400'}`}>
                                                                {r.attended ? '✅ 出席' : '未出席'}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* 大合照 */}
                                        {rv.photo_data && (
                                            <div>
                                                <button onClick={() => setPtPhotoOpen(ptPhotoOpen === rv.id ? null : rv.id)}
                                                    className="text-xs text-indigo-400 hover:text-indigo-300 font-black transition-colors">
                                                    {ptPhotoOpen === rv.id ? '▲ 收起照片' : '▼ 查看大合照'}
                                                </button>
                                                {ptPhotoOpen === rv.id && (
                                                    <img src={rv.photo_data} alt="大合照" className="mt-2 w-full rounded-2xl object-cover max-h-72" />
                                                )}
                                            </div>
                                        )}

                                        {/* 影片連結 */}
                                        {rv.video_url && (
                                            <div className="flex items-center gap-2 bg-slate-700/40 rounded-xl px-3 py-2">
                                                <span className="text-xs text-slate-400 shrink-0">🎬 影片：</span>
                                                <a href={rv.video_url} target="_blank" rel="noopener noreferrer"
                                                    className="text-xs text-indigo-400 hover:text-indigo-300 underline truncate transition-colors">
                                                    {rv.video_url}
                                                </a>
                                            </div>
                                        )}

                                        {/* 駁回備註 */}
                                        {rv.status === 'rejected' && rv.review_notes && (
                                            <p className="text-xs text-slate-400 bg-red-500/10 rounded-xl px-3 py-2">駁回原因：{rv.review_notes}</p>
                                        )}

                                        {/* 審核操作 */}
                                        {rv.status === 'pending' && (
                                            <div className="space-y-2">
                                                <textarea
                                                    placeholder="駁回原因（選填，核准可留空）"
                                                    value={ptReviewNotes[rv.id] || ''}
                                                    onChange={e => setPtReviewNotes(prev => ({ ...prev, [rv.id]: e.target.value }))}
                                                    rows={2}
                                                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-indigo-500 resize-none transition-colors"
                                                />
                                                <div className="flex gap-3">
                                                    <button
                                                        disabled={ptReviewingId === rv.id}
                                                        onClick={() => handlePtReject(rv.id)}
                                                        className="flex-1 py-2.5 rounded-xl font-black text-sm text-red-400 bg-red-600/10 border border-red-600/30 active:scale-95 transition-all disabled:opacity-50"
                                                    >
                                                        ❌ 駁回
                                                    </button>
                                                    <button
                                                        disabled={ptReviewingId === rv.id}
                                                        onClick={() => handlePtApprove(rv.id)}
                                                        className="flex-[2] py-2.5 rounded-xl font-black text-sm text-white bg-emerald-600 shadow-lg shadow-emerald-900/30 active:scale-95 transition-all disabled:opacity-50"
                                                    >
                                                        {ptReviewingId === rv.id ? '處理中…' : '✅ 核准並發放修為'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                </>)}

                {/* ══ 儀表板模組 ══ */}
                {adminModule === 'dashboard' && (<>
                    <div className="space-y-8">
                        {/* 頂部工具列 */}
                        <div className="flex items-center justify-between flex-wrap gap-3">
                            <div className="flex items-center gap-2 text-sky-400 font-black text-sm uppercase tracking-widest">
                                <BarChart3 size={16} /> 儀表板
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => {
                                    setDashStats(null);
                                    loadDashStats();
                                }} disabled={dashLoading}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200 transition-all disabled:opacity-50">
                                    {dashLoading ? '載入中…' : '↻ 重新整理'}
                                </button>
                                <button onClick={() => setAdminModule(null)}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-black rounded-xl transition-all">
                                    ← 返回上一步
                                </button>
                            </div>
                        </div>

                        {/* 第一橫列：三個統計模塊 */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {/* 總參與人數 */}
                            <div className="bg-gradient-to-br from-sky-950/60 to-slate-900 border-2 border-sky-700/30 rounded-3xl p-6 flex flex-col items-center justify-center gap-2 text-center shadow-xl min-h-[140px]">
                                <div className="w-10 h-10 bg-sky-800/40 rounded-2xl flex items-center justify-center text-sky-400 mb-1">
                                    <Users size={20} />
                                </div>
                                <p className="text-[11px] font-black text-sky-400 uppercase tracking-widest">總參與人數</p>
                                {dashLoading ? (
                                    <div className="w-12 h-8 bg-slate-800 rounded-xl animate-pulse" />
                                ) : (
                                    <p className="text-4xl font-black text-white">{dashStats?.total ?? '—'}</p>
                                )}
                                <p className="text-[10px] text-slate-500">全體修行者</p>
                            </div>

                            {/* 活躍人數 */}
                            <div className="bg-gradient-to-br from-emerald-950/60 to-slate-900 border-2 border-emerald-700/30 rounded-3xl p-6 flex flex-col items-center justify-center gap-2 text-center shadow-xl min-h-[140px]">
                                <div className="w-10 h-10 bg-emerald-800/40 rounded-2xl flex items-center justify-center text-emerald-400 mb-1">
                                    <Zap size={20} />
                                </div>
                                <p className="text-[11px] font-black text-emerald-400 uppercase tracking-widest">活躍人數</p>
                                {dashLoading ? (
                                    <div className="w-12 h-8 bg-slate-800 rounded-xl animate-pulse" />
                                ) : (
                                    <p className="text-4xl font-black text-white">{dashStats?.active ?? '—'}</p>
                                )}
                                <p className="text-[10px] text-slate-500">近 2 日有回報</p>
                            </div>

                            {/* 沉寂人數 */}
                            <div className="bg-gradient-to-br from-red-950/60 to-slate-900 border-2 border-red-800/30 rounded-3xl p-6 flex flex-col items-center justify-center gap-2 text-center shadow-xl min-h-[140px]">
                                <div className="w-10 h-10 bg-red-900/40 rounded-2xl flex items-center justify-center text-red-400 mb-1">
                                    <Shield size={20} />
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <p className="text-[11px] font-black text-red-400 uppercase tracking-widest">沉寂人數</p>
                                    <button
                                        onClick={() => { if (dashStats && dashStats.fallen > 0) setShowFallenModal(true); }}
                                        disabled={dashLoading || !dashStats || dashStats.fallen === 0}
                                        className="p-1 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-30 disabled:cursor-default"
                                        title="查看沉寂名單">
                                        <Search size={12} />
                                    </button>
                                </div>
                                {dashLoading ? (
                                    <div className="w-12 h-8 bg-slate-800 rounded-xl animate-pulse" />
                                ) : (
                                    <p className="text-4xl font-black text-white">{dashStats?.fallen ?? '—'}</p>
                                )}
                                <p className="text-[10px] text-slate-500">逾 3 日無動靜</p>
                            </div>
                        </div>
                    </div>

                    {/* ── 沉寂名單彈窗 ── */}
                    {showFallenModal && dashStats && (
                        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:p-6 bg-black/80 backdrop-blur-sm"
                            onClick={() => setShowFallenModal(false)}>
                            <div className="bg-slate-900 border border-slate-700 rounded-t-4xl sm:rounded-4xl w-full sm:max-w-lg shadow-2xl flex flex-col max-h-[80vh]"
                                onClick={e => e.stopPropagation()}>
                                {/* 標題列 */}
                                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 shrink-0">
                                    <div className="flex items-center gap-2">
                                        <Shield size={15} className="text-red-400" />
                                        <p className="font-black text-white text-sm">沉寂名單</p>
                                        <span className="text-[10px] font-black bg-red-500/20 text-red-400 px-2 py-0.5 rounded-lg">{dashStats.fallen} 人</span>
                                    </div>
                                    <button onClick={() => setShowFallenModal(false)}
                                        className="p-1.5 bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors">
                                        <X size={14} />
                                    </button>
                                </div>
                                {/* 表頭 */}
                                <div className="grid grid-cols-3 px-5 py-2 border-b border-slate-800 shrink-0">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">姓名</p>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">大隊</p>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">小隊</p>
                                </div>
                                {/* 名單 */}
                                <div className="overflow-y-auto divide-y divide-slate-800/60 flex-1">
                                    {dashStats.fallenUsers.map((u, i) => (
                                        <div key={i} className="grid grid-cols-3 px-5 py-3 hover:bg-white/5 transition-colors">
                                            <p className="text-sm font-bold text-white">{u.name}</p>
                                            <p className="text-sm text-slate-400">{u.teamName ?? '—'}</p>
                                            <p className="text-sm text-slate-400">{u.squadName ?? '—'}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── 修行者修為榜 ── */}
                    <div>
                        <RankTab leaderboard={leaderboard} />
                    </div>
                </>)}

                {/* ══ Log 紀錄模組 ══ */}
                {adminModule === 'logs' && (() => {
                    const visibleLogs = freshLogs.filter(l => !trashedLogIds.has(l.id));
                    const trashedLogs = freshLogs.filter(l => trashedLogIds.has(l.id));
                    const displayLogs = showTrash ? trashedLogs : visibleLogs;
                    return (
                    <div className="space-y-6">
                        {/* 頂部工具列 */}
                        <div className="flex items-center justify-between flex-wrap gap-3">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 text-rose-400 font-black text-sm uppercase tracking-widest">
                                    <BarChart3 size={16} />
                                    {showTrash ? `回收桶（${trashedLogs.length} 筆）` : `Log 紀錄（${visibleLogs.length} 筆）`}
                                </div>
                                <button onClick={() => setShowTrash(v => !v)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all border ${showTrash ? 'bg-rose-900/40 text-rose-300 border-rose-700/40' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'}`}>
                                    🗑 回收桶{trashedLogs.length > 0 && <span className="bg-rose-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">{trashedLogs.length}</span>}
                                </button>
                                <button onClick={refreshLogs} disabled={loadingLogs}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200 transition-all disabled:opacity-50">
                                    {loadingLogs ? '載入中…' : '↻ 重新整理'}
                                </button>
                            </div>
                            <button onClick={() => { setAdminModule(null); setShowTrash(false); }}
                                className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-black rounded-xl transition-all">
                                ← 返回上一步
                            </button>
                        </div>

                        {/* 日誌列表 */}
                        <div className="bg-slate-900 border-2 border-slate-800 rounded-4xl overflow-hidden shadow-xl divide-y divide-slate-800">
                            {displayLogs.length === 0 ? (
                                <p className="text-sm text-slate-500 text-center py-10">
                                    {showTrash ? '回收桶是空的' : '尚無操作記錄'}
                                </p>
                            ) : displayLogs.map(log => (
                                <div key={log.id} className={`flex items-start gap-3 p-4 hover:bg-white/5 transition-colors ${log.result === 'error' ? 'bg-red-950/20' : ''} ${showTrash ? 'opacity-60' : ''}`}>
                                    <div className="flex-1 min-w-0 space-y-0.5">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className={`text-xs font-black ${log.result === 'error' ? 'text-red-400' : 'text-slate-200'}`}>
                                                {ACTION_LABELS[log.action] || log.action}
                                            </p>
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${log.result === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                                {log.result === 'error' ? '失敗' : '成功'}
                                            </span>
                                        </div>
                                        {log.actor && <p className="text-[10px] text-slate-500">操作者：{log.actor}</p>}
                                        {log.target_name && <p className="text-[10px] text-slate-500">對象：{log.target_name}</p>}
                                        {log.details && Object.keys(log.details).length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {Object.entries(log.details).map(([k, v]) => (
                                                    <span key={k} className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-md">
                                                        {DETAIL_LABELS[k] ?? k}：{typeof v === 'boolean' ? (v ? '是' : '否') : String(v)}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        <p className="text-[10px] text-slate-700">{new Date(log.created_at).toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                    {showTrash ? (
                                        <button
                                            onClick={() => setTrashedLogIds(prev => { const next = new Set(prev); next.delete(log.id); return next; })}
                                            className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-black text-emerald-400 hover:bg-emerald-500/10 transition-all border border-emerald-700/30"
                                            title="復原此記錄">
                                            復原
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => setTrashedLogIds(prev => new Set(prev).add(log.id))}
                                            className="shrink-0 p-2 rounded-xl text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                                            title="移至回收桶">
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                    );
                })()}

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
                                        格式：<span className="text-orange-400 font-mono">電話, 姓名, 生日(YYYY-MM-DD), 大隊, 是否大隊長, 小隊, 是否小隊長</span><br />
                                        <span className="text-slate-500 text-[10px]">電話去除開頭 0 後作為 UserID；是否大小隊長支援 true/false、1/0、Y/N；大隊長小隊欄位可留空</span>
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const header = '電話,姓名,生日(YYYY-MM-DD),大隊,是否大隊長,小隊,是否小隊長';
                                            const example = [
                                                '0912340001,王小明,1960-03-15,第一大隊,N,第一小隊,N',
                                                '0912340002,李大華,1985-07-22,第一大隊,N,第一小隊,Y',
                                                '0912340003,張美玲,1970-11-08,第一大隊,Y,,N',
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
                                    placeholder={`ex:\n0912340001,王小明,1960-03-15,第一大隊,N,第一小隊,N\n0912340002,李大華,1985-07-22,第一大隊,N,第一小隊,Y\n0912340003,張美玲,1970-11-08,第一大隊,Y,,N`}
                                    className="w-full h-36 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-mono text-xs outline-none focus:border-orange-500 resize-none" />
                                <button
                                    type="button"
                                    disabled={rosterCheckLoading || !csvInput.trim()}
                                    onClick={handlePreviewRoster}
                                    className="w-full bg-orange-600 p-4 rounded-2xl text-white font-black shadow-lg hover:bg-orange-500 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    <Search size={15} /> {rosterCheckLoading ? '檢查中…' : '🔍 預覽並檢查錯誤'}
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
                                <button
                                    onClick={onRefreshLeaderboard}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-black rounded-xl border border-slate-700 transition-colors"
                                    title="重新整理名單"
                                >
                                    <RefreshCw size={13} />
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
                                        <label className="text-[10px] text-slate-500 font-black uppercase">生日（選填）</label>
                                        <input value={addMemberForm.birthday} onChange={e => setAddMemberForm(f => ({ ...f, birthday: e.target.value }))}
                                            placeholder="YYYY-MM-DD" type="date"
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-bold outline-none focus:border-violet-500 [color-scheme:dark]" />
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
                                <select value={memberTeamFilter} onChange={e => { setMemberTeamFilter(e.target.value); setMemberSquadFilter(''); }}
                                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs font-bold outline-none focus:border-violet-500 [color-scheme:dark]">
                                    <option value="">全部大隊</option>
                                    {allTeams.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                                <select value={memberSquadFilter} onChange={e => setMemberSquadFilter(e.target.value)}
                                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs font-bold outline-none focus:border-violet-500 [color-scheme:dark]">
                                    <option value="">全部小隊</option>
                                    {allSquadsForTeam.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                {(memberFilter || memberTeamFilter || memberSquadFilter) && (
                                    <button onClick={() => { setMemberFilter(''); setMemberTeamFilter(''); setMemberSquadFilter(''); }}
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
                                                { key: 'BigTeamLeagelName', label: '大隊' },
                                                { key: 'LittleTeamLeagelName', label: '小隊' },
                                            ] as { key: MemberSortKey; label: string }[]).map(col => (
                                                <th key={col.key} onClick={() => handleMemberSort(col.key)}
                                                    className="text-left px-4 py-3 text-slate-500 font-black cursor-pointer hover:text-white transition-colors select-none">
                                                    {col.label}
                                                    {memberSort.key === col.key && <span className="ml-1 text-violet-400">{memberSort.dir === 'asc' ? '↑' : '↓'}</span>}
                                                </th>
                                            ))}
                                            <th className="text-left px-4 py-3 text-slate-500 font-black">職位</th>
                                            <th className="text-left px-4 py-3 text-slate-500 font-black">任務角色</th>
                                            {([
                                                { key: 'Level', label: '等級' },
                                                { key: 'Exp', label: '修為' },
                                            ] as { key: MemberSortKey; label: string }[]).map(col => (
                                                <th key={col.key} onClick={() => handleMemberSort(col.key)}
                                                    className="text-left px-4 py-3 text-slate-500 font-black cursor-pointer hover:text-white transition-colors select-none">
                                                    {col.label}
                                                    {memberSort.key === col.key && <span className="ml-1 text-violet-400">{memberSort.dir === 'asc' ? '↑' : '↓'}</span>}
                                                </th>
                                            ))}
                                            <th className="px-4 py-3 w-16"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/60">
                                        {filteredMembers.length === 0 ? (
                                            <tr><td colSpan={10} className="text-center py-8 text-slate-500">無符合條件的成員</td></tr>
                                        ) : filteredMembers.map((p, i) => {
                                            return (
                                                <tr key={p.UserID} className="hover:bg-white/5 transition-colors">
                                                    <td className="px-4 py-3 text-slate-600">{i + 1}</td>
                                                    <td className="px-4 py-3 font-bold text-white">{p.Name}</td>
                                                    <td className="px-4 py-3 text-slate-300">
                                                        <span>{p.BigTeamLeagelName ?? '—'}</span>
                                                        {p.BigTeamLeagelName && battalionDisplayNames[p.BigTeamLeagelName] && (
                                                            <span className="block text-[10px] text-slate-500">（{battalionDisplayNames[p.BigTeamLeagelName]}）</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-300">
                                                        <span>{p.LittleTeamLeagelName ?? '—'}</span>
                                                        {p.LittleTeamLeagelName && squadDisplayNames[p.LittleTeamLeagelName] && (
                                                            <span className="block text-[10px] text-slate-500">（{squadDisplayNames[p.LittleTeamLeagelName]}）</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {p.IsCommandant
                                                            ? <span className="text-[10px] font-black bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-lg">大隊長</span>
                                                            : p.IsCaptain
                                                                ? <span className="text-[10px] font-black bg-violet-500/20 text-violet-400 px-2 py-0.5 rounded-lg">小隊長</span>
                                                                : <span className="text-[10px] text-slate-600">學員</span>}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex flex-wrap gap-1">
                                                            {parseQuestRoles(p.QuestRole).length === 0
                                                                ? <span className="text-[10px] text-slate-700">—</span>
                                                                : parseQuestRoles(p.QuestRole).map(r => {
                                                                    const label = questRolesConfig.find(rc => rc.id === r)?.name ?? r;
                                                                    return <span key={r} className="text-[10px] font-black bg-sky-500/10 text-sky-400 px-1.5 py-0.5 rounded-lg">{label}</span>;
                                                                })}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-400">Lv.{p.Level}</td>
                                                    <td className="px-4 py-3 text-orange-400 font-bold">{p.Exp.toLocaleString()}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-1.5">
                                                            {onQuickLogin && (
                                                                <button onClick={() => onQuickLogin(p.UserID)}
                                                                    title={`快捷登入：${p.Name}`}
                                                                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-[10px] font-black transition-colors border border-emerald-500/20">
                                                                    <LogIn size={11} />
                                                                </button>
                                                            )}
                                                            <button onClick={() => { setMemberDetailTarget(p); setMemberDetailRoles(parseQuestRoles(p.QuestRole)); }}
                                                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 text-[10px] font-black transition-colors">
                                                                詳情 <ChevronRight size={11} />
                                                            </button>
                                                        </div>
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
                                        <p className="text-xs text-slate-400">{memberDetailTarget.Role} · {memberDetailTarget.BigTeamLeagelName ?? '—'} / {memberDetailTarget.LittleTeamLeagelName ?? '—'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {onQuickLogin && (
                                        <button
                                            onClick={() => onQuickLogin(memberDetailTarget.UserID)}
                                            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 rounded-xl text-xs font-black transition-colors border border-emerald-600/30"
                                        >
                                            <LogIn size={13} /> 快捷登入
                                        </button>
                                    )}
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

                                {/* 任務角色 */}
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <Tag size={12} className="text-sky-400" />
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">任務角色</p>
                                    </div>
                                    <div className="bg-slate-800 rounded-2xl p-4 space-y-3">
                                        {/* 目前角色 */}
                                        <div className="flex flex-wrap gap-2 min-h-[28px]">
                                            {memberDetailRoles.length === 0
                                                ? <span className="text-xs text-slate-600">尚未指派角色</span>
                                                : memberDetailRoles.map(role => {
                                                    const label = questRolesConfig.find(rc => rc.id === role)?.name ?? role;
                                                    return (
                                                        <button key={role}
                                                            onClick={() => setMemberDetailRoles(prev => prev.filter(r => r !== role))}
                                                            className="flex items-center gap-1 text-[11px] font-black bg-sky-500/15 text-sky-300 border border-sky-500/30 px-2.5 py-1 rounded-xl hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/30 transition-colors group">
                                                            {label} <X size={9} className="opacity-50 group-hover:opacity-100" />
                                                        </button>
                                                    );
                                                })
                                            }
                                        </div>
                                        {/* 可選角色 */}
                                        <div className="border-t border-slate-700 pt-3">
                                            <p className="text-[10px] text-slate-500 mb-2">點擊新增（最多 2 個）</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {questRolesConfig.map(rc => {
                                                    const active = memberDetailRoles.includes(rc.id);
                                                    const maxed = memberDetailRoles.length >= 2 && !active;
                                                    return (
                                                        <button key={rc.id}
                                                            disabled={maxed}
                                                            onClick={() => {
                                                                if (active) setMemberDetailRoles(prev => prev.filter(r => r !== rc.id));
                                                                else if (!maxed) setMemberDetailRoles(prev => [...prev, rc.id]);
                                                            }}
                                                            className={`text-[11px] font-black px-2.5 py-1 rounded-xl border transition-colors ${
                                                                active ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                                                                : maxed ? 'opacity-30 cursor-not-allowed bg-slate-700 text-slate-500 border-slate-600'
                                                                : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-sky-500/15 hover:text-sky-300 hover:border-sky-500/30'
                                                            }`}>
                                                            {active ? '✓ ' : ''}{rc.name}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        {/* 儲存 */}
                                        <button
                                            disabled={rolesSaving}
                                            onClick={async () => {
                                                setRolesSaving(true);
                                                const { adminSetMemberQuestRole } = await import('@/app/actions/admin');
                                                const res = await adminSetMemberQuestRole(memberDetailTarget.UserID, memberDetailRoles);
                                                setRolesSaving(false);
                                                if (!res.success) alert('儲存失敗：' + res.error);
                                            }}
                                            className="w-full py-2 bg-sky-600/20 hover:bg-sky-600/30 text-sky-400 text-xs font-black rounded-xl border border-sky-600/30 transition-colors disabled:opacity-50">
                                            {rolesSaving ? '儲存中…' : '✅ 儲存角色'}
                                        </button>
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
                            <button onClick={() => { setCourseForm(emptyCourseForm); setEditingCourseId(null); setShowCourseModal(true); }}
                                className="ml-auto flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-black rounded-xl transition-colors">
                                <Plus size={13} /> 新增課程
                            </button>
                        </div>
                        <div className="bg-slate-900 border-2 border-amber-500/20 p-8 rounded-4xl space-y-6 shadow-xl">
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

                    {/* 巔峰試煉管理 */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-2 text-purple-500 font-black text-sm uppercase tracking-widest">
                            <Trophy size={16} /> 巔峰試煉管理
                            <button onClick={() => { setPtForm(emptyPtForm); setShowPtForm(v => !v); }}
                                className="ml-auto flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-black rounded-xl transition-colors">
                                <Plus size={13} /> 新增活動
                            </button>
                        </div>
                        <div className="bg-slate-900 border-2 border-purple-500/20 p-6 rounded-4xl space-y-4 shadow-xl">
                            {/* 新增 / 編輯表單 */}
                            {showPtForm && (
                                <div className="bg-slate-800/60 border border-purple-500/20 rounded-2xl p-4 space-y-3">
                                    <p className="text-purple-300 font-black text-xs uppercase tracking-widest">
                                        {ptEditingId ? '編輯活動' : '新增巔峰試煉活動'}
                                    </p>
                                    <input value={ptForm.title} onChange={e => setPtForm(p => ({ ...p, title: e.target.value }))}
                                        placeholder="活動名稱 *"
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-purple-500" />
                                    <textarea value={ptForm.description} onChange={e => setPtForm(p => ({ ...p, description: e.target.value }))}
                                        placeholder="活動說明（選填）" rows={2}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-purple-500 resize-none" />
                                    <div className="grid grid-cols-2 gap-2">
                                        <input type="date" value={ptForm.date} onChange={e => setPtForm(p => ({ ...p, date: e.target.value }))}
                                            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-purple-500" />
                                        <input value={ptForm.time} onChange={e => setPtForm(p => ({ ...p, time: e.target.value }))}
                                            placeholder="時間（如 14:00）"
                                            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-purple-500" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input value={ptForm.location} onChange={e => setPtForm(p => ({ ...p, location: e.target.value }))}
                                            placeholder="地點（選填）"
                                            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-purple-500" />
                                        <input type="number" value={ptForm.max_participants} onChange={e => setPtForm(p => ({ ...p, max_participants: e.target.value }))}
                                            placeholder="名額上限（選填）"
                                            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-purple-500" />
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={handleSavePt} disabled={ptSaving || !ptForm.title || !ptForm.date}
                                            className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-black text-xs rounded-xl transition-colors">
                                            {ptSaving ? '儲存中…' : ptEditingId ? '✅ 更新活動' : '✅ 建立活動'}
                                        </button>
                                        <button onClick={() => { setShowPtForm(false); setPtEditingId(null); setPtForm(emptyPtForm); }}
                                            className="px-4 py-2 bg-slate-700 text-slate-300 text-xs font-black rounded-xl">取消</button>
                                    </div>
                                </div>
                            )}

                            {/* 活動列表 */}
                            {peakTrials.length === 0 && !showPtForm && (
                                <p className="text-xs text-slate-500 text-center py-4">尚無巔峰試煉活動</p>
                            )}
                            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                                {peakTrials.map(trial => {
                                    const isViewingThis = ptViewRegs?.trialId === trial.id;
                                    return (
                                        <div key={trial.id} className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
                                            <div className="flex items-center gap-3 p-4">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-black text-white">{trial.title}</span>
                                                        {trial.battalion_name && <span className="text-[10px] text-purple-400">{trial.battalion_name}</span>}
                                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${trial.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-500'}`}>
                                                            {trial.is_active ? '開放' : '關閉'}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-400 mt-1">
                                                        {trial.date}{trial.time ? ` · ${trial.time}` : ''}{trial.location ? ` · ${trial.location}` : ''}
                                                    </p>
                                                    <p className="text-[10px] text-purple-400 mt-0.5">
                                                        已報名 {trial.registration_count ?? 0} 人{trial.max_participants ? ` / 限額 ${trial.max_participants}` : ''}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <button onClick={() => handleViewPtRegs(trial.id)}
                                                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-colors ${isViewingThis ? 'bg-purple-600 text-white' : 'bg-sky-700 hover:bg-sky-600 text-white'}`}>
                                                        報名名單
                                                    </button>
                                                    <button onClick={() => openPtEdit(trial)}
                                                        className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-purple-400 transition-colors">
                                                        <Pencil size={15} />
                                                    </button>
                                                    <button onClick={() => togglePeakTrialActive(trial.id, !trial.is_active).then(refreshPtList)}
                                                        className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-purple-400 transition-colors">
                                                        {trial.is_active ? <ToggleRight size={16} className="text-emerald-400" /> : <ToggleLeft size={16} />}
                                                    </button>
                                                    <button onClick={() => handleDeletePt(trial.id)} disabled={ptDeletingId === trial.id}
                                                        className="p-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors disabled:opacity-40">
                                                        <X size={15} />
                                                    </button>
                                                </div>
                                            </div>
                                            {/* 報名名單展開 */}
                                            {isViewingThis && (
                                                <div className="border-t border-slate-800 px-4 py-3 space-y-2 max-h-64 overflow-y-auto">
                                                    <p className="text-xs text-slate-500 font-black">報名名單（{ptViewRegs.regs.length} 人）</p>
                                                    {ptViewRegs.regs.length === 0 ? (
                                                        <p className="text-xs text-slate-600 py-2">尚無人報名</p>
                                                    ) : ptViewRegs.regs.map(reg => (
                                                        <div key={reg.id} className="flex items-center gap-2">
                                                            <span className={`text-sm flex-1 ${reg.attended ? 'text-slate-500 line-through' : 'text-white'}`}>{reg.user_name}</span>
                                                            <span className="text-[10px] text-slate-500">{reg.squad_name}</span>
                                                            <span className="text-[10px] text-slate-500">{reg.battalion_name}</span>
                                                            {reg.attended ? (
                                                                <span className="text-[10px] font-black text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-lg">已出席</span>
                                                            ) : (
                                                                <button onClick={() => handleMarkPtAttendance(reg.id, trial.id)} disabled={ptMarkingId === reg.id}
                                                                    className="text-[10px] font-black text-purple-400 bg-purple-400/10 hover:bg-purple-400/20 px-2 py-0.5 rounded-lg transition-colors disabled:opacity-40">
                                                                    {ptMarkingId === reg.id ? '…' : '核銷'}
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </section>

                </>)}

                {/* ══ 任務管理模組 ══ */}
                {adminModule === 'quest' && (<>

                    {/* ── 主線任務管理（統一版） ── */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-2 text-yellow-500 font-black text-sm uppercase tracking-widest">
                            <Calendar size={16} /> 主線任務管理
                            <button onClick={() => { setMqFormEntry({ topicTitle: '', title: '', description: '', reward: '1000', coins: '100', startDate: '' }); setShowMqModal(true); }}
                                className="ml-auto flex items-center gap-1 px-3 py-1.5 bg-yellow-600 hover:bg-yellow-500 text-white text-xs font-black rounded-xl transition-colors">
                                <Plus size={13} /> 新增排程
                            </button>
                        </div>
                        <div className="bg-slate-900 border-2 border-yellow-500/20 p-6 rounded-4xl space-y-6 shadow-xl">

                            {/* 1. 當前主線任務（唯讀） */}
                            <div className="space-y-2">
                                <p className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">⚔️ 當前主線任務（唯讀）</p>
                                {activeMqEntry ? (
                                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 space-y-1">
                                        {activeMqEntry.topicTitle && (
                                            <p className="text-xs font-black text-yellow-400 uppercase tracking-widest">{activeMqEntry.topicTitle}</p>
                                        )}
                                        <p className="text-base font-bold text-white">{activeMqEntry.title}</p>
                                        {activeMqEntry.description && (
                                            <p className="text-xs text-slate-400">{activeMqEntry.description}</p>
                                        )}
                                        <p className="text-[10px] text-slate-500 pt-1">
                                            開始：{activeMqEntry.startDate}　·　+{activeMqEntry.reward} 修為　·　+{activeMqEntry.coins} 🪙
                                        </p>
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-500 italic">尚無進行中的主線任務</p>
                                )}
                            </div>

                            {/* 2. 排程列表（可編輯） */}
                            <div className="space-y-2 border-t border-slate-800 pt-5">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">排程列表</p>
                                {mainQuestSchedule.length > 0 ? (
                                    <div className="space-y-3">
                                        {mainQuestSchedule.map(entry => {
                                            const isActive = activeMqEntry?.id === entry.id;
                                            const isPast = !isActive && entry.startDate <= today;
                                            return (
                                                <div key={entry.id} className={`bg-slate-950 p-4 rounded-2xl border space-y-2 transition-all ${isActive ? 'border-yellow-500/50' : isPast ? 'border-slate-800 opacity-50' : 'border-slate-800'}`}>
                                                    <div className="flex justify-between items-start gap-3">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                                {entry.topicTitle && (
                                                                    <span className="text-[10px] font-black text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-lg">{entry.topicTitle}</span>
                                                                )}
                                                                <span className="text-[10px] font-black text-slate-500 bg-slate-800 px-2 py-0.5 rounded-lg">{entry.startDate}</span>
                                                                {isActive && <span className="text-[10px] font-black text-yellow-400 bg-yellow-500/20 px-2 py-0.5 rounded-lg">✦ 當前</span>}
                                                            </div>
                                                            <h4 className="font-bold text-slate-200">{entry.title}</h4>
                                                            {entry.description && <p className="text-xs text-slate-500 mt-0.5">{entry.description}</p>}
                                                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                                <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-lg">+{entry.reward} 修為</span>
                                                                <span className="text-[10px] font-black text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-lg">+{entry.coins} 🪙</span>
                                                            </div>
                                                        </div>
                                                        {!isActive && (
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                <button onClick={() => handleApplyMqEntry(entry)}
                                                                    className="text-[10px] font-black text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded-xl transition-colors">
                                                                    套用
                                                                </button>
                                                                <button onClick={() => handleRemoveMqEntry(entry.id)}
                                                                    className="p-2 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-colors">
                                                                    <Trash2 size={13} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-500 text-center py-4">尚無排程。新增後系統將依開始日期自動切換。</p>
                                )}
                            </div>

                            {/* 4. 歷史排程紀錄 */}
                            {topicHistory.length > 0 && (
                                <div className="border-t border-slate-800 pt-5 space-y-2">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">歷史排程紀錄</p>
                                    <div className="bg-slate-950/50 rounded-2xl border border-white/5 overflow-hidden">
                                        <div className="max-h-36 overflow-y-auto divide-y divide-white/5">
                                            {topicHistory.map(h => (
                                                <div key={h.id} className="px-3 py-2 text-xs flex justify-between items-center text-slate-300">
                                                    <span>{h.TopicTitle}</span>
                                                    <span className="text-[10px] text-slate-600">{new Date(h.created_at).toLocaleDateString('zh-TW')}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* ── 動態難度與共業系統 ── */}
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

                    <section className="space-y-6">
                        <div className="flex items-center gap-2 text-orange-500 font-black text-sm uppercase tracking-widest">
                            <Settings size={16} /> 臨時加分任務管理
                            <button onClick={() => { setTqFormTitle(''); setTqFormSub(''); setTqFormDesc(''); setTqFormReward('500'); setTqFormCoins(''); setShowTqModal(true); }}
                                className="ml-auto flex items-center gap-1 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-black rounded-xl transition-colors">
                                <Plus size={13} /> 新增任務
                            </button>
                        </div>
                        <div className="bg-slate-900 border-2 border-slate-800 p-8 rounded-4xl space-y-6 shadow-xl">
                            <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                                {temporaryQuests.map(tq => {
                                    const isEditing = tqEditId === tq.id;
                                    return (
                                        <div key={tq.id} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                                            <div className="flex justify-between items-start gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h4 className="font-bold text-slate-200">{tq.title}</h4>
                                                        <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-lg">
                                                            +{tq.reward} 修為
                                                        </span>
                                                        <span className="text-[10px] font-black text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-lg">
                                                            +{tq.coins ?? Math.floor(tq.reward * 0.1)} 🪙
                                                        </span>
                                                    </div>
                                                    {tq.sub && <p className="text-xs text-orange-400 font-bold mt-1">{tq.sub}</p>}
                                                    {tq.desc && <p className="text-xs text-slate-500 mt-0.5">{tq.desc}</p>}
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <button onClick={() => onToggleTempQuest(tq.id, !tq.active)}
                                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${tq.active ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/50' : 'bg-slate-800 text-slate-400'}`}>
                                                        {tq.active ? '🟢 啟用' : '🔴 暫停'}
                                                    </button>
                                                    <button onClick={() => {
                                                        if (isEditing) {
                                                            setTqEditId(null);
                                                        } else {
                                                            setTqEditId(tq.id);
                                                            setTqEditReward(String(tq.reward));
                                                            setTqEditCoins(tq.coins !== undefined ? String(tq.coins) : '');
                                                        }
                                                    }} className={`p-2 rounded-xl transition-colors ${isEditing ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-800 text-slate-400 hover:text-orange-400'}`}>
                                                        <Pencil size={14} />
                                                    </button>
                                                    <button onClick={() => onDeleteTempQuest(tq.id)} className="p-2 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-colors"><X size={14} /></button>
                                                </div>
                                            </div>
                                            {isEditing && (
                                                <div className="flex gap-3 items-end border-t border-slate-800 pt-3">
                                                    <div className="space-y-1 flex-1">
                                                        <label className="text-[10px] text-slate-500 font-bold">修為</label>
                                                        <input type="number" value={tqEditReward} onChange={e => setTqEditReward(e.target.value)}
                                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-bold text-center outline-none focus:border-orange-500 text-sm" />
                                                    </div>
                                                    <div className="space-y-1 flex-1">
                                                        <label className="text-[10px] text-slate-500 font-bold">金幣（空白 = × 10%）</label>
                                                        <input type="number" value={tqEditCoins} onChange={e => setTqEditCoins(e.target.value)}
                                                            placeholder="自動" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-bold text-center outline-none focus:border-orange-500 text-sm" />
                                                    </div>
                                                    <button onClick={() => {
                                                        const r = parseInt(tqEditReward, 10);
                                                        const c = tqEditCoins.trim() ? parseInt(tqEditCoins, 10) : null;
                                                        if (r > 0) { onUpdateTempQuest(tq.id, r, c); setTqEditId(null); }
                                                    }} className="flex items-center gap-1 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2.5 rounded-xl font-black text-xs transition-colors">
                                                        <Save size={13} /> 儲存
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </section>

                </>)}

                {/* ══ 參數管理模組 ══ */}
                {adminModule === 'params' && (<>
                    <BasicParamsSection systemSettings={systemSettings} updateGlobalSetting={updateGlobalSetting} />
                    <DailyQuestConfigSection />
                    <BonusQuestConfigSection systemSettings={systemSettings} updateGlobalSetting={updateGlobalSetting} />
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

            {/* ── 課程管理彈窗 ── */}
            {showCourseModal && (
                <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="w-full max-w-lg bg-slate-900 border-2 border-amber-500/30 rounded-4xl shadow-2xl my-4">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                            <p className="font-black text-white text-base">
                                {editingCourseId ? `✏️ 編輯課程：${editingCourseId}` : '➕ 新增課程'}
                            </p>
                            <button onClick={() => { setShowCourseModal(false); setCourseForm(emptyCourseForm); setEditingCourseId(null); }}
                                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors">
                                <X size={16} />
                            </button>
                        </div>
                        <form onSubmit={handleCourseSubmit} className="p-6 space-y-4">
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
                                <button type="button" onClick={() => { setShowCourseModal(false); setCourseForm(emptyCourseForm); setEditingCourseId(null); }}
                                    className="px-6 py-3 bg-slate-800 text-slate-300 rounded-2xl font-black text-sm">取消</button>
                                <button type="submit" disabled={courseSubmitting}
                                    className="flex-1 bg-amber-600 p-4 rounded-2xl text-white font-black shadow-lg hover:bg-amber-500 transition-colors disabled:opacity-50">
                                    {courseSubmitting ? '儲存中...' : editingCourseId ? '💾 更新課程' : '➕ 新增課程'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── 主線任務排程彈窗 ── */}
            {showMqModal && (
                <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="w-full max-w-lg bg-slate-900 border-2 border-yellow-500/30 rounded-4xl shadow-2xl my-4">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                            <p className="font-black text-white text-base">➕ 新增主線排程</p>
                            <button onClick={() => setShowMqModal(false)}
                                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] text-slate-500 font-bold">主標題（TopicQuestTitle，顯示於主畫面標題）</label>
                                <input value={mqFormEntry.topicTitle} onChange={e => setMqFormEntry(p => ({ ...p, topicTitle: e.target.value }))}
                                    placeholder="例：感恩月·大道至簡" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold outline-none focus:border-yellow-500 text-sm" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] text-slate-500 font-bold">任務名稱（顯示於 UI 的簡短名稱）<span className="text-red-400 ml-1">*</span></label>
                                <input value={mqFormEntry.title} onChange={e => setMqFormEntry(p => ({ ...p, title: e.target.value }))}
                                    placeholder="例：感恩修行實踐" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold outline-none focus:border-yellow-500 text-sm" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] text-slate-500 font-bold">任務說明（詳細描述）</label>
                                <textarea value={mqFormEntry.description} onChange={e => setMqFormEntry(p => ({ ...p, description: e.target.value }))}
                                    placeholder="例：每日對家人說三句感謝的話，記錄於修行日誌。" rows={2}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold outline-none focus:border-yellow-500 text-sm resize-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] text-slate-500 font-bold">修為獎勵</label>
                                    <input type="number" value={mqFormEntry.reward} onChange={e => setMqFormEntry(p => ({ ...p, reward: e.target.value }))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold outline-none focus:border-yellow-500 text-sm text-center" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-slate-500 font-bold">金幣獎勵</label>
                                    <input type="number" value={mqFormEntry.coins} onChange={e => setMqFormEntry(p => ({ ...p, coins: e.target.value }))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold outline-none focus:border-yellow-500 text-sm text-center" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] text-slate-500 font-bold flex items-center gap-1"><Calendar size={10} /> 開始日期（到期自動套用）<span className="text-red-400 ml-1">*</span></label>
                                <input type="date" value={mqFormEntry.startDate} onChange={e => setMqFormEntry(p => ({ ...p, startDate: e.target.value }))}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold outline-none focus:border-yellow-500 text-sm [color-scheme:dark]" />
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setShowMqModal(false)}
                                    className="px-6 py-3 bg-slate-800 text-slate-300 rounded-2xl font-black text-sm">取消</button>
                                <button onClick={() => { handleAddMqEntry(); setShowMqModal(false); }}
                                    disabled={!mqFormEntry.title.trim() || !mqFormEntry.startDate}
                                    className="flex-1 flex items-center justify-center gap-2 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-40 text-white p-3 rounded-2xl font-black text-sm shadow-lg transition-colors">
                                    <Plus size={15} /> 加入排程列表
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── 臨時加分任務彈窗 ── */}
            {showTqModal && (
                <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="w-full max-w-lg bg-slate-900 border-2 border-orange-500/30 rounded-4xl shadow-2xl my-4">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                            <p className="font-black text-white text-base">➕ 新增臨時加分任務</p>
                            <button onClick={() => setShowTqModal(false)}
                                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] text-slate-500 font-bold">主標題</label>
                                    <input value={tqFormTitle} onChange={e => setTqFormTitle(e.target.value)}
                                        required placeholder="固定顯示：特殊仙緣任務" className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold outline-none focus:border-orange-500" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-slate-500 font-bold">任務名稱<span className="text-red-400 ml-1">*</span></label>
                                    <input value={tqFormSub} onChange={e => setTqFormSub(e.target.value)}
                                        required placeholder="例：跟父母三道菜" className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold outline-none focus:border-orange-500" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-slate-500 font-bold">任務說明（選填）</label>
                                    <input value={tqFormDesc} onChange={e => setTqFormDesc(e.target.value)}
                                        placeholder="例：面對面或是視訊" className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold outline-none focus:border-orange-500" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] text-slate-500 font-bold">修為</label>
                                    <input type="number" value={tqFormReward} onChange={e => setTqFormReward(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold text-center outline-none focus:border-orange-500" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-slate-500 font-bold">金幣（空白 = × 10%）</label>
                                    <input type="number" value={tqFormCoins} onChange={e => setTqFormCoins(e.target.value)}
                                        placeholder="自動" className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold text-center outline-none focus:border-orange-500" />
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setShowTqModal(false)}
                                    className="px-6 py-3 bg-slate-800 text-slate-300 rounded-2xl font-black text-sm">取消</button>
                                <button
                                    disabled={!tqFormTitle.trim() || !tqFormSub.trim() || !tqFormReward}
                                    onClick={() => {
                                        const reward = parseInt(tqFormReward, 10);
                                        const coins = tqFormCoins.trim() ? parseInt(tqFormCoins, 10) : undefined;
                                        if (tqFormTitle && tqFormSub && reward) {
                                            onAddTempQuest(tqFormTitle, tqFormSub, tqFormDesc, reward, coins);
                                            setShowTqModal(false);
                                        }
                                    }}
                                    className="flex-1 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white p-4 rounded-2xl font-black shadow-lg transition-colors">
                                    ➕ 新增
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── 名冊預覽彈窗 ── */}
            {showRosterPreview && (() => {
                const errorRows = rosterPreviewRows.filter(r => r.phoneError);
                const dupBatchRows = rosterPreviewRows.filter(r => !r.phoneError && r.isDupInBatch);
                const dupDbRows = rosterPreviewRows.filter(r => !r.phoneError && !r.isDupInBatch && r.isDupInDb);
                const okRows = rosterPreviewRows.filter(r => !r.phoneError && !r.isDupInBatch && !r.isDupInDb);
                const importableCount = rosterPreviewRows.filter(r => !r.phoneError).length;
                return (
                    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
                        <div className="w-full max-w-3xl bg-slate-900 border-2 border-orange-500/30 rounded-4xl shadow-2xl my-4">
                            {/* 標題列 */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                                <div>
                                    <p className="font-black text-white text-base">名冊預覽 · 糾錯報告</p>
                                    <p className="text-xs text-slate-400 mt-0.5">共 {rosterPreviewRows.length} 筆</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    {errorRows.length > 0 && (
                                        <span className="text-[11px] font-black text-red-400 bg-red-400/10 px-2 py-1 rounded-lg">{errorRows.length} 格式錯誤</span>
                                    )}
                                    {dupBatchRows.length > 0 && (
                                        <span className="text-[11px] font-black text-orange-400 bg-orange-400/10 px-2 py-1 rounded-lg">{dupBatchRows.length} 批次重複</span>
                                    )}
                                    {dupDbRows.length > 0 && (
                                        <span className="text-[11px] font-black text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded-lg">{dupDbRows.length} 將覆蓋</span>
                                    )}
                                    {okRows.length > 0 && (
                                        <span className="text-[11px] font-black text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-lg">{okRows.length} 正常</span>
                                    )}
                                    <button onClick={() => setShowRosterPreview(false)}
                                        className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors">
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* 圖例 */}
                            <div className="flex flex-wrap gap-3 px-6 py-3 border-b border-white/5 text-[10px] font-black">
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-500/30 border border-red-500/50 inline-block" /> 格式錯誤（匯入時跳過）</span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-orange-500/30 border border-orange-500/50 inline-block" /> 批次內重複（後列覆蓋前列）</span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-yellow-500/20 border border-yellow-500/40 inline-block" /> DB 已存在（覆蓋舊資料）</span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500/20 border border-emerald-500/40 inline-block" /> 正常新增</span>
                            </div>

                            {/* 表格 */}
                            <div className="overflow-x-auto px-2 pb-2">
                                <table className="w-full text-[11px]">
                                    <thead>
                                        <tr className="text-slate-500 font-black uppercase tracking-wider">
                                            <th className="px-3 py-2 text-left">#</th>
                                            <th className="px-3 py-2 text-left">電話</th>
                                            <th className="px-3 py-2 text-left">姓名</th>
                                            <th className="px-3 py-2 text-left">生日</th>
                                            <th className="px-3 py-2 text-left">大隊</th>
                                            <th className="px-3 py-2 text-left">小隊</th>
                                            <th className="px-3 py-2 text-left">職</th>
                                            <th className="px-3 py-2 text-left">狀態</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/60">
                                        {rosterPreviewRows.map((r, i) => {
                                            const rowBg = r.phoneError
                                                ? 'bg-red-950/30'
                                                : r.isDupInBatch
                                                    ? 'bg-orange-950/30'
                                                    : r.isDupInDb
                                                        ? 'bg-yellow-950/20'
                                                        : '';
                                            return (
                                                <tr key={i} className={rowBg}>
                                                    <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                                                    <td className={`px-3 py-2 font-mono ${r.phoneError ? 'text-red-400' : 'text-white'}`}>
                                                        {r.rawPhone}
                                                    </td>
                                                    <td className="px-3 py-2 text-white">{r.name || <span className="text-slate-600">—</span>}</td>
                                                    <td className="px-3 py-2 text-slate-400">{r.birthday || <span className="text-slate-600">—</span>}</td>
                                                    <td className="px-3 py-2 text-slate-300">{r.bigTeam || <span className="text-slate-600">—</span>}</td>
                                                    <td className="px-3 py-2 text-slate-300">{r.littleTeam || <span className="text-slate-600">—</span>}</td>
                                                    <td className="px-3 py-2">
                                                        {r.isCommandant && <span className="text-rose-400 font-black">大</span>}
                                                        {r.isCaptain && <span className="text-amber-400 font-black">小</span>}
                                                        {!r.isCommandant && !r.isCaptain && <span className="text-slate-600">—</span>}
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        {r.phoneError ? (
                                                            <span className="text-red-400 font-black">{r.phoneError}</span>
                                                        ) : r.isDupInBatch ? (
                                                            <span className="text-orange-400 font-black">批次重複</span>
                                                        ) : r.isDupInDb ? (
                                                            <span className="text-yellow-400 font-black">覆蓋</span>
                                                        ) : (
                                                            <span className="text-emerald-400 font-black">新增</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* 底部操作 */}
                            <div className="px-6 py-4 border-t border-white/5 flex flex-col sm:flex-row gap-3 items-center">
                                {errorRows.length > 0 && (
                                    <p className="text-[11px] text-red-400 flex-1">⚠️ {errorRows.length} 筆格式錯誤將自動跳過，其餘 {importableCount} 筆將正常匯入。</p>
                                )}
                                {errorRows.length === 0 && (
                                    <p className="text-[11px] text-slate-400 flex-1">共 {importableCount} 筆資料將匯入，其中 {dupDbRows.length + dupBatchRows.length} 筆覆蓋舊資料。</p>
                                )}
                                <div className="flex gap-3 shrink-0">
                                    <button onClick={() => setShowRosterPreview(false)}
                                        className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-black text-sm rounded-2xl transition-colors">
                                        取消
                                    </button>
                                    <button
                                        disabled={isImporting || importableCount === 0}
                                        onClick={handleImportSubmit.bind(null, { preventDefault: () => {} })}
                                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-sm rounded-2xl transition-colors flex items-center gap-2 shadow-lg shadow-emerald-900/30"
                                    >
                                        {isImporting ? '匯入中…' : `📥 確認匯入 ${importableCount} 筆`}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

        </div>
    );
}
