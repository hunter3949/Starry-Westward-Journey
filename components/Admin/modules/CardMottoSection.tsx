'use client';
import React from 'react';
import { X, Plus, ChevronRight, ChevronDown, Tag, Pencil, Trash2 } from 'lucide-react';
import { logAdminAction } from '@/app/actions/admin';
import { GalleryPickerButton } from '../shared/IconPicker';

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


export function CardMottoSection() {
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

