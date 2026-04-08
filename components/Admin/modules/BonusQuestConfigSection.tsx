'use client';
import React from 'react';
import { Save, X, Pencil, Plus, ChevronRight, ChevronDown, Download } from 'lucide-react';
import type { BonusQuestRule, SystemSettings } from '@/types';

const DEFAULT_BONUS_RULES: BonusQuestRule[] = [
    { id: 'b1', label: '家人互動親證', keywords: ['小天使通話', '與家人互動', '親證圓夢'], bonusType: 'energy_dice', bonusAmount: 1, active: true },
    { id: 'b2', label: '參加心成活動', keywords: ['心成', '同學會', '定聚'], bonusType: 'energy_dice', bonusAmount: 2, active: true },
    { id: 'b3', label: '傳愛分數', keywords: ['傳愛'], bonusType: 'energy_dice', bonusAmount: 1, active: true },
    { id: 'b4', label: '大會主題活動', keywords: ['主題親證', '會長交接', '大會'], bonusType: 'golden_dice', bonusAmount: 1, active: true },
];

export function BonusQuestConfigSection({ systemSettings, updateGlobalSetting }: { systemSettings: SystemSettings; updateGlobalSetting: (key: string, value: string) => void }) {
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
