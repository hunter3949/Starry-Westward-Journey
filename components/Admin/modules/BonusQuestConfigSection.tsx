'use client';
import React from 'react';
import { Save, X, Pencil, Plus, ChevronRight, ChevronDown, ChevronUp, Download } from 'lucide-react';
import type { BonusQuestRule, SystemSettings } from '@/types';
import { IconPicker } from '../shared/IconPicker';

const DEFAULT_RULES: BonusQuestRule[] = [
    { id: 'w1', label: '小天使通話', sub: '關心夥伴 (15min)', icon: '👼', reward: 500, coins: null, limit: 1, keywords: ['小天使通話', '與家人互動', '親證圓夢'], bonusType: 'energy_dice', bonusAmount: 1, active: true },
    { id: 'w2', label: '參加心成活動', sub: '聚會、培訓、活動', icon: '🏛️', reward: 500, coins: null, limit: 2, keywords: ['心成', '同學會', '定聚'], bonusType: 'energy_dice', bonusAmount: 2, active: true },
    { id: 'w3', label: '家人互動親證', sub: '視訊或品質陪伴', icon: '🏠', reward: 500, coins: null, limit: 1, keywords: ['家人互動', '親證'], bonusType: 'energy_dice', bonusAmount: 1, active: true },
    { id: 'w4', label: '傳愛分數', sub: '訪談成功加分', icon: '❤️', reward: 1000, coins: null, limit: 99, keywords: ['傳愛'], bonusType: 'energy_dice', bonusAmount: 1, active: true },
    { id: 'b_topic', label: '大會主題活動', sub: '主題親證相關', icon: '🎖️', reward: 0, coins: null, limit: 99, keywords: ['主題親證', '會長交接', '大會'], bonusType: 'golden_dice', bonusAmount: 1, active: true },
];

const EMPTY_FORM: BonusQuestRule = {
    id: '', label: '', sub: '', icon: '', reward: 500, coins: null, limit: 1, limitPeriod: 'week',
    keywords: [], bonusType: 'energy_dice', bonusAmount: 1, active: true,
};

