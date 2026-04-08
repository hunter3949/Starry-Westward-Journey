'use client';
import React from 'react';
import { X, Upload, Trash2, FolderOpen, Image as ImageIcon, Copy, ChevronRight, ChevronDown } from 'lucide-react';
import { logAdminAction } from '@/app/actions/admin';

const PRESET_FOLDERS = ['gallery', 'quest-icons', 'artifacts'];

export function ImageGallerySection() {
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

