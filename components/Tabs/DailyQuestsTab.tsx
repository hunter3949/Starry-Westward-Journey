import { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { Quest, DailyLog } from '@/types';
import { DAILY_QUEST_CONFIG } from '@/lib/constants';
import { getLogicalDateStr } from '@/lib/utils/time';
import { LifeHintCard } from '@/components/LifeHintCard';

// 從 DB 讀取定課設定，失敗則 fallback 到硬編碼常數
async function loadQuestConfig(): Promise<Quest[]> {
    try {
        const { listDailyQuestConfig } = await import('@/app/actions/admin');
        const rows = await listDailyQuestConfig();
        if (rows.length > 0) {
            return rows
                .filter(r => r.is_active)
                .sort((a, b) => a.sort_order - b.sort_order)
                .map(r => ({
                    id: r.id, title: r.title, sub: r.sub ?? '', desc: r.desc ?? '',
                    reward: r.reward, dice: r.dice, icon: r.icon ?? undefined,
                    coins: r.coins ?? undefined, limit: r.limit ?? undefined,
                }));
        }
    } catch { /* DB 表不存在時 fallback */ }
    return DAILY_QUEST_CONFIG.map(q => ({ ...q, coins: undefined }));
}

function QuestIcon({ questId, isDone, icon }: { questId: string; isDone: boolean; icon?: string }) {
    if (isDone) {
        return (
            <div className="w-[72px] h-[72px] rounded-2xl flex items-center justify-center text-2xl shrink-0 bg-emerald-500 text-white">✓</div>
        );
    }
    const baseId = questId === 'q1_dawn' ? 'q1' : questId;
    // 優先用 DB icon（emoji 或 URL），fallback 到靜態圖片
    if (icon && (icon.startsWith('http') || icon.startsWith('/'))) {
        return (
            <div className="w-[72px] h-[72px] rounded-2xl shrink-0 bg-slate-800 flex items-center justify-center overflow-hidden">
                <img src={icon} alt={questId} className="w-full h-full object-cover" />
            </div>
        );
    }
    if (icon) {
        return (
            <div className="w-[72px] h-[72px] rounded-2xl shrink-0 bg-slate-800 flex items-center justify-center text-3xl">
                {icon}
            </div>
        );
    }
    return (
        <div className="w-[72px] h-[72px] rounded-2xl shrink-0 bg-slate-800 flex items-center justify-center">
            <img src={`/images/quest-icons/${baseId}.png`} alt={questId} className="w-full h-full object-contain" />
        </div>
    );
}


interface DailyQuestsTabProps {
    weeklyQuestId?: string;
    logs: DailyLog[];
    logicalTodayStr: string;
    userInventory: string[];
    teamInventory?: string[];
    cardMottos?: string[];
    cardBackImage?: string;
    userId?: string;
    onCheckIn: (q: Quest) => void;
    onUndo: (q: Quest) => void;
    formatCheckInTime: (timestamp: string) => string;
}

function CurseBreakBadge() {
    return (
        <div className="text-right">
            <div className="font-black text-purple-400 text-sm">🔮 破咒打卡</div>
            <div className="text-[10px] text-slate-500 mt-0.5">不計修為</div>
        </div>
    );
}

function Q1Card({ q, isDone, questLog, isDawn, setIsDawn, hasMirror, activeMandatoryId, isCapped, punchMultiplier, onCheckIn, onUndo, formatCheckInTime }: {
    q: Quest; isDone: boolean; questLog?: DailyLog; isDawn: boolean;
    setIsDawn: (v: boolean) => void; hasMirror: boolean; activeMandatoryId: string;
    isCapped: boolean; punchMultiplier: number;
    onCheckIn: (q: Quest) => void; onUndo: (q: Quest) => void;
    formatCheckInTime: (timestamp: string) => string;
}) {
    const handleCheckIn = () => {
        if (isDone) { onUndo(q); return; }
        if (isDawn) {
            onCheckIn({ ...q, id: 'q1_dawn', title: '打拳（破曉）', reward: q.reward, coins: q.coins });
        } else {
            onCheckIn(q);
        }
    };
    const borderClass = isDone
        ? 'bg-emerald-500/10 border-emerald-500/40 opacity-70'
        : isCapped
            ? 'bg-purple-950/20 border-purple-500/30'
            : q.id === activeMandatoryId
                ? 'bg-slate-900 border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.2)]'
                : 'bg-slate-900 border-white/5';
    const baseExp = Math.ceil(q.reward * punchMultiplier);
    const dawnExp = baseExp + (hasMirror ? 150 : 0);
    const displayExp = isDawn ? dawnExp : baseExp;
    return (
        <div className={`relative w-full p-6 rounded-3xl border-2 transition-all ${borderClass}`}>
            <button onClick={handleCheckIn} className="flex items-center gap-4 w-full text-left">
                <QuestIcon questId="q1" isDone={isDone} icon={q.icon} />
                <div className="flex-1">
                    <h3 className={`font-black text-lg ${isDone ? 'text-emerald-400' : 'text-white'}`}>{q.title}</h3>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{q.sub}</p>
                </div>
                {!isDone && isCapped ? <CurseBreakBadge /> : (
                    <div className="text-right">
                        <div className="font-black text-orange-500">+{displayExp} 修為</div>
                        <div className="text-xs font-bold text-yellow-400 mt-0.5">+{q.coins != null ? q.coins : Math.floor(q.reward * 0.1)} 🪙</div>
                    </div>
                )}
            </button>
            {!isDone && (
                <label className="flex items-center gap-2 mt-3 ml-16 cursor-pointer select-none" onClick={e => e.stopPropagation()}>
                    <input
                        type="checkbox"
                        checked={isDawn}
                        onChange={e => setIsDawn(e.target.checked)}
                        className="w-4 h-4 rounded accent-orange-500"
                    />
                    <span className="text-xs text-slate-400 font-bold">
                        本次為破曉打拳（05:00–08:00 完成）
                        {hasMirror && !isCapped && <span className="text-orange-400 ml-1">+150 修為</span>}
                    </span>
                </label>
            )}
            {isDone && questLog && <div className="absolute bottom-1 right-2 text-[8px] font-mono text-emerald-500 opacity-60">{formatCheckInTime(questLog.Timestamp)}</div>}
        </div>
    );
}

export function DailyQuestsTab({ weeklyQuestId, logs, logicalTodayStr, userInventory, teamInventory = [], cardMottos, cardBackImage, userId, onCheckIn, onUndo, formatCheckInTime }: DailyQuestsTabProps) {
    const [isDawnMode, setIsDawnMode] = useState(false);
    const [showLifeCard, setShowLifeCard] = useState(false);
    const [todayCardText, setTodayCardText] = useState<string | null>(null);
    const [questConfig, setQuestConfig] = useState<Quest[]>(DAILY_QUEST_CONFIG.map(q => ({ ...q, coins: undefined })));

    useEffect(() => { loadQuestConfig().then(setQuestConfig); }, []);

    const cardKey = `life_hint_card_${userId || 'guest'}`;

    // 讀取今日已抽的卡
    useEffect(() => {
        try {
            const raw = localStorage.getItem(cardKey);
            if (raw) {
                const { text, date } = JSON.parse(raw);
                if (date === logicalTodayStr) setTodayCardText(text);
            }
        } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [logicalTodayStr, cardKey]);

    const handleDraw = (text: string) => {
        setTodayCardText(text);
        setShowLifeCard(false);
        try { localStorage.setItem(cardKey, JSON.stringify({ text, date: logicalTodayStr })); } catch { /* ignore */ }
    };
    const hasMirror = userInventory.includes('a2');
    const weeklyQuestName = questConfig.find(q => q.id === weeklyQuestId)?.title;

    // 計算修為乘數（與 quest.ts 伺服器邏輯一致）
    const hasA1 = userInventory.includes('a1');
    const hasA5 = userInventory.includes('a5');
    const baseMultiplier = hasA1 ? 1.2 : (hasA5 ? 1.2 : 1);           // a1/a5：個人所有 q 定課 ×1.2
    const punchMultiplier = baseMultiplier * (teamInventory.includes('a3') ? 1.5 : 1); // a3：打拳額外 ×1.5
    const todayQCount = logs.filter(l => l.QuestID.startsWith('q') && getLogicalDateStr(l.Timestamp) === logicalTodayStr).length;
    const isCapped = todayQCount >= 3;

    return (
        <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500 text-center mx-auto">
            {showLifeCard && <LifeHintCard onClose={() => setShowLifeCard(false)} onDraw={handleDraw} texts={cardMottos} cardBackImage={cardBackImage} />}

            {todayCardText ? (
                /* 今日已抽：展示卡片 */
                <div
                    className="w-full rounded-3xl p-6 text-center space-y-2 shadow-xl"
                    style={{
                        background: 'linear-gradient(135deg,#a8edea 0%,#fed6e3 25%,#d299c2 50%,#fef9d7 75%,#667eea 100%)',
                        border: '1px solid rgba(255,255,255,0.3)',
                    }}
                >
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">🃏 今日人生提示卡</p>
                    <p className="text-xl font-black text-slate-800 leading-relaxed whitespace-pre-line">{todayCardText}</p>
                </div>
            ) : (
                /* 今日未抽：顯示按鈕 */
                <button
                    onClick={() => setShowLifeCard(true)}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-3xl border-2 border-purple-500/40 bg-purple-950/20 text-purple-300 font-black text-sm hover:bg-purple-900/30 active:scale-95 transition-all"
                >
                    🃏 人生提示卡
                </button>
            )}
            <div className="bg-indigo-900/20 border-2 border-indigo-500/30 rounded-4xl p-6 shadow-2xl text-center mx-auto">
                <div className="flex items-center gap-2 justify-center text-indigo-400 font-black text-xs uppercase mb-2 tracking-widest"><Sparkles size={16} /> 本週推薦定課</div>
                {weeklyQuestName
                    ? <h2 className="text-2xl font-black text-white italic mx-auto">「{weeklyQuestName}」</h2>
                    : <p className="text-sm text-slate-500 font-bold">隊長尚未抽選，敬請期待</p>
                }
            </div>
            {questConfig.map(q => {
                if (q.id === 'q1') {
                    const isDone = logs.some(l =>
                        (l.QuestID === 'q1' || l.QuestID === 'q1_dawn') &&
                        getLogicalDateStr(l.Timestamp) === logicalTodayStr
                    );
                    const questLog = logs.find(l =>
                        (l.QuestID === 'q1' || l.QuestID === 'q1_dawn') &&
                        getLogicalDateStr(l.Timestamp) === logicalTodayStr
                    );
                    return (
                        <Q1Card
                            key="q1"
                            q={q}
                            isDone={isDone}
                            questLog={questLog}
                            isDawn={isDawnMode}
                            setIsDawn={setIsDawnMode}
                            hasMirror={hasMirror}
                            activeMandatoryId={weeklyQuestId || ''}
                            isCapped={isCapped}
                            punchMultiplier={punchMultiplier}
                            onCheckIn={onCheckIn}
                            onUndo={onUndo}
                            formatCheckInTime={formatCheckInTime}
                        />
                    );
                }

                const isDone = logs.some(l => l.QuestID === q.id && getLogicalDateStr(l.Timestamp) === logicalTodayStr);
                const questLog = logs.find(l => l.QuestID === q.id && getLogicalDateStr(l.Timestamp) === logicalTodayStr);
                const isRecommended = q.id === weeklyQuestId;
                const borderClass = isDone
                    ? 'bg-emerald-500/10 border-emerald-500/40 opacity-70'
                    : isCapped && !isDone
                        ? 'bg-purple-950/20 border-purple-500/30'
                        : isRecommended
                            ? 'bg-slate-900 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                            : 'bg-slate-900 border-white/5';
                return (
                    <button key={q.id} onClick={() => !isDone ? onCheckIn(q) : onUndo(q)} className={`relative w-full p-6 rounded-3xl border-2 flex items-center gap-4 transition-all ${borderClass}`}>
                        <QuestIcon questId={q.id} isDone={isDone} icon={q.icon} />
                        <div className="flex-1 text-left"><h3 className={`font-black text-lg ${isDone ? 'text-emerald-400' : 'text-white'}`}>{q.title}</h3><p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{q.sub}</p></div>
                        {!isDone && isCapped ? <CurseBreakBadge /> : (
                            <div className="text-right">
                                <div className="font-black text-orange-500">+{Math.ceil(q.reward * baseMultiplier)} 修為</div>
                                <div className="text-xs font-bold text-yellow-400 mt-0.5">+{q.coins != null ? q.coins : Math.floor(q.reward * 0.1)} 🪙</div>
                            </div>
                        )}
                        {isDone && questLog && <div className="absolute bottom-1 right-2 text-[8px] font-mono text-emerald-500 opacity-60">{formatCheckInTime(questLog.Timestamp)}</div>}
                    </button>
                );
            })}
        </div>
    );
}
