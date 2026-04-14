'use client';
import React from 'react';
import { Save, ChevronRight, ChevronDown, Image as ImageIcon, Globe, ExternalLink } from 'lucide-react';
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

    // OG states
    const [ogCollapsed, setOgCollapsed] = React.useState(true);
    const [ogTitle, setOgTitle] = React.useState(systemSettings.OgTitle || '');
    const [ogDesc, setOgDesc] = React.useState(systemSettings.OgDescription || '');
    const [ogImage, setOgImage] = React.useState(systemSettings.OgImage || '');
    const [ogSaving, setOgSaving] = React.useState(false);
    const [ogSaved, setOgSaved] = React.useState(false);

    React.useEffect(() => {
        setSiteName(systemSettings.SiteName || '');
        setLogoPreview(systemSettings.SiteLogo || null);
        setOgTitle(systemSettings.OgTitle || '');
        setOgDesc(systemSettings.OgDescription || '');
        setOgImage(systemSettings.OgImage || '');
    }, [systemSettings.SiteName, systemSettings.SiteLogo, systemSettings.OgTitle, systemSettings.OgDescription, systemSettings.OgImage]);

    const handleSave = () => {
        setSaving(true);
        updateGlobalSetting('SiteName', siteName.trim() || '巨笑開運西遊');
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        logAdminAction('site_name_update', 'admin', undefined, siteName.trim() || '巨笑開運西遊');
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

    const handleOgSave = () => {
        setOgSaving(true);
        updateGlobalSetting('OgTitle', ogTitle.trim());
        updateGlobalSetting('OgDescription', ogDesc.trim());
        updateGlobalSetting('OgImage', ogImage.trim());
        setOgSaving(false);
        setOgSaved(true);
        setTimeout(() => setOgSaved(false), 2000);
        logAdminAction('og_settings_update', 'admin', undefined, undefined, {
            ogTitle: ogTitle.trim(),
            ogDescription: ogDesc.trim(),
            ogImage: ogImage.trim(),
        });
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
                        <p className="text-xs font-black text-slate-500 uppercase tracking-widest">登入頁 Logo 圖片</p>
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
                        <p className="text-xs text-slate-600">支援 PNG / JPG，建議正方形（1:1）</p>
                    </div>

                    <div className="border-t border-slate-800" />

                    {/* 名稱設定 */}
                    <div className="space-y-2">
                        <p className="text-xs font-black text-slate-500 uppercase tracking-widest">網站 / 登入頁顯示名稱</p>
                        <input
                            value={siteName}
                            onChange={e => setSiteName(e.target.value)}
                            placeholder="巨笑開運西遊"
                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-bold text-sm outline-none focus:border-orange-500"
                        />
                        <p className="text-xs text-slate-600">留空則使用預設名稱「巨笑開運西遊」</p>
                    </div>
                    <button onClick={handleSave} disabled={saving}
                        className="w-full py-3 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white font-black text-sm rounded-2xl transition-colors">
                        {saving ? '儲存中…' : saved ? '✓ 已儲存' : '儲存名稱'}
                    </button>

                    <div className="border-t border-slate-800" />

                    {/* ── OG 社群分享設定 ── */}
                    <button onClick={() => setOgCollapsed(v => !v)}
                        className="flex items-center gap-2 text-cyan-400 font-black text-sm uppercase tracking-widest w-full text-left">
                        <Globe size={16} /> 社群分享設定（LINE / Facebook）
                        {ogCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                    </button>
                    {!ogCollapsed && (
                        <div className="bg-slate-950 border border-cyan-500/20 p-5 rounded-3xl space-y-4">
                            <p className="text-xs text-slate-500 leading-relaxed">
                                設定網址在 LINE、Facebook 等平台分享時顯示的標題、描述與預覽圖片。
                                <br />儲存後需等待平台清除快取（LINE 約 1 小時）才會更新。
                            </p>

                            {/* OG 預覽 */}
                            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 space-y-2">
                                <p className="text-xs font-black text-slate-500 uppercase tracking-widest">預覽效果</p>
                                <div className="bg-white rounded-xl overflow-hidden shadow-lg max-w-xs">
                                    {ogImage && (
                                        <div className="w-full h-32 bg-slate-200 overflow-hidden">
                                            <img src={ogImage} alt="OG 預覽" className="w-full h-full object-cover"
                                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                        </div>
                                    )}
                                    <div className="p-3 space-y-1">
                                        <p className="text-slate-900 font-bold text-sm truncate">
                                            {ogTitle || systemSettings.SiteName || '巨笑開運西遊'}
                                        </p>
                                        <p className="text-slate-500 text-xs line-clamp-2">
                                            {ogDesc || '修行者轉生入口 — 2026 大無限開運親證班'}
                                        </p>
                                        <p className="text-slate-400 text-xs">bigsmile.mindsuces.com</p>
                                    </div>
                                </div>
                            </div>

                            {/* OG Title */}
                            <div className="space-y-1">
                                <p className="text-xs font-black text-slate-500 uppercase tracking-widest">分享標題（og:title）</p>
                                <input
                                    value={ogTitle}
                                    onChange={e => setOgTitle(e.target.value)}
                                    placeholder={systemSettings.SiteName || '巨笑開運西遊'}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white font-bold text-sm outline-none focus:border-cyan-500 transition-colors"
                                />
                                <p className="text-xs text-slate-600">留空則使用網站名稱</p>
                            </div>

                            {/* OG Description */}
                            <div className="space-y-1">
                                <p className="text-xs font-black text-slate-500 uppercase tracking-widest">分享描述（og:description）</p>
                                <textarea
                                    value={ogDesc}
                                    onChange={e => setOgDesc(e.target.value)}
                                    placeholder="修行者轉生入口 — 2026 大無限開運親證班"
                                    rows={2}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-sm outline-none focus:border-cyan-500 transition-colors resize-none"
                                />
                                <p className="text-xs text-slate-600">留空則使用預設描述</p>
                            </div>

                            {/* OG Image */}
                            <div className="space-y-1">
                                <p className="text-xs font-black text-slate-500 uppercase tracking-widest">分享圖片（og:image）</p>
                                <input
                                    value={ogImage}
                                    onChange={e => setOgImage(e.target.value)}
                                    placeholder="https://example.com/og-image.jpg"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-sm outline-none focus:border-cyan-500 transition-colors"
                                />
                                <GalleryPickerButton label="🖼 從圖片庫選取" onSelect={url => setOgImage(url)} />
                                <p className="text-xs text-slate-600">建議尺寸 1200×630px，需為完整的公開 URL（不支援 base64）</p>
                            </div>

                            <button onClick={handleOgSave} disabled={ogSaving}
                                className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white font-black text-sm rounded-2xl transition-colors">
                                {ogSaving ? '儲存中…' : ogSaved ? '✓ 已儲存' : '儲存社群分享設定'}
                            </button>

                            <div className="flex items-center gap-2 text-xs text-slate-600">
                                <ExternalLink size={10} />
                                <span>儲存後可用</span>
                                <a href="https://poker.line.naver.jp" target="_blank" rel="noopener noreferrer"
                                    className="text-cyan-500 underline hover:text-cyan-400">LINE Page Poker</a>
                                <span>測試預覽效果</span>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}
