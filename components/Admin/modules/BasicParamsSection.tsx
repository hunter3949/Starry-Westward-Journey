'use client';
import React from 'react';
import { Save, ChevronRight, ChevronDown, Image as ImageIcon } from 'lucide-react';
import type { SystemSettings } from '@/types';
import { logAdminAction } from '@/app/actions/admin';
import { GalleryPickerButton } from '../shared/IconPicker';

export function BasicParamsSection({ systemSettings, updateGlobalSetting }: { systemSettings: SystemSettings; updateGlobalSetting: (key: string, value: string) => void }) {
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