export function BonusQuestConfigSection({ systemSettings, updateGlobalSetting }: { systemSettings: SystemSettings; updateGlobalSetting: (key: string, value: string) => void }) {
    const [collapsed, setCollapsed] = React.useState(false);
    const [editingId, setEditingId] = React.useState<string | null>(null);
    const [formOpen, setFormOpen] = React.useState(false);
    const [form, setForm] = React.useState<BonusQuestRule>(EMPTY_FORM);
    const [keywordsStr, setKeywordsStr] = React.useState('');

    const rules: BonusQuestRule[] = React.useMemo(() => {
        try { return JSON.parse(systemSettings.BonusQuestConfig ?? '[]'); } catch { return DEFAULT_RULES; }
    }, [systemSettings.BonusQuestConfig]);

    const save = (updated: BonusQuestRule[]) => updateGlobalSetting('BonusQuestConfig', JSON.stringify(updated));

    const openNew = () => {
        setForm({ ...EMPTY_FORM, id: `b_${Date.now()}` });
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
        if (!form.label.trim()) return;
        const updated: BonusQuestRule = { ...form, keywords: kws };
        const newRules = editingId
            ? rules.map(r => r.id === editingId ? updated : r)
            : [...rules, updated];
        save(newRules);
        setFormOpen(false);
    };

    const handleDelete = (id: string) => {
        const target = rules.find(r => r.id === id);
        if (!confirm(`確定刪除副本「${target?.label || id}」？此操作無法復原。`)) return;
        save(rules.filter(r => r.id !== id));
    };
    const handleToggle = (id: string) => { save(rules.map(r => r.id === id ? { ...r, active: !r.active } : r)); };
    const handleMove = (idx: number, dir: -1 | 1) => {
        const target = idx + dir;
        if (target < 0 || target >= rules.length) return;
        const arr = [...rules];
        [arr[idx], arr[target]] = [arr[target], arr[idx]];
        save(arr);
    };
    const handleSeedDefaults = () => {
        if (!confirm('將匯入預設副本規則（已存在的 ID 會略過）。確定執行？')) return;
        const existingIds = new Set(rules.map(r => r.id));
        const newRules = DEFAULT_RULES.filter(d => !existingIds.has(d.id));
        if (newRules.length === 0) { alert('所有預設規則已存在，無需匯入。'); return; }
        save([...rules, ...newRules]);
    };

    return (
        <section className="space-y-4">
            <button onClick={() => setCollapsed(v => !v)}
                className="flex items-center gap-2 text-orange-400 font-black text-sm uppercase tracking-widest w-full text-left">
                <span className="text-lg">🎯</span> 副本任務管理
                {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            </button>
            {!collapsed && (
                <div className="bg-slate-900 border-2 border-orange-500/20 p-6 rounded-4xl space-y-5 shadow-xl">
                    <p className="text-xs text-slate-500">每個副本定義完整的打卡獎勵（修為、金幣、次數上限），以及關鍵字觸發的額外骰子。</p>

                    {/* 規則列表 */}
                    <div className="space-y-2">
                        {rules.map((r, idx) => (
                            <div key={r.id} className={`p-4 rounded-2xl border transition-all ${r.active ? 'border-slate-700 bg-slate-800/50' : 'border-slate-800 bg-slate-900/50 opacity-50'}`}>
                                <div className="flex items-center gap-3">
                                    <div className="flex flex-col gap-0.5 shrink-0">
                                        <button onClick={() => handleMove(idx, -1)} disabled={idx === 0}
                                            className="p-0.5 text-slate-600 hover:text-white disabled:opacity-20 transition-colors"><ChevronUp size={14} /></button>
                                        <button onClick={() => handleMove(idx, 1)} disabled={idx === rules.length - 1}
                                            className="p-0.5 text-slate-600 hover:text-white disabled:opacity-20 transition-colors"><ChevronDown size={14} /></button>
                                    </div>
                                    <span className="text-2xl shrink-0">{r.icon || '📋'}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="font-bold text-sm text-white">{r.label}</p>
                                            <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-orange-500/20 text-orange-300">
                                                +{r.reward} 修為
                                            </span>
                                            {r.coins != null && (
                                                <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-yellow-500/20 text-yellow-300">
                                                    +{r.coins} 金幣
                                                </span>
                                            )}
                                            <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${r.bonusType === 'energy_dice' ? 'bg-blue-500/20 text-blue-300' : 'bg-yellow-500/20 text-yellow-300'}`}>
                                                {r.bonusType === 'energy_dice' ? `⚡ +${r.bonusAmount} 能量骰` : `✨ +${r.bonusAmount} 黃金骰`}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            {r.sub && <span className="text-slate-400 mr-2">{r.sub}</span>}
                                            上限 {r.limit}/{r.limitPeriod === 'month' ? '月' : '週'} · 關鍵字：{r.keywords.length > 0 ? r.keywords.join('、') : '（無）'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button onClick={() => handleToggle(r.id)}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${r.active ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/50' : 'bg-slate-800 text-slate-500'}`}>
                                            {r.active ? '啟用' : '停用'}
                                        </button>
                                        <button onClick={() => openEdit(r)} className="p-2 bg-slate-800 text-slate-400 hover:text-orange-400 rounded-xl transition-colors"><Pencil size={13} /></button>
                                        <button onClick={() => handleDelete(r.id)} className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl transition-colors"><X size={13} /></button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {rules.length === 0 && (
                            <p className="text-sm text-slate-500 text-center py-6">尚無副本規則。</p>
                        )}
                    </div>

                    {/* 新增/編輯表單 */}
                    {formOpen && (
                        <div className="border-t border-slate-800 pt-5 space-y-3">
                            <p className="text-xs font-black text-slate-500 uppercase tracking-widest">{editingId ? '編輯副本' : '新增副本'}</p>
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-500 font-bold">副本名稱 *</label>
                                        <input value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))}
                                            placeholder="例：參加心成活動" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold outline-none focus:border-orange-500 text-sm" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-500 font-bold">副標題</label>
                                        <input value={form.sub ?? ''} onChange={e => setForm(p => ({ ...p, sub: e.target.value || undefined }))}
                                            placeholder="例：聚會、培訓、活動" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold outline-none focus:border-orange-500 text-sm" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-xs text-orange-400 font-bold">修為獎勵</label>
                                        <input type="number" min={0} value={form.reward}
                                            onChange={e => setForm(p => ({ ...p, reward: parseInt(e.target.value) || 0 }))}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold text-center outline-none focus:border-orange-500 text-sm" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-yellow-400 font-bold">金幣獎勵 <span className="text-slate-600 font-normal">空=修為×0.1</span></label>
                                        <input type="number" min={0} placeholder={`${Math.floor(form.reward * 0.1)}`}
                                            value={form.coins ?? ''}
                                            onChange={e => setForm(p => ({ ...p, coins: e.target.value !== '' ? parseInt(e.target.value) : null }))}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold text-center outline-none focus:border-yellow-500 text-sm" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-xs text-blue-400 font-bold">上限次數</label>
                                        <input type="number" min={1} value={form.limit}
                                            onChange={e => setForm(p => ({ ...p, limit: parseInt(e.target.value) || 1 }))}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold text-center outline-none focus:border-blue-500 text-sm" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-blue-400 font-bold">上限週期</label>
                                        <select value={form.limitPeriod ?? 'week'}
                                            onChange={e => setForm(p => ({ ...p, limitPeriod: e.target.value as 'week' | 'month' }))}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold outline-none focus:border-blue-500 text-sm">
                                            <option value="week">每週</option>
                                            <option value="month">每月</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs text-slate-500 font-bold">觸發關鍵字（逗號或頓號分隔，打卡標題命中時額外送骰子）</label>
                                    <input value={keywordsStr} onChange={e => setKeywordsStr(e.target.value)}
                                        placeholder="例：心成、同學會、定聚" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold outline-none focus:border-orange-500 text-sm" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-500 font-bold">額外骰子類型</label>
                                        <select value={form.bonusType} onChange={e => setForm(p => ({ ...p, bonusType: e.target.value as 'energy_dice' | 'golden_dice' }))}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold outline-none focus:border-orange-500 text-sm">
                                            <option value="energy_dice">⚡ 能量骰</option>
                                            <option value="golden_dice">✨ 黃金骰</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-500 font-bold">骰子數量</label>
                                        <input type="number" min={0} value={form.bonusAmount} onChange={e => setForm(p => ({ ...p, bonusAmount: parseInt(e.target.value) || 0 }))}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold text-center outline-none focus:border-orange-500 text-sm" />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs text-slate-500 font-bold">圖示</label>
                                    <IconPicker value={form.icon || ''} onChange={v => setForm(p => ({ ...p, icon: v || undefined }))} />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button onClick={handleSave} disabled={!form.label.trim()}
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
