'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { CheckCircle2, XCircle, RefreshCw, Sword, ShieldCheck, Pencil, ChevronDown, Users, Trophy, Plus, Trash2, CheckCheck, Eye, ScanLine } from 'lucide-react';

const PeakTrialScanner = dynamic(() => import('@/components/PeakTrialScanner'), { ssr: false });
import { CharacterStats, W4Application, PeakTrial, PeakTrialRegistration } from '@/types';
import { reviewW4ByBattalionLeader } from '@/app/actions/w4';
import { setBattalionDisplayName } from '@/app/actions/admin';
import { upsertPeakTrial, deletePeakTrial, togglePeakTrialActive, getPeakTrialRegistrations, markPeakTrialAttendance, getBattalionTrialStatus, MemberTrialStatus, CrossInParticipant, submitPeakTrialReview, getTrialReviewStatus } from '@/app/actions/peakTrials';

interface BattalionSquadMember { userId: string; name: string; level: number; role: string | null; isCaptain: boolean; lastCheckIn?: string | null; hp?: number | null; maxHp?: number | null; }
interface BattalionSquad { squadName: string; members: BattalionSquadMember[]; }

interface CommandantTabProps {
    userData: CharacterStats;
    battalionDisplayName?: string;
    apps: W4Application[];
    squads: BattalionSquad[];
    trials: PeakTrial[];
    onRefresh: () => void;
    onShowMessage: (msg: string, type: 'success' | 'error' | 'info') => void;
    onGoToAdmin?: () => void;
    onDisplayNameSaved?: (name: string) => void;
}

