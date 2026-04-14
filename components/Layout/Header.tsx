import React from 'react';
import { LogOut, Coins, Settings, Type, Unlink } from 'lucide-react';
import { CharacterStats } from '@/types';
import { ROLE_CURE_MAP, getExpForNextLevel } from '@/lib/constants';

interface HeaderProps {
    userData: CharacterStats | null;
    onLogout: () => void;
    fontSize: number;
    onFontSizeChange: (size: 100 | 112 | 125 | 140) => void;
    questRoleNames?: string[]; // parsed from QuestRole JSON array
    onUnbindLine?: () => Promise<void>;
    squadNickname?: string;     // TeamSettings.display_name（小隊長設定的暱稱）
    battalionNickname?: string; // BattalionSettings.display_name（大隊長設定的暱稱）
}

const FONT_LABELS: { size: 100 | 112 | 125 | 140; label: string }[] = [
    { size: 100, label: '小' },
    { size: 112, label: '中' },
    { size: 125, label: '大' },
    { size: 140, label: '特大' },
];

export function Header({ userData, onLogout, fontSize, onFontSizeChange, questRoleNames, onUnbindLine, squadNickname, battalionNickname }: HeaderProps) {
    const [settingsOpen, setSettingsOpen] = React.useState(false);
    const [unbinding, setUnbinding] = React.useState(false);
    const settingsRef = React.useRef<HTMLDivElement>(null);

    // 點擊外部關閉設定面板
    React.useEffect(() => {
        if (!settingsOpen) return;
        const handler = (e: MouseEvent) => {
            if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
                setSettingsOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [settingsOpen]);

    let progressPercent = 0;
    let expInCurrentLevel = 0;
    let nextLevelExp = 0;

    if (userData) {
        let accumulatedExp = 0;
        for (let i = 1; i < userData.Level; i++) {
            accumulatedExp += i * 5 + 480;
        }
        expInCurrentLevel = userData.Exp - accumulatedExp;
        nextLevelExp = getExpForNextLevel(userData.Level);
        progressPercent = userData.Level >= 99 ? 100 : Math.min(100, Math.max(0, (expInCurrentLevel / nextLevelExp) * 100));
    }

    return (
        <header className="px-6 py-8 bg-slate-900 border-b border-white/10 relative" style={{ zoom: 100 / fontSize }}>
            {/* 右上角：設定 + 登出 */}
            <div className="absolute top-6 right-6 flex items-center gap-2">
                {/* 設定按鈕 */}
                <div ref={settingsRef} className="relative">
                    <button
                        onClick={() => setSettingsOpen(v => !v)}
                        className={`bg-slate-950/50 border border-white/5 p-2 rounded-xl transition-colors ${settingsOpen ? 'text-orange-400 border-orange-500/30' : 'text-slate-600 hover:text-slate-300'}`}
                    >
                        <Settings size={20} />
                    </button>

                    {/* 設定面板 */}
                    {settingsOpen && (
                        <div className="absolute top-full right-0 mt-2 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-4 w-52 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                            <div className="flex items-center gap-2 mb-3">
                                <Type size={13} className="text-orange-400" />
                                <p className="text-sm font-black text-slate-400 uppercase tracking-widest">字體大小</p>
                            </div>
                            <div className="grid grid-cols-4 gap-1.5">
                                {FONT_LABELS.map(({ size, label }) => (
                                    <button
                                        key={size}
                                        onClick={() => onFontSizeChange(size)}
                                        className={`py-2 rounded-xl text-sm font-black transition-colors ${fontSize === size ? 'bg-orange-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                            <p className="text-sm text-slate-600 text-center mt-3">設定自動儲存</p>

                            {userData?.LineUserId && onUnbindLine && (
                                <>
                                    <div className="border-t border-slate-800 my-3" />
                                    <button
                                        disabled={unbinding}
                                        onClick={async () => {
                                            if (!confirm('確定要取消 LINE 綁定？')) return;
                                            setUnbinding(true);
                                            await onUnbindLine();
                                            setUnbinding(false);
                                            setSettingsOpen(false);
                                        }}
                                        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-black text-red-400 bg-red-900/20 hover:bg-red-900/40 border border-red-800/40 transition-colors disabled:opacity-50"
                                    >
                                        <Unlink size={12} />
                                        {unbinding ? '取消中...' : 'LINE 取消綁定'}
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>

                <button
                    onClick={onLogout}
                    className="bg-slate-950/50 border border-white/5 p-2 rounded-xl text-slate-600 hover:text-red-400 transition-colors">
                    <LogOut size={20} />
                </button>
            </div>

            <div className="flex items-center gap-6 justify-center">
                <div className="relative shrink-0 text-center">
                    {userData?.Role && ROLE_CURE_MAP[userData.Role] ? (
                        <div className="w-24 h-24 rounded-full shadow-lg mx-auto overflow-hidden">
                            <img
                                src={`/images/avatars/${userData.Role}.png`}
                                alt={userData.Role}
                                className="w-full h-full object-cover scale-125"
                            />
                        </div>
                    ) : (
                        <div className="w-24 h-24 bg-orange-600 rounded-full flex items-center justify-center text-white text-5xl font-black shadow-lg mx-auto">
                            {userData?.Name?.[0]}
                        </div>
                    )}
                    <div className="absolute -bottom-2 -right-2 bg-yellow-500 text-slate-950 text-sm font-black px-2 py-1 rounded-full border-4 border-slate-900">
                        LV.{userData?.Level}
                    </div>
                </div>

                <div className="flex-1 text-left">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <h1 className="text-3xl font-black text-white">{userData?.Name}</h1>
                    </div>
                    {(userData?.LittleTeamLeagelName || (userData && ROLE_CURE_MAP[userData.Role]?.poison)) && (
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                            {userData && ROLE_CURE_MAP[userData.Role]?.poison && (
                                <span className={`text-sm font-black text-white px-2.5 py-1 rounded-lg ${ROLE_CURE_MAP[userData.Role]?.color}`}>
                                    {ROLE_CURE_MAP[userData.Role]?.poison}
                                </span>
                            )}
                            {userData?.LittleTeamLeagelName && (() => {
                                let label = '';
                                if (userData.IsCommandant) {
                                    const team = userData.BigTeamLeagelName || '';
                                    const nick = battalionNickname ? `（${battalionNickname}）` : '';
                                    label = `${team}${nick}．大隊長`;
                                } else if (userData.IsCaptain) {
                                    const team = userData.LittleTeamLeagelName;
                                    const nick = squadNickname ? `（${squadNickname}）` : '';
                                    label = `${team}${nick}．小隊長`;
                                } else if (questRoleNames && questRoleNames.length > 0) {
                                    const team = userData.LittleTeamLeagelName;
                                    const nick = squadNickname ? `（${squadNickname}）` : '';
                                    label = `${team}${nick}．${questRoleNames.join('・')}`;
                                } else {
                                    label = squadNickname || userData.LittleTeamLeagelName;
                                }
                                return (
                                    <span className="text-sm font-black text-white bg-red-600 border border-red-500 px-2.5 py-1 rounded-lg">
                                        {label}
                                    </span>
                                );
                            })()}
                        </div>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm text-white/50 font-bold uppercase tracking-widest italic border border-white/15 px-2.5 py-1 rounded-lg">{userData?.Role} 修行中</p>
                        <div className="flex items-center gap-1.5 bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded-lg text-sm font-black shadow-inner border border-yellow-500/20">
                            <Coins size={13} /> {userData?.Coins || 0}
                        </div>
                    </div>
                </div>
            </div>

            {/* 修為進度條（獨立一列） */}
            <div className="mt-4 flex items-center gap-3">
                <div className="flex-1 bg-slate-800 h-3 rounded-full overflow-hidden border border-white/5 relative shadow-inner">
                    <div className="h-full bg-gradient-to-r from-orange-500 to-yellow-400 shadow-[0_0_10px_rgba(249,115,22,0.5)] transition-all duration-1000" style={{ width: `${progressPercent}%` }}></div>
                </div>
                <p className="text-sm text-slate-400 font-mono tracking-tighter shrink-0">{userData?.Level! >= 99 ? 'MAX' : `${expInCurrentLevel} / ${nextLevelExp}`}</p>
            </div>
        </header>
    );
}
