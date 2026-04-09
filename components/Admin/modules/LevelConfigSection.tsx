'use client';
import React from 'react';
import { Save, ChevronRight, ChevronDown, RotateCcw } from 'lucide-react';

interface LevelRow { level: number; exp_required: number; }

export function LevelConfigSection() {
    const [collapsed, setCollapsed] = React.useState(true);
    const [rows, setRows] = React.useState<LevelRow[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const [saved, setSaved] = React.useState(false);
    const [editedLevels, setEditedLevels] = React.useState<Set<number>>(new Set());

    const load = React.useCallback(async () => {
        setLoading(true);
        try {
            const { listLevelConfig } = await import('@/app/actions/admin');
            const data = await listLevelConfig();
            if (data.length > 0) {
                setRows(data);
            } else {
                // fallback: 用公式生成
                setRows(Array.from({ length: 99 }, (_, i) => ({ level: i + 1, exp_required: (i + 1) * 5 + 480 })));
            }
        } catch {
            setRows(Array.from({ length: 99 }, (_, i) => ({ level: i + 1, exp_required: (i + 1) * 5 + 480 })));
        }
        setLoading(false);
    }, []);

    React.useEffect(() => { if (!collapsed) load(); }, [collapsed, load]);

    const handleChange = (level: number, value: number) => {
        setRows(prev => prev.map(r => r.level === level ? { ...r, exp_required: value } : r));
        setEditedLevels(prev => new Set(prev).add(level));
        setSaved(false);
    };

    const handleSave = async () => {
        if (editedLevels.size === 0) return;
        setSaving(true);
        const { batchUpdateLevelConfig } = await import('@/app/actions/admin');
        const changed = rows.filter(r => editedLevels.has(r.level));
        const res = await batchUpdateLevelConfig(changed);
        setSaving(false);
        if (res.success) {
            setSaved(true);
            setEditedLevels(new Set());
            setTimeout(() => setSaved(false), 2000);
        } else {
            alert(res.error ?? '儲存失敗');
        }
    };

    const handleReset = async () => {
        if (!confirm('確定重置所有等級門檻為預設公式（level × 5 + 480）？')) return;
        setSaving(true);
        const { resetLevelConfigToDefault } = await import('@/app/actions/admin');
        await resetLevelConfigToDefault();
        await load();
        setEditedLevels(new Set());
        setSaving(false);
    };

    // 累計經驗計算
    const cumulativeExp = React.useMemo(() => {
        const cum: number[] = [0]; // Lv.1 需要 0 累計
        for (let i = 0; i < rows.length; i++) {
            cum.push(cum[i] + rows[i].exp_required);
        }
        return cum;
    }, [rows]);

    return (
        <section className="space-y-4">
            <button onClick={() => setCollapsed(c => !c)}
                className="flex items-center gap-2 text-cyan-400 font-black text-sm uppercase tracking-widest hover:text-cyan-300 transition-colors">
                📊 等級管理
                {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            </button>

            {!collapsed && (
                <div className="bg-slate-900 border-2 border-cyan-500/20 p-6 rounded-4xl shadow-xl space-y-4">
                    <p className="text-xs text-slate-500">設定每一級的升級門檻（從上一級升到此級所需的修為）。預設公式：等級 × 5 + 480。</p>

                    <div className="flex gap-2">
                        <button onClick={handleSave} disabled={saving || editedLevels.size === 0}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all ${saved ? 'bg-emerald-600 text-white' : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg'} disabled:opacity-40`}>
                            <Save size={13} /> {saved ? '✓ 已儲存' : saving ? '儲存中...' : `儲存 (${editedLevels.size} 項)`}
                        </button>
                        <button onClick={handleReset} disabled={saving}
                            className="flex items-center gap-1.5 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-black rounded-xl transition-colors disabled:opacity-40">
                            <RotateCcw size={13} /> 重置為預設
                        </button>
                    </div>

                    {loading ? (
                        <p className="text-xs text-slate-500 text-center py-6">載入中...</p>
                    ) : (
                        <div className="max-h-[500px] overflow-y-auto rounded-2xl border border-slate-800">
                            <table className="w-full text-xs">
                                <thead className="sticky top-0 bg-slate-800 z-10">
                                    <tr>
                                        <th className="py-2 px-3 text-left text-slate-400 font-black">等級</th>
                                        <th className="py-2 px-3 text-center text-slate-400 font-black">升級所需修為</th>
                                        <th className="py-2 px-3 text-right text-slate-400 font-black">累計修為</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                    {rows.map((r, i) => {
                                        const isEdited = editedLevels.has(r.level);
                                        const defaultVal = r.level * 5 + 480;
                                        const isCustom = r.exp_required !== defaultVal;
                                        return (
                                            <tr key={r.level} className={`${isEdited ? 'bg-cyan-950/30' : ''} hover:bg-white/5`}>
                                                <td className="py-1.5 px-3">
                                                    <span className={`font-black ${r.level <= 10 ? 'text-slate-400' : r.level <= 30 ? 'text-blue-400' : r.level <= 60 ? 'text-purple-400' : 'text-yellow-400'}`}>
                                                        Lv.{r.level}
                                                    </span>
                                                </td>
                                                <td className="py-1.5 px-3 text-center">
                                                    <input type="number" min={1} value={r.exp_required}
                                                        onChange={e => handleChange(r.level, parseInt(e.target.value) || 1)}
                                                        className={`w-24 bg-slate-950 border rounded-lg px-2 py-1 text-white font-bold text-center outline-none text-xs ${isCustom ? 'border-cyan-500/50' : 'border-slate-700'} focus:border-cyan-500`} />
                                                </td>
                                                <td className="py-1.5 px-3 text-right text-slate-500 font-mono">
                                                    {cumulativeExp[i + 1]?.toLocaleString()}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}
