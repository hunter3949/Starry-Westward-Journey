'use client';

import { useState } from 'react';
import { Trophy, MapPin, Clock, Calendar, Users, ChevronDown, QrCode, X } from 'lucide-react';
import QRCode from 'react-qr-code';
import { PeakTrial, PeakTrialRegistration } from '@/types';
import { registerForPeakTrial, cancelPeakTrialRegistration } from '@/app/actions/peakTrials';

interface PeakTrialTabProps {
    trials: PeakTrial[];
    myRegistrations: PeakTrialRegistration[];
    userId: string;
    userName: string;
    squadName?: string;
    battalionName?: string;
    battalionMemberCount?: number;
    onRefresh: () => void;
    onShowMessage: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export function PeakTrialTab({
    trials, myRegistrations, userId, userName, squadName, battalionName, battalionMemberCount, onRefresh, onShowMessage,
}: PeakTrialTabProps) {
    const [loading, setLoading] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [showQR, setShowQR] = useState<{ regId: string; title: string } | null>(null);

    const activeTrials = trials.filter(t => t.is_active);
    const myRegMap = new Map(myRegistrations.map(r => [r.trial_id, r]));

    const isFull = (trial: PeakTrial) =>
        !!trial.max_participants && (trial.registration_count ?? 0) >= trial.max_participants;

    const handleRegister = async (trialId: string) => {
        setLoading(trialId);
        const res = await registerForPeakTrial(trialId, userId, userName, squadName, battalionName);
        setLoading(null);
        if (res.success) {
            onShowMessage('🏆 報名成功！', 'success');
            onRefresh();
        } else {
            onShowMessage(res.error || '報名失敗', 'error');
        }
    };

    const handleCancel = async (trialId: string) => {
        setLoading(trialId);
        const res = await cancelPeakTrialRegistration(trialId, userId);
        setLoading(null);
        if (res.success) {
            onShowMessage('已取消報名', 'info');
            onRefresh();
        } else {
            onShowMessage(res.error || '取消失敗', 'error');
        }
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            {/* QR 碼 Modal */}
            {showQR && (
                <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setShowQR(null)}>
                    <div className="bg-slate-900 border-2 border-purple-500/40 rounded-3xl p-6 space-y-4 text-center w-full max-w-xs" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <p className="text-white font-black text-sm">{showQR.title}</p>
                            <button onClick={() => setShowQR(null)} className="text-slate-400 hover:text-white p-1"><X size={16} /></button>
                        </div>
                        <div className="bg-white p-4 rounded-2xl inline-block">
                            <QRCode value={showQR.regId} size={200} />
                        </div>
                        <p className="text-slate-400 text-xs">截圖保存此 QR 碼<br />報到時出示給大隊長掃描</p>
                        <button onClick={() => setShowQR(null)} className="w-full py-2.5 bg-slate-700 text-slate-300 font-black text-sm rounded-2xl">關閉</button>
                    </div>
                </div>
            )}
            {/* Header */}
            <div className="bg-gradient-to-br from-purple-950/40 to-slate-900 border-2 border-purple-500/30 rounded-4xl p-6 shadow-2xl text-center">
                <div className="flex items-center justify-center gap-2 text-purple-400 font-black text-xs uppercase tracking-widest mb-1">
                    <Trophy size={14} /> 巔峰試煉
                </div>
                <h2 className="text-2xl font-black text-white">活動報名</h2>
                <p className="text-xs text-slate-400 mt-1">參與各大隊舉辦的特別活動，挑戰自我巔峰</p>
            </div>

            {/* 我的報名記錄 */}
            {myRegistrations.length > 0 && (
                <div className="bg-slate-900 border border-purple-500/20 rounded-3xl p-5 space-y-3">
                    <p className="text-white font-black text-sm flex items-center gap-2">
                        <Trophy size={14} className="text-purple-400" /> 我的報名記錄
                    </p>
                    <div className="space-y-2">
                        {myRegistrations.map(reg => {
                            const trial = trials.find(t => t.id === reg.trial_id);
                            return (
                                <div key={reg.id} className="flex items-center justify-between bg-slate-800/60 rounded-2xl px-4 py-2.5">
                                    <div>
                                        <p className="text-white text-sm font-bold">{trial?.title ?? '活動'}</p>
                                        <p className="text-xs text-slate-500">{trial?.date}{trial?.time ? ` · ${trial.time}` : ''}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {!reg.attended && (
                                            <button
                                                onClick={() => setShowQR({ regId: reg.id, title: trial?.title ?? '活動' })}
                                                className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors"
                                            >
                                                <QrCode size={14} />
                                            </button>
                                        )}
                                        <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${reg.attended ? 'bg-emerald-500/20 text-emerald-400' : 'bg-purple-500/20 text-purple-400'}`}>
                                            {reg.attended ? '✅ 已出席' : '已報名'}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* 活動列表 */}
            {activeTrials.length === 0 ? (
                <div className="bg-slate-900/60 border border-slate-700/40 rounded-3xl p-10 text-center space-y-2">
                    <Trophy size={32} className="text-slate-700 mx-auto" />
                    <p className="text-slate-500 font-black">目前無開放活動</p>
                    <p className="text-slate-600 text-xs">請關注各大隊公告</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {activeTrials.map(trial => {
                        const myReg = myRegMap.get(trial.id);
                        const isExpanded = expandedId === trial.id;
                        const isLoading = loading === trial.id;
                        const full = isFull(trial);
                        const regCount = trial.registration_count ?? 0;

                        return (
                            <div key={trial.id} className="bg-slate-900 border-2 border-purple-500/20 rounded-3xl overflow-hidden shadow-xl">
                                {/* Card header */}
                                <button
                                    onClick={() => setExpandedId(isExpanded ? null : trial.id)}
                                    className="w-full flex items-start gap-4 p-5 hover:bg-white/5 transition-colors text-left"
                                >
                                    <div className="w-10 h-10 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center shrink-0 mt-0.5">
                                        <Trophy size={18} className="text-purple-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-black text-white text-base leading-snug">{trial.title}</p>
                                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                                            <span className="flex items-center gap-1 text-xs text-slate-400">
                                                <Calendar size={11} /> {trial.date}
                                            </span>
                                            {trial.time && (
                                                <span className="flex items-center gap-1 text-xs text-slate-400">
                                                    <Clock size={11} /> {trial.time}
                                                </span>
                                            )}
                                            {trial.location && (
                                                <span className="flex items-center gap-1 text-xs text-slate-400">
                                                    <MapPin size={11} /> {trial.location}
                                                </span>
                                            )}
                                            {trial.max_participants ? (
                                                <span className={`flex items-center gap-1 text-xs font-black ${full ? 'text-red-400' : 'text-slate-400'}`}>
                                                    <Users size={11} /> {regCount}/{trial.max_participants} 人{full ? '（已額滿）' : ''}
                                                </span>
                                            ) : regCount > 0 && (
                                                <span className="flex items-center gap-1 text-xs text-slate-400">
                                                    <Users size={11} /> 已報名 {regCount} 人
                                                </span>
                                            )}
                                        </div>
                                        {trial.battalion_name && (
                                            <p className="text-[10px] text-purple-400 mt-1">主辦：{trial.battalion_name}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {full && !myReg && (
                                            <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-red-500/20 text-red-400">額滿</span>
                                        )}
                                        {myReg && (
                                            <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${myReg.attended ? 'bg-emerald-500/20 text-emerald-400' : 'bg-purple-500/20 text-purple-400'}`}>
                                                {myReg.attended ? '已出席' : '已報名'}
                                            </span>
                                        )}
                                        <ChevronDown size={14} className={`text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                    </div>
                                </button>

                                {/* Expanded content */}
                                {isExpanded && (
                                    <div className="border-t border-slate-700/40 px-5 py-4 space-y-4">
                                        {trial.description && (
                                            <p className="text-sm text-slate-300 leading-relaxed">{trial.description}</p>
                                        )}

                                        {/* 預計修為獎勵框 */}
                                        {(() => {
                                            const totalMembers = Math.max(1, battalionMemberCount || 1);
                                            const participantCount = trial.registration_count ?? 0;
                                            const estimatedExp = Math.floor(Math.min(participantCount, 21) * 1500 / totalMembers);
                                            return (
                                                <div className="bg-purple-950/40 border border-purple-500/30 rounded-2xl p-4 text-center space-y-2">
                                                    <p className="text-white font-black text-base leading-snug">
                                                        本大隊每人預計獲得
                                                        <span className="text-purple-300 text-xl mx-1">{estimatedExp.toLocaleString()}</span>
                                                        修為
                                                        <span className="text-red-400 text-xs ml-1">（預計）</span>
                                                    </p>
                                                    <p className="text-red-400 text-xs font-black">＊請廣邀大隊夥伴一同參與＊</p>
                                                    <p className="text-red-400 text-xs">＊此為預計修為，待大會最終審核確認＊</p>
                                                </div>
                                            );
                                        })()}

                                        {!myReg ? (
                                            full ? (
                                                <div className="w-full py-3 bg-red-500/10 border border-red-500/20 text-red-400 font-black text-sm rounded-2xl text-center">
                                                    名額已滿，無法報名
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => handleRegister(trial.id)}
                                                    disabled={isLoading}
                                                    className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-black text-sm rounded-2xl active:scale-95 transition-all shadow-lg shadow-purple-900/30"
                                                >
                                                    {isLoading ? '報名中…' : '🏆 立即報名'}
                                                </button>
                                            )
                                        ) : myReg.attended ? (
                                            <div className="text-center py-2 text-emerald-400 font-black text-sm">✅ 已完成出席</div>
                                        ) : (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setShowQR({ regId: myReg.id, title: trial.title })}
                                                    className="flex items-center gap-1.5 px-4 py-3 bg-purple-600/20 border border-purple-500/30 text-purple-400 font-black text-sm rounded-2xl active:scale-95 transition-all"
                                                >
                                                    <QrCode size={15} /> QR 碼
                                                </button>
                                                <button
                                                    onClick={() => handleCancel(trial.id)}
                                                    disabled={isLoading}
                                                    className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-300 font-black text-sm rounded-2xl active:scale-95 transition-all"
                                                >
                                                    {isLoading ? '處理中…' : '取消報名'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
