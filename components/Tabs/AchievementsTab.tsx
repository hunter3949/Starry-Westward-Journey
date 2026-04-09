import { useState, useEffect } from 'react';
import { ACHIEVEMENTS, ACHIEVEMENT_MAP, RARITY_STYLE, type AchievementDef } from '@/lib/achievements';
import { AchievementIcon } from '@/components/AchievementIcon';
import type { AchievementRecord, CharacterStats } from '@/types';

// 從 DB 讀取成就定義，覆蓋 name/icon/hint/description/is_active
async function loadAchievementDefs(): Promise<AchievementDef[]> {
    try {
        const { listAchievementConfig } = await import('@/app/actions/admin');
        const rows = await listAchievementConfig();
        if (rows.length > 0) {
            const dbMap = new Map(rows.map(r => [r.id, r]));
            // 以 ACHIEVEMENTS 為骨架（保留 unlock 邏輯用的 id），用 DB 覆蓋顯示欄位
            return ACHIEVEMENTS.map(def => {
                const db = dbMap.get(def.id);
                if (!db) return def;
                return {
                    ...def,
                    name: db.name || def.name,
                    icon: db.icon || def.icon,
                    hint: db.hint || def.hint,
                    description: db.description || def.description,
                    rarity: (db.rarity as AchievementDef['rarity']) || def.rarity,
                    roleExclusive: db.role_exclusive ?? def.roleExclusive,
                };
            }).filter(def => {
                const db = rows.find(r => r.id === def.id);
                return db ? db.is_active : true; // 被停用的成就不顯示
            });
        }
    } catch { /* DB 不存在 fallback */ }
    return ACHIEVEMENTS;
}

interface AchievementsTabProps {
    achievements: AchievementRecord[];
    userData: CharacterStats;
}

type RarityFilter = 'all' | 'common' | 'rare' | 'epic' | 'legendary';

const FILTER_LABELS: { key: RarityFilter; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'common', label: '常見' },
    { key: 'rare', label: '罕見' },
    { key: 'epic', label: '稀有' },
    { key: 'legendary', label: '傳說' },
];

function AchievementCard({ def, unlocked_at, isOwner }: {
    def: AchievementDef;
    unlocked_at?: string;
    isOwner: boolean;
}) {
    if (unlocked_at) {
        const style = RARITY_STYLE[def.rarity];
        const date = unlocked_at.slice(0, 10);
        return (
            <div className={`relative min-h-[100px] p-4 rounded-2xl border-2 ${style.border} ${style.bg} shadow-lg ${style.glow} flex flex-col items-center text-center gap-1`}>
                <AchievementIcon def={def} size="lg" />
                <span className={`font-black text-sm leading-tight ${style.text} mt-1`}>{def.name}</span>
                <div className={`text-[10px] font-bold uppercase tracking-widest ${style.text} opacity-70`}>
                    {RARITY_STYLE[def.rarity].label}
                </div>
                <p className="text-xs text-slate-300 leading-snug mt-1">{def.description}</p>
                <p className="text-[9px] text-slate-500 mt-auto pt-1">{date} 解鎖</p>
            </div>
        );
    }

    if (def.roleExclusive && !isOwner) {
        return (
            <div className="relative min-h-[100px] p-4 rounded-2xl border-2 border-slate-800 bg-slate-900/30 flex flex-col items-center justify-center opacity-40 gap-1">
                <span className="text-xl">🚫</span>
                <p className="text-[10px] text-slate-500 text-center leading-tight">此成就與你的<br />職業無緣</p>
            </div>
        );
    }

    return (
        <div className="relative min-h-[100px] p-4 rounded-2xl border-2 border-slate-800 bg-slate-900/20 flex flex-col gap-1">
            <div className="flex items-center gap-2">
                <span className="text-xl opacity-50">🔒</span>
                <span className="font-black text-sm text-slate-600">???</span>
            </div>
            <p className="text-[10px] text-slate-600 italic leading-snug mt-1">{def.hint}</p>
        </div>
    );
}

export function AchievementsTab({ achievements, userData }: AchievementsTabProps) {
    const [filter, setFilter] = useState<RarityFilter>('all');
    const [achDefs, setAchDefs] = useState<AchievementDef[]>(ACHIEVEMENTS);

    useEffect(() => { loadAchievementDefs().then(setAchDefs); }, []);

    const unlockedMap = new Map(achievements.map(a => [a.achievement_id, a.unlocked_at]));
    const unlockedCount = achievements.length;
    const achievableCount = achDefs.filter(
        def => !def.roleExclusive || def.roleExclusive === userData.Role
    ).length;
    const progressPct = achievableCount > 0 ? Math.round((unlockedCount / achievableCount) * 100) : 0;

    const filtered = (filter === 'all' ? achDefs : achDefs.filter(a => a.rarity === filter))
        .filter(def => !def.roleExclusive || def.roleExclusive === userData.Role);

    return (
        <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
            <div className="bg-slate-900 border-2 border-amber-500/30 rounded-3xl p-5 text-center">
                <p className="text-xs font-black text-amber-400 uppercase tracking-widest mb-1">成就殿堂</p>
                <p className="text-2xl font-black text-white">
                    {unlockedCount} <span className="text-slate-500 text-lg">/ {achievableCount}</span>
                </p>
                <div className="mt-3 w-full bg-slate-800 rounded-full h-2">
                    <div
                        className="h-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
                        style={{ width: `${progressPct}%` }}
                    />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">{progressPct}% 完成</p>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {FILTER_LABELS.map(({ key, label }) => (
                    <button
                        key={key}
                        onClick={() => setFilter(key)}
                        className={`shrink-0 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                            filter === key
                                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20'
                                : 'bg-slate-900 text-slate-400'
                        }`}
                    >
                        {label}
                        {key !== 'all' && (
                            <span className="ml-1 opacity-60">
                                ({achievements.filter(a => ACHIEVEMENT_MAP.get(a.achievement_id)?.rarity === key).length})
                            </span>
                        )}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
                {filtered.map(def => (
                    <AchievementCard
                        key={def.id}
                        def={def}
                        unlocked_at={unlockedMap.get(def.id)}
                        isOwner={!def.roleExclusive || def.roleExclusive === userData.Role}
                    />
                ))}
            </div>
        </div>
    );
}
