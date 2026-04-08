'use client';
import React from 'react';
import { X, Image as ImageIcon, ChevronDown } from 'lucide-react';

export const PRESET_FOLDERS = ['gallery', 'quest-icons', 'artifacts'];

export function IconPicker({ value, onChange }: {
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

            {open && (
                <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4 bg-black/80 backdrop-blur-sm"
                    onClick={() => setOpen(false)}>
                    <div className="bg-slate-900 border border-slate-700 rounded-t-4xl sm:rounded-4xl w-full sm:max-w-lg shadow-2xl flex flex-col max-h-[80vh]"
                        onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 shrink-0">
                            <p className="font-black text-white text-sm">選擇圖示</p>
                            <button onClick={() => setOpen(false)} className="p-1.5 bg-slate-800 rounded-xl text-slate-400 hover:text-white"><X size={14} /></button>
                        </div>
                        <div className="flex shrink-0 border-b border-slate-800">
                            {(['emoji', 'gallery'] as const).map(t => (
                                <button key={t} onClick={() => setTab(t)}
                                    className={`flex-1 py-3 text-xs font-black transition-colors ${tab === t ? 'text-orange-400 border-b-2 border-orange-400' : 'text-slate-500 hover:text-slate-300'}`}>
                                    {t === 'emoji' ? '✨ Emoji' : '🖼 圖片庫'}
                                </button>
                            ))}
                        </div>
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

export function GalleryPickerButton({ onSelect, label = '🖼 從圖片庫選取' }: { onSelect: (url: string) => void; label?: string }) {
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
