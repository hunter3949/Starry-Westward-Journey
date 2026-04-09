import { useState, useEffect } from 'react';
import { CharacterStats } from '@/types';

interface HistoryTabProps {
    logs: any[];
    userData: CharacterStats;
    isCaptain?: boolean;
    squadName?: string;
}

type FilterType = 'all' | 'exp' | 'coins';
type ViewMode = 'personal' | 'squad';

interface TxEntry {
    id: string;
    type: string;
    label: string;
    exp: number;
    coins: number;
    dateStr: string;
    timeStr: string;
    userName?: string;
}

const TYPE_LABELS: Record<string, string> = {
    quest_checkin: '定課打卡',
    artifact_purchase: '法寶購買',
    coin_transfer: '金幣捐贈',
    course_reward: '課程報到',
    peak_trial_reward: '巔峰試煉',
    bonus_settle: '額外獎勵',
    skill_reward: '技能獎勵',
};

function parseTxEntries(logs: any[]): TxEntry[] {
    return logs.map(tx => {
        const date = new Date(tx.created_at);
        return {
            id: tx.id,
            type: tx.type,
            label: tx.label,
            exp: tx.exp_delta ?? 0,
            coins: tx.coins_delta ?? 0,
            dateStr: date.toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' }),
            timeStr: date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
            userName: tx.userName,
        };
    });
}

export function HistoryTab({ userData, isCaptain, squadName }: HistoryTabProps) {
    const [filter, setFilter] = useState<FilterType>('all');
    const [viewMode, setViewMode] = useState<ViewMode>('personal');
    const [entries, setEntries] = useState<TxEntry[]>([]);
    const [squadEntries, setSquadEntries] = useState<TxEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const { getTransactionLogs } = await import('@/app/actions/txlog');
                const txLogs = await getTransactionLogs(userData.UserID);
                setEntries(parseTxEntries(txLogs));
            } catch { setEntries([]); }
            setLoading(false);
        })();
    }, [userData.UserID]);

    // 小隊長切換到小隊視圖時載入
    useEffect(() => {
        if (viewMode !== 'squad' || !squadName) return;
        (async () => {
            setLoading(true);
            try {
                const { getSquadTeamLogs } = await import('@/app/actions/txlog');
                const logs = await getSquadTeamLogs(squadName);
                setSquadEntries(parseTxEntries(logs));
            } catch { setSquadEntries([]); }
            setLoading(false);
        })();
    }, [viewMode, squadName]);

    // 團隊明細視圖：捐贈是團隊的入帳（反轉正負），購買是團隊的支出（保持負號）
    const currentEntries = viewMode === 'squad'
        ? squadEntries.map(e => e.type === 'coin_transfer' ? { ...e, coins: Math.abs(e.coins) } : e)
        : entries;
    const filtered = filter === 'all' ? currentEntries
        : filter === 'exp' ? currentEntries.filter(e => e.exp !== 0)
        : currentEntries.filter(e => e.coins !== 0);

    const totalExpGain = currentEntries.filter(e => e.exp > 0).reduce((sum, e) => sum + e.exp, 0);
    const totalCoinsGain = currentEntries.filter(e => e.coins > 0).reduce((sum, e) => sum + e.coins, 0);
    const totalCoinsLoss = currentEntries.filter(e => e.coins < 0).reduce((sum, e) => sum + e.coins, 0);

    return (
        <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
            {/* 小隊長切換 */}
            {squadName && (
                <div className="flex gap-2 bg-slate-900 border border-white/5 rounded-2xl p-1.5">
                    <button onClick={() => setViewMode('personal')}
                        className={`flex-1 py-2.5 rounded-xl font-black text-xs transition-all ${viewMode === 'personal' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                        我的明細
                    </button>
                    <button onClick={() => setViewMode('squad')}
                        className={`flex-1 py-2.5 rounded-xl font-black text-xs transition-all ${viewMode === 'squad' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                        團隊明細
                    </button>
                </div>
            )}

            {/* 總覽 */}
            <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl p-5">
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 text-center">
                    {viewMode === 'squad' ? `${squadName} 團隊帳明細` : '帳號總覽'}
                </p>
                {viewMode === 'personal' ? (
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-800 rounded-2xl p-3 text-center">
                            <p className="text-2xl font-black text-orange-400">{(userData.Exp ?? 0).toLocaleString()}</p>
                            <p className="text-[10px] text-slate-500 font-bold">累計修為</p>
                        </div>
                        <div className="bg-slate-800 rounded-2xl p-3 text-center">
                            <p className="text-2xl font-black text-yellow-400">{(userData.Coins ?? 0).toLocaleString()}</p>
                            <p className="text-[10px] text-slate-500 font-bold">目前金幣</p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-emerald-900/30 rounded-2xl p-3 text-center">
                            <p className="text-2xl font-black text-emerald-400">+{totalCoinsGain.toLocaleString()}</p>
                            <p className="text-[10px] text-slate-500 font-bold">成員捐贈</p>
                        </div>
                        <div className="bg-red-900/30 rounded-2xl p-3 text-center">
                            <p className="text-2xl font-black text-red-400">{totalCoinsLoss.toLocaleString()}</p>
                            <p className="text-[10px] text-slate-500 font-bold">團隊支出</p>
                        </div>
                    </div>
                )}
            </div>

            {/* 篩選 */}
            <div className="flex gap-2">
                {([
                    { key: 'all' as FilterType, label: `全部（${currentEntries.length}）` },
                    { key: 'exp' as FilterType, label: '修為' },
                    { key: 'coins' as FilterType, label: '金幣' },
                ]).map(({ key, label }) => (
                    <button key={key} onClick={() => setFilter(key)}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${filter === key ? 'bg-amber-600 text-white shadow-lg' : 'bg-slate-900 text-slate-400'}`}>
                        {label}
                    </button>
                ))}
            </div>

            {/* 明細列表 */}
            <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl overflow-hidden divide-y divide-slate-800">
                {loading ? (
                    <p className="text-sm text-slate-500 text-center py-10">載入中...</p>
                ) : filtered.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-10">暫無紀錄</p>
                ) : (
                    filtered.map(e => (
                        <div key={e.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
                            <div className="w-14 shrink-0 text-center">
                                <p className="text-[10px] text-slate-500 font-mono">{e.dateStr}</p>
                                <p className="text-[9px] text-slate-600 font-mono">{e.timeStr}</p>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-white truncate">
                                    {viewMode === 'squad' && e.userName && <span className="text-indigo-400 mr-1">{e.userName}</span>}
                                    {e.label}
                                </p>
                                <p className="text-[10px] text-slate-600">{TYPE_LABELS[e.type] || e.type}</p>
                            </div>
                            <div className="text-right shrink-0 space-y-0.5">
                                {e.exp !== 0 && (
                                    <p className={`text-xs font-black ${e.exp > 0 ? 'text-orange-400' : 'text-red-400'}`}>
                                        {e.exp > 0 ? '+' : ''}{e.exp} 修為
                                    </p>
                                )}
                                {e.coins !== 0 && (
                                    <p className={`text-[10px] font-bold ${e.coins > 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                                        {e.coins > 0 ? '+' : ''}{e.coins} 🪙
                                    </p>
                                )}
                                {e.exp === 0 && e.coins === 0 && (
                                    <p className="text-[10px] text-slate-600">—</p>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