export function CommandantTab({ userData, battalionDisplayName, apps, squads, trials, onRefresh, onShowMessage, onGoToAdmin, onDisplayNameSaved }: CommandantTabProps) {
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
            const res = await reviewW4ByBattalionLeader(appId, userData.UserID, action === 'approve', notes[appId] || '');
            if (res.success) {
                onShowMessage(
                    action === 'approve' ? '✅ 已核准入帳，傳愛修為已發放！' : '已駁回此申請。',
                    action === 'approve' ? 'success' : 'info'
                );
                onRefresh();
            } else {
                onShowMessage(res.error || '操作失敗', 'error');
            }
        } catch (e: any) {
            onShowMessage('系統異常：' + e.message, 'error');
        } finally {
            setReviewingId(null);
        }
    };

    // ── 巔峰試煉管理 state ───────────────────────────────────
    const emptyForm = { title: '', description: '', date: '', time: '', location: '', max_participants: '' };
    const [trialForm, setTrialForm] = useState(emptyForm);
    const [showTrialForm, setShowTrialForm] = useState(false);
    const [editingTrialId, setEditingTrialId] = useState<string | null>(null);
    const [savingTrial, setSavingTrial] = useState(false);
    const [deletingTrialId, setDeletingTrialId] = useState<string | null>(null);
    const [viewingRegs, setViewingRegs] = useState<{ trialId: string; regs: PeakTrialRegistration[] } | null>(null);
    const [loadingRegs, setLoadingRegs] = useState<string | null>(null);
    const [markingId, setMarkingId] = useState<string | null>(null);
    const [scanningTrialId, setScanningTrialId] = useState<string | null>(null);
    const [battalionStatus, setBattalionStatus] = useState<{
        trialId: string;
        activeView: 'own' | 'crossIn';
        memberStatus: MemberTrialStatus[];
        crossInRegs: CrossInParticipant[];
    } | null>(null);
    const [loadingBattalion, setLoadingBattalion] = useState<string | null>(null);

    // 統計及回報審核
    const [reviewPanel, setReviewPanel] = useState<{
        trialId: string;
        own: number;
        cross: number;
        totalMembers: number;
        status: 'pending' | 'approved' | 'rejected' | null;
        reviewNotes?: string;
    } | null>(null);
    const [reviewPhoto, setReviewPhoto] = useState<string | null>(null);
    const [reviewVideoUrl, setReviewVideoUrl] = useState('');
    const [submittingReview, setSubmittingReview] = useState(false);
    const [loadingReview, setLoadingReview] = useState<string | null>(null);

    const openEditForm = (trial: PeakTrial) => {
        setTrialForm({
            title: trial.title,
            description: trial.description || '',
            date: trial.date,
            time: trial.time || '',
            location: trial.location || '',
            max_participants: trial.max_participants?.toString() || '',
        });
        setEditingTrialId(trial.id);
        setShowTrialForm(true);
    };

    const handleSaveTrial = async () => {
        if (!trialForm.title || !trialForm.date) {
            onShowMessage('活動名稱和日期為必填', 'error');
            return;
        }
        setSavingTrial(true);
        const res = await upsertPeakTrial({
            ...(editingTrialId ? { id: editingTrialId } : {}),
            title: trialForm.title,
            description: trialForm.description || undefined,
            date: trialForm.date,
            time: trialForm.time || undefined,
            location: trialForm.location || undefined,
            max_participants: trialForm.max_participants ? parseInt(trialForm.max_participants) : undefined,
            battalion_name: userData.BigTeamLeagelName || undefined,
            created_by: userData.UserID,
            is_active: true,
        });
        setSavingTrial(false);
        if (res.success) {
            onShowMessage(editingTrialId ? '✅ 活動已更新' : '🏆 活動已建立', 'success');
            setTrialForm(emptyForm);
            setShowTrialForm(false);
            setEditingTrialId(null);
            onRefresh();
        } else {
            onShowMessage(res.error || '儲存失敗', 'error');
        }
    };

    const handleDeleteTrial = async (id: string) => {
        setDeletingTrialId(id);
        const res = await deletePeakTrial(id);
        setDeletingTrialId(null);
        if (res.success) { onShowMessage('已刪除', 'info'); onRefresh(); }
        else onShowMessage(res.error || '刪除失敗', 'error');
    };

    const handleViewRegs = async (trialId: string) => {
        if (viewingRegs?.trialId === trialId) { setViewingRegs(null); return; }
        setLoadingRegs(trialId);
        const res = await getPeakTrialRegistrations(trialId);
        setLoadingRegs(null);
        if (res.success) setViewingRegs({ trialId, regs: res.registrations });
        else onShowMessage(res.error || '載入失敗', 'error');
    };

    const handleMarkAttendance = async (regId: string) => {
        setMarkingId(regId);
        const res = await markPeakTrialAttendance(regId);
        setMarkingId(null);
        if (res.success) {
            onShowMessage('✅ 已核銷', 'success');
            if (viewingRegs) {
                const updated = await getPeakTrialRegistrations(viewingRegs.trialId);
                if (updated.success) setViewingRegs({ trialId: viewingRegs.trialId, regs: updated.registrations });
            }
        } else {
            onShowMessage(res.error || '核銷失敗', 'error');
        }
    };

    const handleBattalionView = async (trialId: string, view: 'own' | 'crossIn') => {
        if (battalionStatus?.trialId === trialId && battalionStatus.activeView === view) {
            setBattalionStatus(null);
            return;
        }
        setLoadingBattalion(trialId);
        const res = await getBattalionTrialStatus(userData.BigTeamLeagelName || '', trialId);
        setLoadingBattalion(null);
        if (res.success) {
            setBattalionStatus({ trialId, activeView: view, memberStatus: res.memberStatus, crossInRegs: res.crossInRegs });
        } else {
            onShowMessage(res.error || '載入失敗', 'error');
        }
    };

    const handleOpenReview = async (trial: { id: string; title: string }) => {
        if (reviewPanel?.trialId === trial.id) { setReviewPanel(null); return; }
        setLoadingReview(trial.id);
        const [statusRes, reviewRes] = await Promise.all([
            getBattalionTrialStatus(userData.BigTeamLeagelName || '', trial.id),
            getTrialReviewStatus(trial.id, userData.BigTeamLeagelName || ''),
        ]);
        setLoadingReview(null);
        if (!statusRes.success) { onShowMessage(statusRes.error || '載入失敗', 'error'); return; }
        const own = statusRes.memberStatus.filter(m => m.status === 'registered').length;
        const cross = statusRes.memberStatus.filter(m => m.status === 'crossout').length;
        // 預填已送審的照片與影片連結
        if (reviewRes.review?.photo_data) setReviewPhoto(reviewRes.review.photo_data);
        if (reviewRes.review?.video_url) setReviewVideoUrl(reviewRes.review.video_url);
        setReviewPanel({
            trialId: trial.id, own, cross,
            totalMembers: statusRes.memberStatus.length,
            status: (reviewRes.review?.status as 'pending' | 'approved' | 'rejected' | null) || null,
            reviewNotes: reviewRes.review?.review_notes || undefined,
        });
    };

    const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => setReviewPhoto(reader.result as string);
        reader.readAsDataURL(file);
    };

    const handleSubmitReview = async (trial: { id: string; title: string }) => {
        if (!reviewPanel || reviewPanel.trialId !== trial.id) return;
        setSubmittingReview(true);
        const ownCapped = Math.min(reviewPanel.own, 21);
        const crossCapped = Math.min(reviewPanel.cross, 21);
        const rewardPerPerson = ownCapped * 1500 + crossCapped * 1050;
        const res = await submitPeakTrialReview({
            trialId: trial.id, trialTitle: trial.title,
            battalionName: userData.BigTeamLeagelName || '',
            submittedBy: userData.UserID,
            ownParticipants: reviewPanel.own, crossParticipants: reviewPanel.cross,
            rewardPerPerson, totalMembers: reviewPanel.totalMembers,
            photoData: reviewPhoto || undefined,
            videoUrl: reviewVideoUrl.trim() || undefined,
        });
        setSubmittingReview(false);
        if (res.success) {
            onShowMessage('✅ 審核申請已送出，等待大會中樞審核', 'success');
            setReviewPanel(prev => prev ? { ...prev, status: 'pending' } : null);
        } else {
            onShowMessage(res.error || '送審失敗', 'error');
        }
    };

    // 活躍判斷：與後台儀表板相同 — 近 2 邏輯天（邏輯今日 = 12:00 前算前一天）內有回報
    const now = new Date();
    const logicalNow = new Date(now);
    if (now.getHours() < 12) logicalNow.setDate(logicalNow.getDate() - 1);
    logicalNow.setHours(12, 0, 0, 0);
    const activeCutoff = new Date(logicalNow);
    activeCutoff.setDate(activeCutoff.getDate() - 2);
    const isMemberActive = (lastCheckIn?: string | null) =>
        lastCheckIn ? new Date(lastCheckIn) >= activeCutoff : false;

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

            {/* 所轄小隊（含卡片框線） */}
            <div className="bg-slate-900 border-2 border-rose-500/20 rounded-4xl p-5 space-y-3 shadow-xl">
                <div className="flex items-center gap-2">
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
                        const activeCount = squad.members.filter(m => isMemberActive(m.lastCheckIn)).length;
                        const activeRate = squad.members.length > 0 ? Math.round((activeCount / squad.members.length) * 100) : 0;
                        return (
                            <div key={squad.squadName} className="bg-slate-800/60 border border-slate-700/40 rounded-2xl overflow-hidden">
                                <button
                                    onClick={() => setExpandedSquad(isOpen ? null : squad.squadName)}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700/60 transition-colors text-left"
                                >
                                    <div className="flex-1 min-w-0">
                                        <span className="font-black text-white text-sm">{squad.squadName}</span>
                                        {captain && <span className="text-[11px] text-slate-400 ml-2">隊長：{captain.name}</span>}
                                        <span className={`text-[10px] font-black ml-2 ${activeRate >= 70 ? 'text-emerald-400' : activeRate >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                                            活躍率 {activeRate}%
                                        </span>
                                    </div>
                                    <span className="text-[11px] text-slate-500 shrink-0">{squad.members.length} 人</span>
                                    <ChevronDown size={14} className={`text-slate-500 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isOpen && (
                                    <div className="border-t border-slate-700/40 px-4 py-3 space-y-2">
                                        {squad.members.map(m => {
                                            const active = isMemberActive(m.lastCheckIn);
                                            return (
                                                <div key={m.userId} className="flex items-center gap-2">
                                                    <span className={`text-sm font-bold flex-1 ${active ? 'text-white' : 'text-slate-500'}`}>{m.name}</span>
                                                    {m.isCaptain && <span className="text-[10px] font-black text-rose-400 bg-rose-400/10 px-2 py-0.5 rounded-lg">隊長</span>}
                                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${active ? 'text-emerald-400 bg-emerald-400/10' : 'text-slate-500 bg-slate-700/50'}`}>
                                                        {active ? '活躍' : '沉寂'}
                                                    </span>
                                                    <span className="text-[11px] text-slate-500">Lv.{m.level}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Application list — 大隊長不審自己的申請 */}
            {(() => {
                const reviewableApps = apps.filter(a => a.user_id !== userData.UserID);
                return reviewableApps.length === 0 ? (
                <div className="bg-slate-900/60 border border-slate-700/40 rounded-3xl p-6 text-center space-y-3">
                    <p className="text-white font-black text-base">傳愛申請終審</p>
                    <p className="text-xs text-slate-400">以下為已通過小隊長初審、待大隊長審核的申請</p>
                    <div className="border-t border-slate-700/40 pt-3">
                        <p className="text-slate-500 font-black text-sm">目前無待審核申請</p>
                        <p className="text-slate-600 text-xs mt-1">所有申請均已處理完畢</p>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    <div className="px-1">
                        <p className="text-white font-black text-base">傳愛申請終審</p>
                        <p className="text-xs text-slate-400 mt-0.5">以下為已通過小隊長初審、待大隊長審核的申請</p>
                    </div>
                    {reviewableApps.map(app => (
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
                                <span className="shrink-0 text-[10px] font-black text-blue-400 bg-blue-400/10 px-2 py-1 rounded-lg">待大隊長審核</span>
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
            );
            })()}

            {/* ── 巔峰試煉管理 ── */}
            <div className="bg-slate-900 border-2 border-purple-500/20 rounded-4xl p-5 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Trophy size={15} className="text-purple-400" />
                        <p className="text-white font-black text-base">巔峰試煉管理</p>
                    </div>
                    {trials.filter(t => t.created_by === userData.UserID).length === 0 && (
                        <button
                            onClick={() => setShowTrialForm(v => !v)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-black rounded-xl active:scale-95 transition-all"
                        >
                            <Plus size={13} /> 新增活動
                        </button>
                    )}
                </div>

                {/* 新增 / 編輯表單 */}
                {showTrialForm && (
                    <div className="bg-slate-800/60 border border-purple-500/20 rounded-2xl p-4 space-y-3">
                        <p className="text-purple-300 font-black text-xs uppercase tracking-widest">
                            {editingTrialId ? '編輯活動' : '新增巔峰試煉活動'}
                        </p>
                        <input value={trialForm.title} onChange={e => setTrialForm(p => ({ ...p, title: e.target.value }))}
                            placeholder="活動名稱 *"
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-purple-500" />
                        <textarea value={trialForm.description} onChange={e => setTrialForm(p => ({ ...p, description: e.target.value }))}
                            placeholder="活動說明（選填）" rows={2}
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-purple-500 resize-none" />
                        <div className="grid grid-cols-2 gap-2">
                            <input type="date" value={trialForm.date} onChange={e => setTrialForm(p => ({ ...p, date: e.target.value }))}
                                className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-purple-500" />
                            <input value={trialForm.time} onChange={e => setTrialForm(p => ({ ...p, time: e.target.value }))}
                                placeholder="時間（如 14:00）"
                                className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-purple-500" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <input value={trialForm.location} onChange={e => setTrialForm(p => ({ ...p, location: e.target.value }))}
                                placeholder="地點（選填）"
                                className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-purple-500" />
                            <input type="number" value={trialForm.max_participants} onChange={e => setTrialForm(p => ({ ...p, max_participants: e.target.value }))}
                                placeholder="名額上限（選填）"
                                className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-purple-500" />
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleSaveTrial} disabled={savingTrial}
                                className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-black text-xs rounded-xl transition-colors">
                                {savingTrial ? '儲存中…' : editingTrialId ? '✅ 更新活動' : '✅ 建立活動'}
                            </button>
                            <button onClick={() => { setShowTrialForm(false); setTrialForm(emptyForm); setEditingTrialId(null); }}
                                className="px-4 py-2 bg-slate-700 text-slate-300 text-xs font-black rounded-xl">取消</button>
                        </div>
                    </div>
                )}

                {/* 活動列表 */}
                {trials.length === 0 ? (
                    <p className="text-slate-600 text-xs text-center py-3">尚無活動，點右上角新增</p>
                ) : (
                    trials.map(trial => {
                        const isViewingThis = viewingRegs?.trialId === trial.id;
                        return (
                            <div key={trial.id} className="bg-slate-800/60 border border-slate-700/40 rounded-2xl overflow-hidden">
                                <div className="px-4 pt-3 pb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-black text-white text-sm">{trial.title}</p>
                                            <p className="text-[11px] text-slate-400 mt-0.5">
                                                {trial.date}{trial.time ? ` · ${trial.time}` : ''}{trial.location ? ` · ${trial.location}` : ''}
                                            </p>
                                            <p className="text-[10px] text-purple-400 mt-0.5">
                                                已報名 {trial.registration_count ?? 0} 人{trial.max_participants ? ` / 限額 ${trial.max_participants}` : ''}
                                            </p>
                                        </div>
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${trial.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-500'}`}>
                                            {trial.is_active ? '開放' : '關閉'}
                                        </span>
                                        <button onClick={() => handleViewRegs(trial.id)} disabled={loadingRegs === trial.id}
                                            className={`p-1.5 rounded-lg transition-colors ${isViewingThis ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-purple-400'}`}>
                                            <Eye size={14} />
                                        </button>
                                        <button onClick={() => setScanningTrialId(scanningTrialId === trial.id ? null : trial.id)}
                                            className={`p-1.5 rounded-lg transition-colors ${scanningTrialId === trial.id ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-emerald-400'}`}>
                                            <ScanLine size={14} />
                                        </button>
                                        <button onClick={() => openEditForm(trial)}
                                            className="text-slate-400 hover:text-purple-400 p-1.5 rounded-lg transition-colors">
                                            <Pencil size={13} />
                                        </button>
                                        <button onClick={() => togglePeakTrialActive(trial.id, !trial.is_active).then(() => onRefresh())}
                                            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg transition-colors">
                                            <CheckCheck size={14} />
                                        </button>
                                        <button onClick={() => handleDeleteTrial(trial.id)} disabled={deletingTrialId === trial.id}
                                            className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg transition-colors disabled:opacity-40">
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                    {/* 本隊名單 / 跨入名單 — 撐滿整行 */}
                                    <div className="flex gap-2 mt-2">
                                        <button
                                            onClick={() => handleBattalionView(trial.id, 'own')}
                                            disabled={loadingBattalion === trial.id}
                                            className={`flex-1 text-[11px] font-black py-1.5 rounded-lg transition-colors disabled:opacity-40 ${battalionStatus?.trialId === trial.id && battalionStatus.activeView === 'own' ? 'bg-blue-600 text-white' : 'bg-blue-500/15 text-blue-400 hover:bg-blue-500/25'}`}
                                        >
                                            {loadingBattalion === trial.id ? '載入中…' : '本隊名單'}
                                        </button>
                                        <button
                                            onClick={() => handleBattalionView(trial.id, 'crossIn')}
                                            disabled={loadingBattalion === trial.id}
                                            className={`flex-1 text-[11px] font-black py-1.5 rounded-lg transition-colors disabled:opacity-40 ${battalionStatus?.trialId === trial.id && battalionStatus.activeView === 'crossIn' ? 'bg-amber-600 text-white' : 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/25'}`}
                                        >
                                            跨入名單
                                        </button>
                                    </div>
                                    {/* 統計及回報審核 */}
                                    <button
                                        onClick={() => handleOpenReview(trial)}
                                        disabled={loadingReview === trial.id}
                                        className={`w-full mt-1.5 text-[11px] font-black py-1.5 rounded-lg transition-colors disabled:opacity-40 ${reviewPanel?.trialId === trial.id ? 'bg-indigo-600 text-white' : 'bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25'}`}
                                    >
                                        {loadingReview === trial.id ? '計算中…' : '統計及回報審核'}
                                    </button>
                                </div>

                                {/* 掃碼核銷 */}
                                {scanningTrialId === trial.id && (
                                    <div className="border-t border-slate-700/40 px-4 py-3">
                                        <PeakTrialScanner
                                            trialId={trial.id}
                                            trialTitle={trial.title}
                                            onCheckedIn={() => handleViewRegs(trial.id)}
                                        />
                                    </div>
                                )}

                                {/* 本隊名單 / 跨入名單 */}
                                {battalionStatus?.trialId === trial.id && (
                                    <div className="border-t border-slate-700/40 px-4 py-3 space-y-2">
                                        {battalionStatus.activeView === 'own' ? (
                                            <>
                                                <p className="text-xs text-blue-400 font-black">本隊名單（{battalionStatus.memberStatus.length} 人）</p>
                                                {battalionStatus.memberStatus.length === 0 ? (
                                                    <p className="text-slate-600 text-xs py-1">本大隊尚無成員</p>
                                                ) : (
                                                    <div className="space-y-1">
                                                        {(() => {
                                                            const groups = battalionStatus.memberStatus.reduce<Record<string, MemberTrialStatus[]>>((acc, m) => {
                                                                const sq = m.squad || '未分隊';
                                                                if (!acc[sq]) acc[sq] = [];
                                                                acc[sq].push(m);
                                                                return acc;
                                                            }, {});
                                                            return Object.entries(groups).map(([squad, members]) => (
                                                                <div key={squad}>
                                                                    <p className="text-[10px] text-slate-500 font-black mt-1.5 mb-0.5">{squad}</p>
                                                                    {members.map(m => (
                                                                        <div key={m.userId} className="flex items-center justify-between py-1">
                                                                            <span className="text-sm text-white">{m.name}</span>
                                                                            {m.status === 'registered' ? (
                                                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${m.attended ? 'bg-emerald-500/20 text-emerald-400' : 'bg-purple-500/20 text-purple-400'}`}>
                                                                                    {m.attended ? '✅ 已出席' : '已報名'}
                                                                                </span>
                                                                            ) : m.status === 'crossout' ? (
                                                                                <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-400">
                                                                                    跨出→{m.crossToBattalion}
                                                                                </span>
                                                                            ) : (
                                                                                <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-slate-700 text-slate-500">未報名</span>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ));
                                                        })()}
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <p className="text-xs text-amber-400 font-black">跨入參與名單（{battalionStatus.crossInRegs.length} 人）</p>
                                                {battalionStatus.crossInRegs.length === 0 ? (
                                                    <p className="text-slate-600 text-xs py-1">目前無跨隊報名</p>
                                                ) : battalionStatus.crossInRegs.map(r => (
                                                    <div key={r.id} className="flex items-center justify-between py-1">
                                                        <div>
                                                            <span className="text-sm text-white">{r.user_name}</span>
                                                            <span className="text-[10px] text-slate-500 ml-1.5">{r.battalion_name} · {r.squad_name}</span>
                                                        </div>
                                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${r.attended ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-500'}`}>
                                                            {r.attended ? '✅ 已出席' : '未出席'}
                                                        </span>
                                                    </div>
                                                ))}
                                            </>
                                        )}
                                    </div>
                                )}

                                {/* 統計及回報審核 panel */}
                                {reviewPanel?.trialId === trial.id && (() => {
                                    const { own, cross, totalMembers, status, reviewNotes } = reviewPanel;
                                    const ownCapped = Math.min(own, 21);
                                    const crossCapped = Math.min(cross, 21);
                                    const ownExp = ownCapped * 1500;
                                    const crossExp = crossCapped * 1050;
                                    const totalExp = ownExp + crossExp;
                                    const battalionLabel = battalionDisplayName || userData.BigTeamLeagelName || '本大隊';
                                    return (
                                        <div className="border-t border-slate-700/40 px-4 py-4 space-y-4">
                                            {/* 修為統計 */}
                                            <div className="space-y-2">
                                                <p className="text-xs text-indigo-400 font-black">修為統計</p>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3">
                                                        <p className="text-[10px] text-slate-400 mb-0.5">本隊參與</p>
                                                        <p className="text-white font-black text-lg leading-none">{own} 人</p>
                                                        {own > 21 && <p className="text-[9px] text-amber-500 mt-0.5">（上限 21 人計算）</p>}
                                                        <p className="text-purple-400 text-xs mt-1 font-black">+{ownExp.toLocaleString()} 修為</p>
                                                    </div>
                                                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                                                        <p className="text-[10px] text-slate-400 mb-0.5">跨隊參與</p>
                                                        <p className="text-white font-black text-lg leading-none">{cross} 人</p>
                                                        {cross > 21 && <p className="text-[9px] text-amber-500 mt-0.5">（上限 21 人計算）</p>}
                                                        <p className="text-amber-400 text-xs mt-1 font-black">+{crossExp.toLocaleString()} 修為</p>
                                                    </div>
                                                </div>
                                                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-4 py-3 flex items-center justify-between">
                                                    <p className="text-xs text-slate-400">每位參與者各獲得 <span className="text-red-400">（預計）</span></p>
                                                    <p className="text-indigo-300 font-black text-xl">{totalExp.toLocaleString()} 修為</p>
                                                </div>
                                                <p className="text-[10px] text-slate-500 text-center">僅出席成員可獲得，未出席者不獲任何修為</p>
                                            </div>

                                            {/* 審核狀態 / 提交區 */}
                                            {status === 'approved' ? (
                                                <div className="text-center py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                                                    <p className="text-emerald-400 font-black text-sm">✅ 已核准，修為已發放</p>
                                                </div>
                                            ) : status === 'rejected' ? (
                                                <div className="space-y-2 bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3">
                                                    <p className="text-red-400 font-black text-sm">❌ 審核未通過</p>
                                                    {reviewNotes && <p className="text-slate-400 text-xs">原因：{reviewNotes}</p>}
                                                    <p className="text-slate-500 text-xs">可修正後重新上傳大合照送審</p>
                                                </div>
                                            ) : status === 'pending' ? (
                                                <div className="text-center py-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
                                                    <p className="text-indigo-400 font-black text-sm">⏳ 已送審，等待大會中樞審核</p>
                                                </div>
                                            ) : null}

                                            {/* 上傳大合照 + 送審（pending 時也允許重新上傳） */}
                                            {status !== 'approved' && (
                                                <div className="space-y-3">
                                                    <p className="text-xs text-slate-400 font-black">上傳大合照供大會中樞審核</p>
                                                    <label className="flex items-center justify-center gap-2 w-full py-3 bg-slate-800 border border-dashed border-slate-600 hover:border-indigo-500/50 rounded-2xl cursor-pointer transition-colors">
                                                        <span className="text-xs text-slate-400">{reviewPhoto ? '✅ 已選取照片，點此更換' : '📷 選擇大合照'}</span>
                                                        <input type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
                                                    </label>
                                                    {reviewPhoto && (
                                                        <img src={reviewPhoto} alt="大合照預覽" className="w-full rounded-2xl object-cover max-h-48" />
                                                    )}
                                                    <div className="space-y-1">
                                                        <p className="text-xs text-slate-400 font-black">上傳影片連結（選填）</p>
                                                        <input
                                                            type="url"
                                                            value={reviewVideoUrl}
                                                            onChange={e => setReviewVideoUrl(e.target.value)}
                                                            placeholder="貼上影片網址（YouTube、Google Drive 等）"
                                                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-indigo-500 transition-colors"
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={() => handleSubmitReview(trial)}
                                                        disabled={submittingReview || !reviewPhoto}
                                                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-black text-sm rounded-2xl active:scale-95 transition-all"
                                                    >
                                                        {submittingReview ? '送審中…' : status === 'pending' ? '重新送審' : '送審申請修為'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}

                                {/* 報名名單 */}
                                {isViewingThis && (
                                    <div className="border-t border-slate-700/40 px-4 py-3 space-y-2">
                                        <p className="text-xs text-slate-400 font-black">報名名單（{viewingRegs.regs.length} 人）</p>
                                        {viewingRegs.regs.length === 0 ? (
                                            <p className="text-slate-600 text-xs py-2">尚無人報名</p>
                                        ) : viewingRegs.regs.map(reg => (
                                            <div key={reg.id} className="flex items-center gap-2">
                                                <span className={`text-sm flex-1 ${reg.attended ? 'text-slate-500 line-through' : 'text-white'}`}>
                                                    {reg.user_name}
                                                </span>
                                                <span className="text-[10px] text-slate-500">{reg.squad_name}</span>
                                                {reg.attended ? (
                                                    <span className="text-[10px] font-black text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-lg">已出席</span>
                                                ) : (
                                                    <button onClick={() => handleMarkAttendance(reg.id)} disabled={markingId === reg.id}
                                                        className="text-[10px] font-black text-purple-400 bg-purple-400/10 hover:bg-purple-400/20 px-2 py-0.5 rounded-lg transition-colors disabled:opacity-40">
                                                        {markingId === reg.id ? '…' : '核銷'}
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
