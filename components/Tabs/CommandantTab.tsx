'use client';

import { useState } from 'react';
import { CheckCircle2, XCircle, RefreshCw, Sword, ShieldCheck, Pencil, ChevronDown, Users } from 'lucide-react';
import { CharacterStats, W4Application } from '@/types';
import { reviewW4ByAdmin } from '@/app/actions/w4';
import { setBattalionDisplayName } from '@/app/actions/admin';

interface BattalionSquadMember { userId: string; name: string; level: number; role: string | null; isCaptain: boolean; }
interface BattalionSquad { squadName: string; members: BattalionSquadMember[]; }

interface CommandantTabProps {
    userData: CharacterStats;
    battalionDisplayName?: string;
    apps: W4Application[];
    squads: BattalionSquad[];
    onRefresh: () => void;
    onShowMessage: (msg: string, type: 'success' | 'error' | 'info') => void;
    onGoToAdmin?: () => void;
    onDisplayNameSaved?: (name: string) => void;
}

export function CommandantTab({ userData, battalionDisplayName, apps, squads, onRefresh, onShowMessage, onGoToAdmin, onDisplayNameSaved }: CommandantTabProps) {
    const [reviewingId, setReviewingId] = useState<string | null>(null);
    const [notes, setNotes] = useState<Record<string, string>>({});
    const [expandedSquad, setExpandedSquad] = useState<string | null>(null);

    // 大隊名稱設定 state
    const [editingName, setEditingName] = useState(false);
    const [nameInput, setNameInput] = useState(battalionDisplayName || '');
    const [savingName, setSavingName] = useState(false);
    const handleSaveName = async () => {
        if (!userData.BigTeamLeagelName) return;
        setSavingName(true);
        const res = await setBattalionDisplayName(userData.BigTeamLeagelName, nameInput);
        setSavingName(false);
        setEditingName(false);
        if (!res.success) onShowMessage(res.error || '儲存失敗', 'error');
        else onDisplayNameSaved?.(nameInput.trim());
    };

    const handleReview = async (appId: string, action: 'approve' | 'reject') => {
        setReviewingId(appId);
        try {
            const res = await reviewW4ByAdmin(appId, action, notes[appId] || '', userData.Name);
            if (res.success) {
                onShowMessage(
                    action === 'approve' ? '✅ 已核准入帳，傳愛修為已發放！' : '已駁回此申請。',
                    action === 'approve' ? 'success' : 'info'
                );
                onRefresh();
            } else {
                onShowMessage(res.error || '操作失敗', 'error');
            }
            if (res.warning) onShowMessage(res.warning, 'info');
        } catch (e: any) {
            onShowMessage('系統異常：' + e.message, 'error');
        } finally {
            setReviewingId(null);
        }
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            {/* GM 一鍵進入後台 */}
            {onGoToAdmin && (
                <button
                    onClick={onGoToAdmin}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-red-900/60 to-rose-900/60 border-2 border-red-500/50 rounded-2xl text-red-300 font-black text-sm hover:from-red-800/60 hover:to-rose-800/60 hover:text-white active:scale-95 transition-all shadow-lg"
                >
                    <ShieldCheck size={16} /> 進入大會管理後台 (GM)
                </button>
            )}
            {/* Header */}
            <div className="bg-gradient-to-br from-rose-950/40 to-slate-900 border-2 border-rose-500/40 rounded-4xl p-6 shadow-2xl text-center">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-center gap-2 text-rose-400 font-black text-xs uppercase tracking-widest">
                            <Sword size={14} /> 大隊長指揮部
                        </div>
                    </div>
                    <button
                        onClick={onRefresh}
                        className="p-3 rounded-2xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 active:scale-95 transition-all border border-white/5 shrink-0"
                    >
                        <RefreshCw size={16} />
                    </button>
                </div>
                <h2 className="text-2xl font-black text-white italic">{battalionDisplayName || userData.LittleTeamLeagelName || '未知大隊'}</h2>
                {battalionDisplayName && <p className="text-xs text-slate-500 mt-0.5">{userData.LittleTeamLeagelName}</p>}
                {/* 大隊名稱設定 */}
                <div className="mt-4 border-t border-rose-500/20 pt-4">
                    {editingName ? (
                        <div className="flex gap-2">
                            <input
                                value={nameInput}
                                onChange={e => setNameInput(e.target.value)}
                                placeholder={userData.LittleTeamLeagelName || '輸入大隊名稱'}
                                className="flex-1 bg-slate-950 border border-rose-500/50 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-rose-400"
                            />
                            <button onClick={handleSaveName} disabled={savingName}
                                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-black text-xs rounded-xl transition-colors">
                                {savingName ? '…' : '儲存'}
                            </button>
                            <button onClick={() => setEditingName(false)}
                                className="px-3 py-2 bg-slate-700 text-slate-300 text-xs rounded-xl">取消</button>
                        </div>
                    ) : (
                        <button onClick={() => { setNameInput(battalionDisplayName || ''); setEditingName(true); }}
                            className="flex items-center gap-1.5 mx-auto text-xs text-rose-400 hover:text-rose-200 transition-colors">
                            <Pencil size={12} /> 設定大隊名稱
                        </button>
                    )}
                </div>
            </div>

            {/* 小隊列表 */}
            <div className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                    <Users size={15} className="text-rose-400" />
                    <p className="text-white font-black text-base">所轄小隊</p>
                    <span className="text-xs text-slate-500 ml-auto">{squads.length} 隊・共 {squads.reduce((s, q) => s + q.members.length, 0)} 人</span>
                </div>
                {squads.length === 0 ? (
                    <p className="text-slate-600 text-xs text-center py-3">載入中…</p>
                ) : (
                    squads.map(squad => {
                        const isOpen = expandedSquad === squad.squadName;
                        const captain = squad.members.find(m => m.isCaptain);
                        return (
                            <div key={squad.squadName} className="bg-slate-900/60 border border-slate-700/40 rounded-2xl overflow-hidden">
                                <button
                                    onClick={() => setExpandedSquad(isOpen ? null : squad.squadName)}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-800/60 transition-colors text-left"
                                >
                                    <div className="flex-1 min-w-0">
                                        <span className="font-black text-white text-sm">{squad.squadName}</span>
                                        {captain && <span className="text-[11px] text-slate-400 ml-2">隊長：{captain.name}</span>}
                                    </div>
                                    <span className="text-[11px] text-slate-500 shrink-0">{squad.members.length} 人</span>
                                    <ChevronDown size={14} className={`text-slate-500 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isOpen && (
                                    <div className="border-t border-slate-700/40 px-4 py-3 space-y-2">
                                        {squad.members.map(m => (
                                            <div key={m.userId} className="flex items-center gap-2">
                                                <span className="text-sm text-white font-bold flex-1">{m.name}</span>
                                                {m.isCaptain && <span className="text-[10px] font-black text-rose-400 bg-rose-400/10 px-2 py-0.5 rounded-lg">隊長</span>}
                                                <span className="text-[11px] text-slate-500">Lv.{m.level}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Application list */}
            {apps.length === 0 ? (
                <div className="bg-slate-900/60 border border-slate-700/40 rounded-3xl p-6 text-center space-y-3">
                    <p className="text-white font-black text-base">傳愛申請終審</p>
                    <p className="text-xs text-slate-400">以下為已通過小隊長初審、待終審的申請</p>
                    <div className="border-t border-slate-700/40 pt-3">
                        <p className="text-slate-500 font-black text-sm">目前無待終審申請</p>
                        <p className="text-slate-600 text-xs mt-1">所有申請均已處理完畢</p>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    <div className="px-1">
                        <p className="text-white font-black text-base">傳愛申請終審</p>
                        <p className="text-xs text-slate-400 mt-0.5">以下為已通過小隊長初審、待終審的申請</p>
                    </div>
                    {apps.map(app => (
                        <div key={app.id} className="bg-slate-900 border-2 border-rose-500/20 rounded-3xl p-5 space-y-4 shadow-xl">
                            {/* App info */}
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="font-black text-white text-base">{app.user_name}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        {app.squad_name} · 訪談對象：<span className="text-rose-300">{app.interview_target}</span>
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5">日期：{app.interview_date}</p>
                                    {app.squad_review_notes && (
                                        <p className="text-xs text-indigo-400 mt-1.5 bg-indigo-500/10 px-2 py-1 rounded-lg">
                                            小隊長備註：{app.squad_review_notes}
                                        </p>
                                    )}
                                    {app.description && (
                                        <p className="text-xs text-slate-400 italic mt-1.5">「{app.description}」</p>
                                    )}
                                </div>
                                <span className="shrink-0 text-[10px] font-black text-blue-400 bg-blue-400/10 px-2 py-1 rounded-lg">待終審</span>
                            </div>

                            {/* Notes */}
                            <textarea
                                placeholder="終審備註（選填）"
                                value={notes[app.id] || ''}
                                onChange={e => setNotes(prev => ({ ...prev, [app.id]: e.target.value }))}
                                rows={2}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-rose-500 resize-none transition-colors"
                            />

                            {/* Actions */}
                            <div className="flex gap-3">
                                <button
                                    disabled={reviewingId === app.id}
                                    onClick={() => handleReview(app.id, 'reject')}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-black text-sm text-red-400 bg-red-600/10 border border-red-600/30 active:scale-95 transition-all disabled:opacity-50"
                                >
                                    <XCircle size={14} /> 駁回
                                </button>
                                <button
                                    disabled={reviewingId === app.id}
                                    onClick={() => handleReview(app.id, 'approve')}
                                    className="flex-[2] flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-black text-sm text-white bg-emerald-600 shadow-lg shadow-emerald-900/30 active:scale-95 transition-all disabled:opacity-50"
                                >
                                    <CheckCircle2 size={14} /> {reviewingId === app.id ? '處理中…' : '核准入帳'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
