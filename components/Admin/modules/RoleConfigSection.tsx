'use client';
import React from 'react';
import { Users, ChevronRight, ChevronDown } from 'lucide-react';
import { ROLE_CURE_MAP } from '@/lib/constants';

export function RoleConfigSection() {
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

