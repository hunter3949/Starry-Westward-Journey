import React from 'react';
import { Settings, X, BarChart3, Save, Users, Shield, Plus, Lock, QrCode, BookOpen, Pencil, ToggleLeft, ToggleRight, CheckCircle, Circle, ChevronRight, ChevronDown, Trophy, Image as ImageIcon, Upload, Trash2, Copy, FolderOpen, Download, Calendar, Zap, Search, LogIn, Tag, RefreshCw, Dices } from 'lucide-react';
import { SystemSettings, CharacterStats, TopicHistory, TemporaryQuest, W4Application, AdminLog, Testimony, Course, MainQuestEntry, BonusQuestRule, PeakTrial, PeakTrialRegistration, PeakTrialReview } from '@/types';
import { RankTab } from '@/components/Tabs/RankTab';
import { getCourseRegistrations } from '@/app/actions/course';
import { listPeakTrials, upsertPeakTrial, deletePeakTrial, togglePeakTrialActive, getPeakTrialRegistrations, markPeakTrialAttendance, listPeakTrialReviews, approvePeakTrialReview, rejectPeakTrialReview, recalcPeakTrialReview } from '@/app/actions/peakTrials';

import { ADMIN_PASSWORD, ARTIFACTS_CONFIG, ROLE_CURE_MAP, DEFAULT_QUEST_ROLES } from '@/lib/constants';
import { logAdminAction, checkExistingRosterPhones } from '@/app/actions/admin';
import type { DailyQuestConfigRow, ArtifactConfigRow, AchievementConfigRow } from '@/app/actions/admin';

// ── 模組化元件匯入 ─────────────────────────────────────────────────────────
import { IconPicker, GalleryPickerButton } from './shared/IconPicker';
import { DailyQuestConfigSection } from './modules/QuestConfigSection';
import { ArtifactConfigSection } from './modules/ArtifactConfigSection';
import { BonusQuestConfigSection } from './modules/BonusQuestConfigSection';
import { AchievementConfigSection } from './modules/AchievementConfigSection';
import { RoleConfigSection } from './modules/RoleConfigSection';
import { LevelConfigSection } from './modules/LevelConfigSection';
import { BasicParamsSection } from './modules/BasicParamsSection';
import { CardMottoSection } from './modules/CardMottoSection';
import { QuestRoleSection } from './modules/QuestRoleSection';
import { ImageGallerySection } from './modules/GalleryModule';
import { LineRichMenuSection } from './modules/LineRichMenuSection';

// ── 名冊預覽列型別 ───────────────────────────────────────────────────────────
interface ParsedRosterRow {
    rawPhone: string;
    userId: string;
    name: string;
    birthday: string;
    bigTeam: string;
    isCommandant: boolean;
    littleTeam: string;
    isCaptain: boolean;
    phoneError: string | null;   // 格式錯誤 → 該列匯入時將被跳過
    isDupInBatch: boolean;       // 批次內重複（同一電話出現多次）
    isDupInDb: boolean;          // DB 已存在（將覆蓋）
}

// ── 以下子元件已移至 modules/ 及 shared/ ────────────────────────────────────
// IconPicker → shared/IconPicker.tsx
// GalleryPickerButton → shared/IconPicker.tsx
// DailyQuestConfigSection → modules/QuestConfigSection.tsx
// GameItemConfigSection → modules/ArtifactConfigSection.tsx (renamed to ArtifactConfigSection)
// BonusQuestConfigSection → modules/BonusQuestConfigSection.tsx
// AchievementConfigSection → modules/AchievementConfigSection.tsx
// RoleConfigSection → modules/RoleConfigSection.tsx
// BasicParamsSection → modules/BasicParamsSection.tsx
// CardMottoSection → modules/CardMottoSection.tsx
// QuestRoleSection → modules/QuestRoleSection.tsx
// ImageGallerySection → modules/GalleryModule.tsx
// LineRichMenuSection → modules/LineRichMenuSection.tsx

// ── 以下常數供 AdminDashboard 主函式使用 ─────────────────────────────────────

// PLACEHOLDER_START (do not remove this line)
// NOTE: The inline component definitions that were here (lines ~29-2231)
// ── 傳愛分數 W4 參數面板 ─────────────────────────────────────────────────

function MqBonusSettleButton({ entry }: { entry: MainQuestEntry }) {
    const [settling, setSettling] = React.useState(false);
    const [result, setResult] = React.useState<any>(null);

    const handleSettle = async () => {
        if (!confirm(`確定結算「${entry.title}」的額外獎勵？\n門檻：${entry.bonusThresholdPct}%\n獎勵：每位達成者 +${entry.bonusRewardAmount} ${entry.bonusRewardType === 'exp' ? '修為' : '金幣'}`)) return;
        setSettling(true);
        const { settleMainQuestBonus } = await import('@/app/actions/admin');
        const res = await settleMainQuestBonus(
            entry.id,
            entry.bonusThresholdPct!,
            entry.bonusRewardType || 'coins',
            entry.bonusRewardAmount!,
            entry.startDate
        );
        if (!res.success && res.error) { alert(res.error); setSettling(false); return; }
        setResult(res);
        setSettling(false);
    };

    if (result) {
        const squads = result.squadResults ?? [];
        const passedSquads = squads.filter((s: any) => s.passed);
        const failedSquads = squads.filter((s: any) => !s.passed);
        return (
            <div className="rounded-xl p-3 space-y-2 bg-slate-800/50 border border-slate-700">
                <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-300">結算完成 · 已發放 {result.rewardedCount} 人</span>
                    <span className="text-slate-500">門檻 {entry.bonusThresholdPct}%</span>
                </div>
                {passedSquads.length > 0 && (
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-emerald-400">✅ 達標小隊：</p>
                        {passedSquads.map((s: any) => (
                            <div key={s.squad} className="flex items-center justify-between text-[10px] px-2 py-1 bg-emerald-500/10 rounded-lg">
                                <span className="text-emerald-300 font-bold">{s.squad}</span>
                                <span className="text-emerald-400">{s.achieved}/{s.members} 人（{s.pct}%）</span>
                            </div>
                        ))}
                    </div>
                )}
                {failedSquads.length > 0 && (
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-red-400">❌ 未達標小隊：</p>
                        {failedSquads.map((s: any) => (
                            <div key={s.squad} className="flex items-center justify-between text-[10px] px-2 py-1 bg-red-500/10 rounded-lg">
                                <span className="text-red-300 font-bold">{s.squad}</span>
                                <span className="text-red-400">{s.achieved}/{s.members} 人（{s.pct}%）</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <button onClick={handleSettle} disabled={settling}
            className="w-full py-2 rounded-xl font-black text-xs bg-amber-600 hover:bg-amber-500 text-white transition-all active:scale-95 disabled:opacity-50">
            {settling ? '結算中...' : '🎁 結算額外獎勵'}
        </button>
    );
}

function W4ConfigPanel({ systemSettings, updateGlobalSetting }: { systemSettings: SystemSettings; updateGlobalSetting: (key: string, value: string) => void }) {
    const [open, setOpen] = React.useState(false);
    const [draft, setDraft] = React.useState({ reward: 1000, coins: null as number | null, limit: 99 });
    const [saved, setSaved] = React.useState(false);

    // 從 BonusQuestConfig 找 w4 規則
    const rules: any[] = React.useMemo(() => {
        try { return JSON.parse(systemSettings.BonusQuestConfig ?? '[]'); } catch { return []; }
    }, [systemSettings.BonusQuestConfig]);

    // 開啟時載入當前值
    React.useEffect(() => {
        const w4 = rules.find((r: any) => r.id === 'w4');
        setDraft({ reward: w4?.reward ?? 1000, coins: w4?.coins ?? null, limit: w4?.limit ?? 99 });
    }, [rules]);

    const handleSave = () => {
        let updated = rules.map((r: any) => r.id === 'w4' ? { ...r, ...draft } : r);
        if (!rules.some((r: any) => r.id === 'w4')) {
            updated.push({ id: 'w4', label: '傳愛分數', sub: '訪談成功加分', icon: '❤️', reward: draft.reward, coins: draft.coins, limit: draft.limit, keywords: ['傳愛'], bonusType: 'energy_dice', bonusAmount: 1, active: true });
        }
        updateGlobalSetting('BonusQuestConfig', JSON.stringify(updated));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    if (!open) return (
        <button onClick={() => setOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/30 text-pink-400 text-xs font-black rounded-2xl transition-colors">
            ⚙️ 傳愛分數參數設定
        </button>
    );

    return (
        <div className="bg-pink-950/20 border border-pink-500/20 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-pink-400 uppercase tracking-widest">⚙️ 傳愛分數參數</p>
                <button onClick={() => setOpen(false)} className="p-1 text-slate-500 hover:text-white"><X size={14} /></button>
            </div>
            <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                    <label className="text-[10px] text-pink-400/70 font-bold">修為獎勵</label>
                    <input type="number" min={0} value={draft.reward}
                        onChange={e => setDraft(d => ({ ...d, reward: parseInt(e.target.value) || 0 }))}
                        className="w-full bg-slate-950 border border-pink-500/30 rounded-xl p-2.5 text-white font-bold text-center outline-none focus:border-pink-500 text-sm" />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] text-pink-400/70 font-bold">金幣獎勵 <span className="text-slate-600 font-normal">空=×0.1</span></label>
                    <input type="number" min={0} placeholder={`${Math.floor(draft.reward * 0.1)}`}
                        value={draft.coins ?? ''}
                        onChange={e => setDraft(d => ({ ...d, coins: e.target.value !== '' ? parseInt(e.target.value) : null }))}
                        className="w-full bg-slate-950 border border-pink-500/30 rounded-xl p-2.5 text-white font-bold text-center outline-none focus:border-yellow-500 text-sm" />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] text-pink-400/70 font-bold">每週上限</label>
                    <input type="number" min={1} value={draft.limit}
                        onChange={e => setDraft(d => ({ ...d, limit: parseInt(e.target.value) || 1 }))}
                        className="w-full bg-slate-950 border border-pink-500/30 rounded-xl p-2.5 text-white font-bold text-center outline-none focus:border-pink-500 text-sm" />
                </div>
            </div>
            <button onClick={handleSave}
                className={`w-full py-2.5 rounded-xl font-black text-sm transition-all ${saved ? 'bg-emerald-600 text-white' : 'bg-pink-600 hover:bg-pink-500 text-white shadow-lg active:scale-95'}`}>
                {saved ? '✓ 已儲存' : '💾 儲存參數'}
            </button>
        </div>
    );
}

const ACTION_LABELS: Record<string, string> = {
    temp_quest_add: '新增臨時任務',
    temp_quest_toggle: '切換臨時任務狀態',
    temp_quest_delete: '刪除臨時任務',
    roster_import: '匯入名冊',
    auto_assign_squads: '自動分配大小隊',
    auto_draw_quests: '全服自動抽籤',
    weekly_snapshot: '每週業力結算',
    w3_compliance: 'w3 週罰款結算',
    w4_final_approve: 'w4 終審核准',
    w4_final_reject: 'w4 終審駁回',
    topic_title_update: '更新主題名稱',
    quest_config_create: '新增定課設定',
    quest_config_update: '修改定課設定',
    quest_config_toggle: '切換定課啟用',
    quest_config_delete: '刪除定課設定',
    quest_config_seed: '套用預設定課',
    artifact_config_create: '新增法寶設定',
    artifact_config_update: '修改法寶設定',
    artifact_config_toggle: '切換法寶啟用',
    artifact_config_delete: '刪除法寶設定',
    artifact_config_seed: '套用預設法寶',
    achievement_config_create: '新增成就設定',
    achievement_config_update: '修改成就設定',
    achievement_config_toggle: '切換成就啟用',
    achievement_config_delete: '刪除成就設定',
    achievement_config_seed: '套用預設成就',
    site_name_update: '修改站台名稱',
    logo_upload: '更換 Logo',
    logo_remove: '移除 Logo',
    card_back_image_upload: '更換卡背圖片',
    card_back_image_remove: '移除卡背圖片',
    motto_save: '儲存格言',
    display_name_save: '設定顯示名稱',
    member_assignment_update: '修改成員分配',
    member_add: '新增成員',
    gallery_upload: '上傳圖片至圖庫',
    gallery_delete: '刪除圖庫圖片',
    course_create: '新增課程',
    course_update: '修改課程',
    course_delete: '刪除課程',
};

const DETAIL_LABELS: Record<string, string> = {
    active: '啟用',
    count: '數量',
    exp: '修為獎勵',
    coins: '銅錢',
    dice: '骰子數',
    price: '售價',
    teamBinding: '隊伍共享',
    effect: '效果',
    rarity: '稀有度',
    team: '大隊',
    squad: '小隊',
    isCaptain: '小隊長',
    isCommandant: '大隊長',
    isGM: 'GM',
    source: '來源',
    url: '圖片',
    date: '日期',
    time: '時間',
    location: '地點',
    notes: '備註',
    type: '類型',
    interviewTarget: '傳愛對象',
    questId: '任務ID',
    worldState: '世界狀態',
    rate: '活躍率',
    error: '錯誤',
    checkInError: '入帳錯誤',
};

interface AdminDashboardProps {
    adminAuth: boolean;
    onAuth: (e: { preventDefault: () => void; currentTarget: HTMLFormElement }) => void;
    systemSettings: SystemSettings;
    updateGlobalSetting: (key: string, value: string) => void;
    updateGlobalSettings: (updates: Record<string, string>) => void;
    leaderboard: CharacterStats[];
    topicHistory: TopicHistory[];
    temporaryQuests: TemporaryQuest[];
    squadApprovedW4Apps: W4Application[];
    adminLogs: AdminLog[];
    testimonies: Testimony[];
    courses: Course[];
    onAddTempQuest: (title: string, sub: string, desc: string, reward: number, coins?: number, startDate?: string, endDate?: string, category?: 'temp' | 'special') => void;
    onToggleTempQuest: (id: string, active: boolean) => void;
    onDeleteTempQuest: (id: string) => void;
    onUpdateTempQuest: (id: string, reward: number, coins: number | null) => void;
    onTriggerSnapshot: () => void;
    onCheckW3Compliance: () => void;
    onAutoDrawAllSquads: () => void;
    onImportRoster: (csvData: string) => Promise<void>;
    onFinalReviewW4: (appId: string, approve: boolean, notes: string) => Promise<void>;
    onUpsertCourse: (course: Omit<Course, 'created_at'>) => Promise<void>;
    onDeleteCourse: (id: string) => Promise<void>;
    onUpdateMemberAssignment: (userId: string, teamName: string, squadName: string, isCaptain: boolean, isCommandant: boolean, isGM: boolean) => Promise<void>;
    onRefreshLeaderboard: () => Promise<void>;
    onDeleteAdminLog: (id: string) => Promise<void>;
    onClose: () => void;
    onQuickLogin?: (userId: string) => void;
}

export function AdminDashboard({
    adminAuth, onAuth, systemSettings, updateGlobalSetting, updateGlobalSettings,
    leaderboard, topicHistory, temporaryQuests,
    squadApprovedW4Apps, adminLogs, testimonies, courses,
    onAddTempQuest, onToggleTempQuest, onDeleteTempQuest, onUpdateTempQuest,
    onTriggerSnapshot, onCheckW3Compliance, onAutoDrawAllSquads,
    onImportRoster, onFinalReviewW4, onUpsertCourse, onDeleteCourse,
    onUpdateMemberAssignment, onRefreshLeaderboard, onClose, onQuickLogin
}: AdminDashboardProps) {
    const [csvInput, setCsvInput] = React.useState("");
    const [isImporting, setIsImporting] = React.useState(false);
    const [rosterPreviewRows, setRosterPreviewRows] = React.useState<ParsedRosterRow[]>([]);
    const [showRosterPreview, setShowRosterPreview] = React.useState(false);
    const [rosterCheckLoading, setRosterCheckLoading] = React.useState(false);
    const [w4Notes, setW4Notes] = React.useState<Record<string, string>>({});
    const [reviewingW4Id, setReviewingW4Id] = React.useState<string | null>(null);
    const [volunteerPwd, setVolunteerPwd] = React.useState('');
    const [volPwdSaved, setVolPwdSaved] = React.useState(false);

    // 主線任務設定
    const mainQuestSchedule: MainQuestEntry[] = React.useMemo(() => {
        try { return JSON.parse(systemSettings.MainQuestSchedule ?? '[]'); } catch { return []; }
    }, [systemSettings.MainQuestSchedule]);

    const [mqFormEntry, setMqFormEntry] = React.useState({ topicTitle: '', title: '', description: '', reward: '1000', coins: '0', startDate: '', bonusThresholdPct: '', bonusRewardType: 'coins' as 'coins' | 'exp', bonusRewardAmount: '' });

    // 臨時任務內聯編輯
    const [tqEditId, setTqEditId] = React.useState<string | null>(null);
    const [tqEditTitle, setTqEditTitle] = React.useState('');
    const [tqEditSub, setTqEditSub] = React.useState('');
    const [tqEditDesc, setTqEditDesc] = React.useState('');
    const [tqEditReward, setTqEditReward] = React.useState('');
    const [tqEditCoins, setTqEditCoins] = React.useState('');
    const [tqEditStartDate, setTqEditStartDate] = React.useState('');
    const [tqEditEndDate, setTqEditEndDate] = React.useState('');

    const today = new Date().toISOString().split('T')[0];
    const activeMqEntry = [...mainQuestSchedule]
        .filter(e => e.startDate <= today)
        .sort((a, b) => b.startDate.localeCompare(a.startDate))[0];

    const handleAddMqEntry = () => {
        if (!mqFormEntry.title.trim() || !mqFormEntry.startDate) return;
        const newEntry: MainQuestEntry = {
            id: Date.now().toString(),
            topicTitle: mqFormEntry.topicTitle.trim() || undefined,
            title: mqFormEntry.title.trim(),
            description: mqFormEntry.description.trim() || undefined,
            reward: parseInt(mqFormEntry.reward, 10) || 1000,
            coins: Number(mqFormEntry.coins) || 0,
            startDate: mqFormEntry.startDate,
            bonusThresholdPct: mqFormEntry.bonusThresholdPct ? parseInt(mqFormEntry.bonusThresholdPct, 10) : undefined,
            bonusRewardType: mqFormEntry.bonusThresholdPct ? mqFormEntry.bonusRewardType : undefined,
            bonusRewardAmount: mqFormEntry.bonusRewardAmount ? parseInt(mqFormEntry.bonusRewardAmount, 10) : undefined,
        };
        const sorted = [...mainQuestSchedule, newEntry].sort((a, b) => a.startDate.localeCompare(b.startDate));
        updateGlobalSetting('MainQuestSchedule', JSON.stringify(sorted));
        setMqFormEntry({ topicTitle: '', title: '', description: '', reward: '1000', coins: '0', startDate: '', bonusThresholdPct: '', bonusRewardType: 'coins', bonusRewardAmount: '' });
    };

    const handleRemoveMqEntry = (id: string) => {
        updateGlobalSetting('MainQuestSchedule', JSON.stringify(mainQuestSchedule.filter(e => e.id !== id)));
    };

    const [mqEditId, setMqEditId] = React.useState<string | null>(null);
    const [mqEditForm, setMqEditForm] = React.useState({ topicTitle: '', title: '', description: '', reward: '1000', coins: '0', startDate: '', bonusThresholdPct: '', bonusRewardType: 'coins' as 'coins' | 'exp', bonusRewardAmount: '' });

    const handleOpenMqEdit = (entry: MainQuestEntry) => {
        setMqEditId(entry.id);
        setMqEditForm({ topicTitle: entry.topicTitle || '', title: entry.title, description: entry.description || '', reward: String(entry.reward), coins: String(entry.coins), startDate: entry.startDate, bonusThresholdPct: entry.bonusThresholdPct ? String(entry.bonusThresholdPct) : '', bonusRewardType: entry.bonusRewardType || 'coins', bonusRewardAmount: entry.bonusRewardAmount ? String(entry.bonusRewardAmount) : '' });
    };

    const handleSaveMqEdit = () => {
        if (!mqEditId || !mqEditForm.title.trim() || !mqEditForm.startDate) return;
        const updated = mainQuestSchedule.map(e => e.id === mqEditId ? {
            ...e,
            topicTitle: mqEditForm.topicTitle.trim() || undefined,
            title: mqEditForm.title.trim(),
            description: mqEditForm.description.trim() || undefined,
            reward: parseInt(mqEditForm.reward, 10) || 1000,
            coins: Number(mqEditForm.coins) || 0,
            startDate: mqEditForm.startDate,
            bonusThresholdPct: mqEditForm.bonusThresholdPct ? parseInt(mqEditForm.bonusThresholdPct, 10) : undefined,
            bonusRewardType: mqEditForm.bonusThresholdPct ? mqEditForm.bonusRewardType : undefined,
            bonusRewardAmount: mqEditForm.bonusRewardAmount ? parseInt(mqEditForm.bonusRewardAmount, 10) : undefined,
        } : e).sort((a, b) => a.startDate.localeCompare(b.startDate));
        updateGlobalSetting('MainQuestSchedule', JSON.stringify(updated));
        setMqEditId(null);
    };

    const handleApplyMqEntry = (entry: MainQuestEntry) => {
        updateGlobalSettings({
            TopicQuestTitle: entry.topicTitle || entry.title,
            TopicQuestReward: String(entry.reward),
            TopicQuestCoins: String(entry.coins),
            TopicQuestDescription: entry.description || '',
            MainQuestAppliedId: entry.id,
        });
    };

    // 大小隊分組管理
    const [squadExpandedTeams, setSquadExpandedTeams] = React.useState<Set<string>>(new Set());
    const [squadExpandedSquads, setSquadExpandedSquads] = React.useState<Set<string>>(new Set());
    const [editingMemberId, setEditingMemberId] = React.useState<string | null>(null);
    const [memberEditForm, setMemberEditForm] = React.useState({ teamName: '', squadName: '', isCaptain: false, isCommandant: false, isGM: false });
    const [memberSaving, setMemberSaving] = React.useState(false);

    // 任務角色
    type QuestRoleConfig = { id: string; name: string; duties: string[] };
    const parseQuestRoles = (raw: string | null | undefined): string[] => {
        if (!raw) return [];
        try { const p = JSON.parse(raw); return Array.isArray(p) ? p : [raw]; } catch { return [raw]; }
    };
    const [questRolesConfig, setQuestRolesConfig] = React.useState<QuestRoleConfig[]>(DEFAULT_QUEST_ROLES);
    const [rolesSaving, setRolesSaving] = React.useState(false);
    const [memberDetailRoles, setMemberDetailRoles] = React.useState<string[]>([]);
    React.useEffect(() => {
        if (!adminAuth) return;
        import('@/app/actions/admin').then(({ getQuestRoles }) =>
            getQuestRoles().then(r => setQuestRolesConfig(r.length > 0 ? r : DEFAULT_QUEST_ROLES))
        );
    }, [adminAuth]);

    // 自訂隊名（可自訂，不影響固定識別碼）
    const [squadDisplayNames, setSquadDisplayNames] = React.useState<Record<string, string>>({});
    const [battalionDisplayNames, setBattalionDisplayNames] = React.useState<Record<string, string>>({});
    const [settingDisplayNameFor, setSettingDisplayNameFor] = React.useState<{ type: 'squad' | 'battalion'; id: string } | null>(null);
    const [displayNameInput, setDisplayNameInput] = React.useState('');
    const [displayNameSaving, setDisplayNameSaving] = React.useState(false);

    // 載入自訂隊名
    React.useEffect(() => {
        if (!adminAuth) return;
        import('@/app/actions/admin').then(({ getGroupDisplayNames }) =>
            getGroupDisplayNames().then(({ squads, battalions }) => {
                setSquadDisplayNames(Object.fromEntries(squads.filter(s => s.display_name).map(s => [s.LittleTeamLeagelName, s.display_name!])));
                setBattalionDisplayNames(Object.fromEntries(battalions.filter(b => b.display_name).map(b => [b.battalion_name, b.display_name!])));
            })
        );
    }, [adminAuth]);

    const saveDisplayName = async () => {
        if (!settingDisplayNameFor) return;
        setDisplayNameSaving(true);
        if (settingDisplayNameFor.type === 'squad') {
            const { setSquadDisplayName } = await import('@/app/actions/admin');
            await setSquadDisplayName(settingDisplayNameFor.id, displayNameInput);
            setSquadDisplayNames(prev => ({ ...prev, [settingDisplayNameFor.id]: displayNameInput.trim() }));
        } else {
            const { setBattalionDisplayName } = await import('@/app/actions/admin');
            await setBattalionDisplayName(settingDisplayNameFor.id, displayNameInput);
            setBattalionDisplayNames(prev => ({ ...prev, [settingDisplayNameFor.id]: displayNameInput.trim() }));
        }
        setDisplayNameSaving(false);
        await logAdminAction('display_name_save', 'admin', settingDisplayNameFor.id ?? '', displayNameInput, { type: settingDisplayNameFor.type });
        setSettingDisplayNameFor(null);
    };

    // 手動定義的大隊
    const definedBattalions: string[] = React.useMemo(() => {
        try { return JSON.parse(systemSettings.DefinedBattalions ?? '[]'); } catch { return []; }
    }, [systemSettings.DefinedBattalions]);

    const [addBattalionOpen, setAddBattalionOpen] = React.useState(false);
    const [addBattalionId, setAddBattalionId] = React.useState('');

    const saveDefinedBattalions = (next: string[]) => {
        updateGlobalSetting('DefinedBattalions', JSON.stringify(next));
    };

    const handleAddBattalion = () => {
        if (!addBattalionId.trim()) return;
        if (definedBattalions.includes(addBattalionId.trim())) return;
        saveDefinedBattalions([...definedBattalions, addBattalionId.trim()]);
        setAddBattalionId('');
        setAddBattalionOpen(false);
    };

    const handleRemoveDefinedBattalion = (teamId: string) => {
        saveDefinedBattalions(definedBattalions.filter(t => t !== teamId));
    };

    // 手動定義的小隊
    const definedSquads: { teamId: string; squadId: string }[] = React.useMemo(() => {
        try { return JSON.parse(systemSettings.DefinedSquads ?? '[]'); } catch { return []; }
    }, [systemSettings.DefinedSquads]);

    const [addSquadOpen, setAddSquadOpen] = React.useState(false);
    const [addSquadTeam, setAddSquadTeam] = React.useState('');
    const [addSquadId, setAddSquadId] = React.useState('');

    const saveDefinedSquads = (next: { teamId: string; squadId: string }[]) => {
        updateGlobalSetting('DefinedSquads', JSON.stringify(next));
    };

    const handleAddSquad = () => {
        if (!addSquadTeam.trim() || !addSquadId.trim()) return;
        const exists = definedSquads.some(s => s.teamId === addSquadTeam.trim() && s.squadId === addSquadId.trim());
        if (exists) return;
        saveDefinedSquads([...definedSquads, { teamId: addSquadTeam.trim(), squadId: addSquadId.trim() }]);
        setAddSquadId('');
        setAddSquadOpen(false);
    };

    const handleRemoveDefinedSquad = (teamId: string, squadId: string) => {
        saveDefinedSquads(definedSquads.filter(s => !(s.teamId === teamId && s.squadId === squadId)));
    };

    // 分組結構：大隊 → 小隊 → 成員（大隊長用特殊 key '__commandant__' 獨立顯示）
    const COMMANDANT_KEY = '__commandant__';
    const groupedByTeam = React.useMemo(() => {
        const map = new Map<string, Map<string, CharacterStats[]>>();
        for (const p of leaderboard) {
            const team = p.BigTeamLeagelName ?? '（未分配）';
            // 大隊長不歸入任何小隊，改用特殊 key
            const squad = p.IsCommandant ? COMMANDANT_KEY : (p.LittleTeamLeagelName ?? '（未分配）');
            if (!map.has(team)) map.set(team, new Map());
            const squadMap = map.get(team)!;
            if (!squadMap.has(squad)) squadMap.set(squad, []);
            squadMap.get(squad)!.push(p);
        }
        // 合併手動定義的空大隊
        for (const teamId of definedBattalions) {
            if (!map.has(teamId)) map.set(teamId, new Map());
        }
        // 合併手動定義的空小隊
        for (const { teamId, squadId } of definedSquads) {
            if (!map.has(teamId)) map.set(teamId, new Map());
            const squadMap = map.get(teamId)!;
            if (!squadMap.has(squadId)) squadMap.set(squadId, []);
        }
        return map;
    }, [leaderboard, definedBattalions, definedSquads]);

    const allSquadNames = React.useMemo(() => [...new Set(leaderboard.map(p => p.LittleTeamLeagelName).filter(Boolean))] as string[], [leaderboard]);
    const allTeamNames = React.useMemo(() => [...new Set(leaderboard.map(p => p.BigTeamLeagelName).filter(Boolean))] as string[], [leaderboard]);

    const toggleTeam = (name: string) => setSquadExpandedTeams(prev => {
        const s = new Set(prev);
        s.has(name) ? s.delete(name) : s.add(name);
        return s;
    });
    const toggleSquad = (name: string) => setSquadExpandedSquads(prev => {
        const s = new Set(prev);
        s.has(name) ? s.delete(name) : s.add(name);
        return s;
    });

    const startEditMember = (p: CharacterStats) => {
        setEditingMemberId(p.UserID);
        setMemberEditForm({ teamName: p.BigTeamLeagelName ?? '', squadName: p.LittleTeamLeagelName ?? '', isCaptain: !!p.IsCaptain, isCommandant: !!p.IsCommandant, isGM: !!p.IsGM });
    };
    const saveMemberEdit = async () => {
        if (!editingMemberId) return;
        setMemberSaving(true);
        await onUpdateMemberAssignment(editingMemberId, memberEditForm.teamName, memberEditForm.squadName, memberEditForm.isCaptain, memberEditForm.isCommandant, memberEditForm.isGM);
        await logAdminAction('member_assignment_update', 'admin', editingMemberId ?? '', undefined, { team: memberEditForm.teamName, squad: memberEditForm.squadName, isCaptain: memberEditForm.isCaptain, isCommandant: memberEditForm.isCommandant });
        setMemberSaving(false);
        setEditingMemberId(null);
    };

    // helper：格式化顯示名稱「第一大隊（龍騎隊）」
    const formatTeamLabel = (id: string) => {
        const dn = battalionDisplayNames[id];
        return dn ? `${id}（${dn}）` : id;
    };
    const formatSquadLabel = (id: string) => {
        const dn = squadDisplayNames[id];
        return dn ? `${id}（${dn}）` : id;
    };

    // 課程報名名單
    const [regListCourseId, setRegListCourseId] = React.useState<string>('');
    const [regList, setRegList] = React.useState<{ userId: string; userName: string; teamName: string; squadName: string; registeredAt: string; attended: boolean; attendedAt: string | null; checkedInBy: string | null }[]>([]);
    const [regListLoading, setRegListLoading] = React.useState(false);
    const [regFilter, setRegFilter] = React.useState('');
    const [regAttendFilter, setRegAttendFilter] = React.useState<'all' | 'attended' | 'not_attended'>('all');
    type RegSortKey = 'teamName' | 'squadName' | 'userName' | 'registeredAt' | 'attended' | 'attendedAt';
    const [regSort, setRegSort] = React.useState<{ key: RegSortKey; dir: 'asc' | 'desc' }>({ key: 'registeredAt', dir: 'asc' });

    const handleRegSort = (key: RegSortKey) => {
        setRegSort(prev => prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });
    };

    const filteredRegList = React.useMemo(() => {
        let list = [...regList];
        if (regFilter.trim()) {
            const kw = regFilter.trim().toLowerCase();
            list = list.filter(r => r.userName.toLowerCase().includes(kw) || r.teamName.toLowerCase().includes(kw) || r.squadName.toLowerCase().includes(kw));
        }
        if (regAttendFilter === 'attended') list = list.filter(r => r.attended);
        if (regAttendFilter === 'not_attended') list = list.filter(r => !r.attended);
        list.sort((a, b) => {
            const va = a[regSort.key];
            const vb = b[regSort.key];
            const cmp = typeof va === 'boolean' ? (va === vb ? 0 : va ? -1 : 1) : String(va).localeCompare(String(vb), 'zh-TW');
            return regSort.dir === 'asc' ? cmp : -cmp;
        });
        return list;
    }, [regList, regFilter, regAttendFilter, regSort]);

    const loadRegList = async (courseId: string) => {
        setRegListCourseId(courseId);
        setRegListLoading(true);
        const list = await getCourseRegistrations(courseId);
        setRegList(list);
        setRegListLoading(false);
    };

    const downloadRegListCsv = () => {
        if (regList.length === 0) return;
        const courseName = courses.find(c => c.id === regListCourseId)?.name ?? regListCourseId;
        const header = ['#', '大隊', '小隊', '姓名', '報名時間', '報到狀態', '報到時間', '掃碼者'];
        const rows = regList.map((r, i) => [
            i + 1,
            r.teamName,
            r.squadName,
            r.userName,
            new Date(r.registeredAt).toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
            r.attended ? '已報到' : '未報到',
            r.attendedAt ? new Date(r.attendedAt).toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—',
            r.checkedInBy ?? '—',
        ]);
        const csv = '\uFEFF' + [header, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${courseName}_報名名單.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // 手動新增人員
    const [addMemberOpen, setAddMemberOpen] = React.useState(false);
    const [addMemberSaving, setAddMemberSaving] = React.useState(false);
    const [addMemberForm, setAddMemberForm] = React.useState({
        name: '', phone: '', email: '', birthday: '', role: '孫悟空',
        teamName: '', squadName: '', isCaptain: false, isCommandant: false,
    });
    const handleAddMember = async () => {
        if (!addMemberForm.name.trim() || !addMemberForm.phone.trim()) return;
        setAddMemberSaving(true);
        const { adminCreateMember } = await import('@/app/actions/admin');
        const res = await adminCreateMember(addMemberForm);
        setAddMemberSaving(false);
        if (!res.success) { alert(`新增失敗：${res.error}`); return; }
        await logAdminAction('member_add', 'admin', undefined, addMemberForm.name, { team: addMemberForm.teamName, squad: addMemberForm.squadName });
        setAddMemberOpen(false);
        setAddMemberForm({ name: '', phone: '', email: '', birthday: '', role: '孫悟空', teamName: '', squadName: '', isCaptain: false, isCommandant: false });
        await onRefreshLeaderboard();
    };

    // 參與人員名單
    type MemberSortKey = 'Name' | 'BigTeamLeagelName' | 'LittleTeamLeagelName' | 'Level' | 'Exp' | 'Streak' | 'TotalFines';
    const [memberFilter, setMemberFilter] = React.useState('');
    const [memberTeamFilter, setMemberTeamFilter] = React.useState('');
    const [memberSquadFilter, setMemberSquadFilter] = React.useState('');
    const [memberDetailTarget, setMemberDetailTarget] = React.useState<CharacterStats | null>(null);
    const [memberSort, setMemberSort] = React.useState<{ key: MemberSortKey; dir: 'asc' | 'desc' }>({ key: 'Exp', dir: 'desc' });
    const handleMemberSort = (key: MemberSortKey) => {
        setMemberSort(prev => prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' });
    };
    const allTeams = React.useMemo(() => [...new Set(leaderboard.map(p => p.BigTeamLeagelName).filter(Boolean))].sort() as string[], [leaderboard]);
    const allSquadsForTeam = React.useMemo(() => {
        const src = memberTeamFilter ? leaderboard.filter(p => p.BigTeamLeagelName === memberTeamFilter) : leaderboard;
        return [...new Set(src.map(p => p.LittleTeamLeagelName).filter(Boolean))].sort() as string[];
    }, [leaderboard, memberTeamFilter]);
    const filteredMembers = React.useMemo(() => {
        let list = [...leaderboard];
        if (memberFilter.trim()) {
            const kw = memberFilter.trim().toLowerCase();
            list = list.filter(p => p.Name.toLowerCase().includes(kw) || (p.BigTeamLeagelName ?? '').toLowerCase().includes(kw) || (p.LittleTeamLeagelName ?? '').toLowerCase().includes(kw));
        }
        if (memberTeamFilter) list = list.filter(p => p.BigTeamLeagelName === memberTeamFilter);
        if (memberSquadFilter) list = list.filter(p => p.LittleTeamLeagelName === memberSquadFilter);
        list.sort((a, b) => {
            const va = a[memberSort.key] ?? 0;
            const vb = b[memberSort.key] ?? 0;
            const cmp = typeof va === 'number' ? (va as number) - (vb as number) : String(va).localeCompare(String(vb), 'zh-TW');
            return memberSort.dir === 'asc' ? cmp : -cmp;
        });
        return list;
    }, [leaderboard, memberFilter, memberTeamFilter, memberSquadFilter, memberSort]);
    const downloadMembersCsv = () => {
        if (filteredMembers.length === 0) return;
        const header = ['#', '姓名', '大隊', '小隊', '職位', '任務角色', '等級', '修為'];
        const rows = filteredMembers.map((p, i) => [
            i + 1, p.Name, p.BigTeamLeagelName ?? '—', p.LittleTeamLeagelName ?? '—',
            p.IsCommandant ? '大隊長' : p.IsCaptain ? '小隊長' : '學員',
            parseQuestRoles(p.QuestRole).map(id => questRolesConfig.find(rc => rc.id === id)?.name ?? id).join('・') || '—',
            p.Level, p.Exp,
        ]);
        const csv = '\uFEFF' + [header, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = '參與人員名單.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    // 課程管理
    const DOW = ['日', '一', '二', '三', '四', '五', '六'];
    const genDateDisplay = (date: string) => {
        if (!date) return '';
        const d = new Date(date + 'T00:00:00');
        return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${DOW[d.getDay()]}）`;
    };

    // 課程報名彈窗
    const [regModalCourse, setRegModalCourse] = React.useState<Course | null>(null);

    type CourseFormState = { id: string; name: string; date: string; startTime: string; endTime: string; location: string; address: string; is_active: boolean; sort_order: number; reward_exp: string; reward_coins: string };
    const emptyCourseForm: CourseFormState = { id: '', name: '', date: '', startTime: '', endTime: '', location: '', address: '', is_active: true, sort_order: 0, reward_exp: '0', reward_coins: '0' };
    const [courseForm, setCourseForm] = React.useState<CourseFormState>(emptyCourseForm);
    const [editingCourseId, setEditingCourseId] = React.useState<string | null>(null);
    const [courseSubmitting, setCourseSubmitting] = React.useState(false);
    const [showCourseModal, setShowCourseModal] = React.useState(false);
    const [showMqModal, setShowMqModal] = React.useState(false);
    const [showTqModal, setShowTqModal] = React.useState(false);
    const [showSpecialModal, setShowSpecialModal] = React.useState(false);
    const [tqFormTitle, setTqFormTitle] = React.useState('');
    const [tqFormSub, setTqFormSub] = React.useState('');
    const [tqFormDesc, setTqFormDesc] = React.useState('');
    const [tqFormReward, setTqFormReward] = React.useState('500');
    const [tqFormCoins, setTqFormCoins] = React.useState('');
    const [tqFormStartDate, setTqFormStartDate] = React.useState('');
    const [tqFormEndDate, setTqFormEndDate] = React.useState('');

    // ── 巔峰試煉管理 state ───────────────────────────────────
    const emptyPtForm = { title: '', description: '', date: '', time: '', location: '', max_participants: '' };
    const [peakTrials, setPeakTrials] = React.useState<PeakTrial[]>([]);
    const [ptForm, setPtForm] = React.useState(emptyPtForm);
    const [showPtForm, setShowPtForm] = React.useState(false);
    const [ptEditingId, setPtEditingId] = React.useState<string | null>(null);
    const [ptSaving, setPtSaving] = React.useState(false);
    const [ptDeletingId, setPtDeletingId] = React.useState<string | null>(null);
    const [ptViewRegs, setPtViewRegs] = React.useState<{ trialId: string; regs: PeakTrialRegistration[] } | null>(null);
    const [ptMarkingId, setPtMarkingId] = React.useState<string | null>(null);

    const refreshPtList = () => listPeakTrials().then(res => { if (res.success) setPeakTrials(res.trials); });

    React.useEffect(() => { refreshPtList(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── 巔峰試煉審核 state ───────────────────────────────────
    const [ptReviews, setPtReviews] = React.useState<PeakTrialReview[]>([]);
    const [ptReviewNotes, setPtReviewNotes] = React.useState<Record<string, string>>({});
    const [ptReviewingId, setPtReviewingId] = React.useState<string | null>(null);
    const [ptPhotoOpen, setPtPhotoOpen] = React.useState<string | null>(null);
    const [ptRecalculating, setPtRecalculating] = React.useState(false);
    const [ptBatchApproving, setPtBatchApproving] = React.useState(false);
    const [ptBatchRejecting, setPtBatchRejecting] = React.useState(false);
    const [ptSelectedIds, setPtSelectedIds] = React.useState<Set<string>>(new Set());
    const [ptParticipants, setPtParticipants] = React.useState<Record<string, PeakTrialRegistration[]>>({});
    const [ptLoadingParticipants, setPtLoadingParticipants] = React.useState<string | null>(null);
    const [bgBuyRate, setBgBuyRate] = React.useState(systemSettings.BoardGameBuyRate || '10');
    const [bgSellRate, setBgSellRate] = React.useState(systemSettings.BoardGameSellRate || '10');
    const [bgZeroCash, setBgZeroCash] = React.useState(systemSettings.BoardGameZeroCashMultiplier || '1');
    const [bgZeroBlessing, setBgZeroBlessing] = React.useState(systemSettings.BoardGameZeroBlessingMultiplier || '1');

    const refreshPtReviews = () => listPeakTrialReviews().then(res => { if (res.success) setPtReviews(res.reviews); });

    React.useEffect(() => { refreshPtReviews(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handlePtApprove = async (reviewId: string) => {
        setPtReviewingId(reviewId);
        const res = await approvePeakTrialReview(reviewId, 'admin');
        setPtReviewingId(null);
        if (res.success) {
            alert(`✅ 已核准，${res.membersRewarded} 位隊員獲得修為`);
            refreshPtReviews();
        } else {
            alert(res.error || '核准失敗');
        }
    };

    const handlePtReject = async (reviewId: string) => {
        setPtReviewingId(reviewId);
        const res = await rejectPeakTrialReview(reviewId, 'admin', ptReviewNotes[reviewId] || '');
        setPtReviewingId(null);
        if (res.success) {
            alert('已駁回審核');
            refreshPtReviews();
        } else {
            alert(res.error || '駁回失敗');
        }
    };

    const handlePtRecalcAll = async () => {
        const pending = ptReviews.filter(r => r.status === 'pending');
        if (pending.length === 0) { alert('目前無待審核申請'); return; }
        setPtRecalculating(true);
        let successCount = 0;
        for (const rv of pending) {
            const res = await recalcPeakTrialReview(rv.id);
            if (res.success) successCount++;
        }
        setPtRecalculating(false);
        alert(`已重新計算 ${successCount} 筆審核修為`);
        refreshPtReviews();
    };

    const togglePtSelect = (id: string) => setPtSelectedIds(prev => {
        const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
    });

    const handleLoadParticipants = async (reviewId: string, trialId: string, battalionName: string) => {
        if (ptParticipants[reviewId]) { setPtParticipants(prev => { const n = { ...prev }; delete n[reviewId]; return n; }); return; }
        setPtLoadingParticipants(reviewId);
        const res = await getPeakTrialRegistrations(trialId);
        setPtLoadingParticipants(null);
        if (res.success) {
            const own = res.registrations.filter(r => r.battalion_name === battalionName);
            const cross = res.registrations.filter(r => r.battalion_name !== battalionName);
            setPtParticipants(prev => ({ ...prev, [reviewId]: [...own, ...cross] }));
        }
    };

    const handlePtBatchApprove = async () => {
        const targets = ptReviews.filter(r => r.status === 'pending' && ptSelectedIds.has(r.id));
        if (targets.length === 0) { alert('請先勾選要核准的申請'); return; }
        if (!confirm(`確認批次核准 ${targets.length} 筆勾選申請並發放修為？`)) return;
        setPtBatchApproving(true);
        let successCount = 0;
        const errors: string[] = [];
        for (const rv of targets) {
            const res = await approvePeakTrialReview(rv.id, 'admin');
            if (res.success) { successCount++; setPtSelectedIds(prev => { const n = new Set(prev); n.delete(rv.id); return n; }); }
            else errors.push(`${rv.battalion_name}：${res.error}`);
        }
        setPtBatchApproving(false);
        alert(`批次核准完成：${successCount} 筆成功${errors.length > 0 ? `\n失敗：${errors.join('\n')}` : ''}`);
        refreshPtReviews();
    };

    const handlePtBatchReject = async () => {
        const targets = ptReviews.filter(r => r.status === 'pending' && ptSelectedIds.has(r.id));
        if (targets.length === 0) { alert('請先勾選要駁回的申請'); return; }
        if (!confirm(`確認批次駁回 ${targets.length} 筆勾選申請？`)) return;
        setPtBatchRejecting(true);
        let successCount = 0;
        for (const rv of targets) {
            const res = await rejectPeakTrialReview(rv.id, 'admin', ptReviewNotes[rv.id] || '');
            if (res.success) { successCount++; setPtSelectedIds(prev => { const n = new Set(prev); n.delete(rv.id); return n; }); }
        }
        setPtBatchRejecting(false);
        alert(`批次駁回完成：${successCount} 筆`);
        refreshPtReviews();
    };

    const openPtEdit = (trial: PeakTrial) => {
        setPtForm({
            title: trial.title,
            description: trial.description || '',
            date: trial.date,
            time: trial.time || '',
            location: trial.location || '',
            max_participants: trial.max_participants?.toString() || '',
        });
        setPtEditingId(trial.id);
        setShowPtForm(true);
    };

    const handleSavePt = async () => {
        if (!ptForm.title || !ptForm.date) return;
        setPtSaving(true);
        const res = await upsertPeakTrial({
            ...(ptEditingId ? { id: ptEditingId } : {}),
            title: ptForm.title,
            description: ptForm.description || undefined,
            date: ptForm.date,
            time: ptForm.time || undefined,
            location: ptForm.location || undefined,
            max_participants: ptForm.max_participants ? parseInt(ptForm.max_participants) : undefined,
            created_by: 'admin',
            is_active: true,
        });
        setPtSaving(false);
        if (res.success) {
            await refreshPtList();
            setPtForm(emptyPtForm);
            setShowPtForm(false);
            setPtEditingId(null);
        }
    };

    const handleDeletePt = async (id: string) => {
        setPtDeletingId(id);
        const res = await deletePeakTrial(id);
        setPtDeletingId(null);
        if (res.success) setPeakTrials(prev => prev.filter(t => t.id !== id));
    };

    const handleViewPtRegs = async (trialId: string) => {
        if (ptViewRegs?.trialId === trialId) { setPtViewRegs(null); return; }
        const res = await getPeakTrialRegistrations(trialId);
        if (res.success) setPtViewRegs({ trialId, regs: res.registrations });
    };

    const handleMarkPtAttendance = async (regId: string, trialId: string) => {
        setPtMarkingId(regId);
        const res = await markPeakTrialAttendance(regId);
        setPtMarkingId(null);
        if (res.success) {
            const updated = await getPeakTrialRegistrations(trialId);
            if (updated.success) setPtViewRegs({ trialId, regs: updated.registrations });
        }
    };

    const handleCourseSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        setCourseSubmitting(true);
        const timeStr = courseForm.startTime && courseForm.endTime
            ? `${courseForm.startTime}–${courseForm.endTime}`
            : courseForm.startTime || '';
        await onUpsertCourse({
            id: courseForm.id,
            name: courseForm.name,
            date: courseForm.date,
            date_display: genDateDisplay(courseForm.date),
            time: timeStr,
            location: courseForm.location,
            address: courseForm.address,
            is_active: courseForm.is_active,
            sort_order: Number(courseForm.sort_order),
            reward_exp: parseInt(courseForm.reward_exp) || 0,
            reward_coins: parseInt(courseForm.reward_coins) || 0,
        });
        await logAdminAction(courseForm.id ? 'course_update' : 'course_create', 'admin', courseForm.id, courseForm.name, { date: courseForm.date, time: courseForm.startTime && courseForm.endTime ? `${courseForm.startTime}–${courseForm.endTime}` : courseForm.startTime, location: courseForm.location });
        setCourseSubmitting(false);
        setCourseForm(emptyCourseForm);
        setEditingCourseId(null);
        setShowCourseModal(false);
    };

    const handleEditCourse = (c: Course) => {
        const [startTime = '', endTime = ''] = c.time.split('–');
        setCourseForm({ id: c.id, name: c.name, date: c.date, startTime: startTime.trim(), endTime: endTime.trim(), location: c.location, address: c.address ?? '', is_active: c.is_active, sort_order: c.sort_order, reward_exp: String(c.reward_exp ?? 0), reward_coins: String(c.reward_coins ?? 0) });
        setEditingCourseId(c.id);
        setShowCourseModal(true);
    };

    const handleImportSubmit = async (e: { preventDefault: () => void }) => {
        e.preventDefault();
        if (!csvInput.trim()) return;
        setIsImporting(true);
        await onImportRoster(csvInput);
        setIsImporting(false);
        setCsvInput("");
        setShowRosterPreview(false);
    };

    const parseBoolLocal = (s: string) => ['true', '1', 'y', 'yes'].includes(String(s).toLowerCase().trim());

    const handlePreviewRoster = async () => {
        if (!csvInput.trim()) return;
        setRosterCheckLoading(true);
        const lines = csvInput.split('\n').map(l => l.trim()).filter(Boolean);
        const rows: ParsedRosterRow[] = [];
        const phonesSeen = new Map<string, number>(); // userId → first occurrence index

        for (const line of lines) {
            const cols = line.split(',').map(c => c.trim());
            const rawPhone = cols[0]?.replace(/\D/g, '') ?? '';
            // 格式驗證：10碼首位為0，或 9碼首位為9
            const isValidPhone = /^0\d{9}$/.test(rawPhone) || /^9\d{8}$/.test(rawPhone);
            const userId = rawPhone.replace(/^0+/, '');

            // 跳過表頭行
            if (!rawPhone || rawPhone === '電話' || cols[0]?.includes('電話')) continue;

            const phoneError = !isValidPhone
                ? (rawPhone ? `格式錯誤（${rawPhone.length} 碼）` : '電話欄位空白')
                : null;

            const isDupInBatch = !phoneError && phonesSeen.has(userId);
            if (!phoneError) {
                if (!phonesSeen.has(userId)) phonesSeen.set(userId, rows.length);
                else {
                    // 標記先前那筆也重複
                    const prevIdx = phonesSeen.get(userId)!;
                    rows[prevIdx].isDupInBatch = true;
                }
            }

            const isCommandant = parseBoolLocal(cols[4] || '');
            rows.push({
                rawPhone: cols[0] ?? '',
                userId,
                name: cols[1] ?? '',
                birthday: cols[2] ?? '',
                bigTeam: cols[3] ?? '',
                isCommandant,
                littleTeam: isCommandant ? '' : (cols[5] ?? ''),
                isCaptain: parseBoolLocal(cols[6] || ''),
                phoneError,
                isDupInBatch,
                isDupInDb: false,
            });
        }

        // 查詢 DB 重複
        const validIds = rows.filter(r => !r.phoneError).map(r => r.userId);
        try {
            const existingIds = await checkExistingRosterPhones(validIds);
            const existingSet = new Set(existingIds);
            for (const r of rows) {
                if (!r.phoneError && existingSet.has(r.userId)) r.isDupInDb = true;
            }
        } catch { /* 查詢失敗不阻斷預覽 */ }

        setRosterPreviewRows(rows);
        setRosterCheckLoading(false);
        setShowRosterPreview(true);
    };

    const handleW4Review = async (appId: string, approve: boolean) => {
        setReviewingW4Id(appId);
        await onFinalReviewW4(appId, approve, w4Notes[appId] || '');
        await logAdminAction(approve ? 'w4_final_approve' : 'w4_final_reject', 'admin', appId, undefined, { notes: w4Notes[appId] });
        setReviewingW4Id(null);
        setW4Notes(prev => { const n = { ...prev }; delete n[appId]; return n; });
    };

    const [adminModule, setAdminModule] = React.useState<'personnel' | 'course' | 'quest' | 'monopoly' | 'params' | 'gallery' | 'dashboard' | 'logs' | 'review' | null>('dashboard');

    // 切換到審核中心時自動重新載入
    React.useEffect(() => { if (adminModule === 'review') refreshPtReviews(); }, [adminModule]); // eslint-disable-line react-hooks/exhaustive-deps

    // 儀表板統計
    type DashStats = { total: number; active: number; fallen: number; fallenUsers: { name: string; teamName: string | null; squadName: string | null }[] };
    const [dashStats, setDashStats] = React.useState<DashStats | null>(null);
    const [dashLoading, setDashLoading] = React.useState(false);
    const [showFallenModal, setShowFallenModal] = React.useState(false);

    const loadDashStats = React.useCallback(async () => {
        setDashLoading(true);
        const { getDashboardStats } = await import('@/app/actions/admin');
        const res = await getDashboardStats();
        if (res.success) setDashStats({ total: res.total, active: res.active, fallen: res.fallen, fallenUsers: res.fallenUsers });
        setDashLoading(false);
    }, []);

    React.useEffect(() => {
        if (adminModule !== 'dashboard') return;
        loadDashStats();
    }, [adminModule, loadDashStats]);

    const [trashedLogIds, setTrashedLogIds] = React.useState<Set<string>>(new Set());
    const [showTrash, setShowTrash] = React.useState(false);
    const [freshLogs, setFreshLogs] = React.useState<AdminLog[]>(adminLogs);
    const [loadingLogs, setLoadingLogs] = React.useState(false);

    const refreshLogs = React.useCallback(async () => {
        setLoadingLogs(true);
        const { getAdminActivityLog } = await import('@/app/actions/w4');
        const res = await getAdminActivityLog(200);
        if (res.success) setFreshLogs(res.logs as AdminLog[]);
        setLoadingLogs(false);
    }, []);

    React.useEffect(() => {
        if (adminModule === 'logs') refreshLogs();
    }, [adminModule, refreshLogs]);

    if (!adminAuth) {
        return (
            <div className="min-h-screen bg-slate-950 text-slate-200 p-8 flex flex-col justify-center items-center animate-in fade-in">
                <div className="max-w-sm w-full space-y-8 text-center mx-auto">
                    <div className="w-20 h-20 bg-slate-800 rounded-3xl mx-auto flex items-center justify-center border border-slate-700 text-orange-500"><Lock size={40} /></div>
                    <h1 className="text-3xl font-black text-white text-center mx-auto">大會中樞驗證</h1>
                    <form onSubmit={onAuth} className="space-y-6">
                        <input name="password" type="password" required className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl p-5 text-white text-center text-xl outline-none focus:border-orange-500 font-bold" placeholder="密令" autoFocus />
                        <div className="flex gap-4">
                            <button type="button" onClick={onClose} className="flex-1 py-4 bg-slate-800 text-slate-400 font-bold rounded-2xl">取消</button>
                            <button className="flex-2 py-4 bg-orange-600 text-white font-black rounded-2xl shadow-lg active:scale-95 transition-all">驗證登入</button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    const NAV_ITEMS = [
        { key: null as null,             label: '首頁',    icon: <BarChart3 size={17} />, accent: 'slate' },
        { key: 'dashboard' as const,     label: '儀表板',   icon: <BarChart3 size={17} />, accent: 'sky' },
        { key: 'review' as const,        label: '審核中心', icon: <CheckCircle size={17} />, accent: 'pink' },
        { key: 'personnel' as const,     label: '人員管理', icon: <Users size={17} />,    accent: 'cyan' },
        { key: 'course' as const,        label: '課程管理', icon: <BookOpen size={17} />, accent: 'amber' },
        { key: 'quest' as const,         label: '任務管理', icon: <Settings size={17} />, accent: 'orange' },
        { key: 'monopoly' as const,      label: '開運大富翁', icon: <Dices size={17} />,  accent: 'emerald' },
        { key: 'params' as const,        label: '參數管理', icon: <Save size={17} />,     accent: 'violet' },
        { key: 'gallery' as const,       label: '圖片庫',   icon: <ImageIcon size={17} />, accent: 'teal' },
        { key: 'logs' as const,          label: 'Log 紀錄', icon: <BarChart3 size={17} />, accent: 'rose' },
    ] as const;

    const accentClass: Record<string, string> = {
        slate:  'bg-slate-800 text-white border-slate-600',
        cyan:   'bg-cyan-950/70 text-cyan-300 border-cyan-700/50',
        amber:  'bg-amber-950/70 text-amber-300 border-amber-700/50',
        orange:  'bg-orange-950/70 text-orange-300 border-orange-700/50',
        emerald: 'bg-emerald-950/70 text-emerald-300 border-emerald-700/50',
        violet:  'bg-violet-950/70 text-violet-300 border-violet-700/50',
        teal:   'bg-teal-950/70 text-teal-300 border-teal-700/50',
        sky:    'bg-sky-950/70 text-sky-300 border-sky-700/50',
        rose:   'bg-rose-950/70 text-rose-300 border-rose-700/50',
        pink:   'bg-pink-950/70 text-pink-300 border-pink-700/50',
    };
    const accentDot: Record<string, string> = {
        slate: 'bg-slate-400', cyan: 'bg-cyan-400', amber: 'bg-amber-400', orange: 'bg-orange-400', emerald: 'bg-emerald-400', violet: 'bg-violet-400', teal: 'bg-teal-400', sky: 'bg-sky-400', rose: 'bg-rose-400', pink: 'bg-pink-400',
    };
    const reviewPendingCount = squadApprovedW4Apps.length;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 flex animate-in fade-in">

            {/* ══ 左側導覽列（桌機）══ */}
            <aside className="hidden md:flex flex-col w-48 shrink-0 bg-slate-900 border-r border-white/5 sticky top-0 h-screen">
                {/* Logo */}
                <div className="flex items-center gap-2.5 px-4 py-5 border-b border-white/5">
                    <div className="p-2 bg-orange-600 rounded-xl text-white shadow-md shrink-0"><Settings size={16} /></div>
                    <div className="leading-tight">
                        <p className="text-xs font-black text-white">大會管理後台</p>
                        <p className="text-[10px] text-slate-600">Admin Dashboard</p>
                    </div>
                </div>
                {/* Nav */}
                <nav className="flex flex-col gap-1 p-3 flex-1">
                    {NAV_ITEMS.map(item => {
                        const isActive = adminModule === item.key;
                        const badge = item.key === 'review' && reviewPendingCount > 0 ? reviewPendingCount : 0;
                        return (
                            <button key={String(item.key)} onClick={() => setAdminModule(item.key)}
                                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold border transition-all text-left w-full
                                    ${isActive
                                        ? accentClass[item.accent] + ' border'
                                        : 'text-slate-500 border-transparent hover:text-slate-200 hover:bg-white/5'}`}>
                                {isActive && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${accentDot[item.accent]}`} />}
                                <span className={isActive ? '' : 'opacity-60'}>{item.icon}</span>
                                <span className="flex-1">{item.label}</span>
                                {badge > 0 && <span className="ml-auto min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-black rounded-full px-1">{badge}</span>}
                            </button>
                        );
                    })}
                </nav>
                {/* Close */}
                <div className="p-3 border-t border-white/5">
                    <button onClick={onClose}
                        className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-slate-600 hover:text-red-400 text-sm font-bold transition-colors hover:bg-red-500/5">
                        <X size={15} /> 關閉後台
                    </button>
                </div>
            </aside>

            {/* ══ 主內容區 ══ */}
            <div className="flex-1 min-w-0 flex flex-col">

                {/* 手機頂部橫向 tab */}
                <div className="md:hidden sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-white/5 flex items-center gap-2 px-3 py-2.5 overflow-x-auto">
                    {NAV_ITEMS.map(item => {
                        const isActive = adminModule === item.key;
                        const badge = item.key === 'review' && reviewPendingCount > 0 ? reviewPendingCount : 0;
                        return (
                            <button key={String(item.key)} onClick={() => setAdminModule(item.key)}
                                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap border shrink-0 transition-all
                                    ${isActive ? accentClass[item.accent] + ' border' : 'text-slate-500 border-transparent bg-slate-800'}`}>
                                {item.icon}{item.label}
                                {badge > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] flex items-center justify-center bg-red-500 text-white text-[9px] font-black rounded-full px-0.5">{badge}</span>}
                            </button>
                        );
                    })}
                    <button onClick={onClose} className="ml-auto shrink-0 p-1.5 rounded-xl text-slate-600 hover:text-red-400 transition-colors">
                        <X size={16} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                <div className="max-w-5xl mx-auto space-y-10 pb-20 p-6 md:p-8">

                {/* ── 頁頭 ── */}
                <header className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-orange-600 rounded-2xl text-white shadow-lg md:hidden"><Settings size={20} /></div>
                        <div>
                            <h1 className="text-xl md:text-2xl font-black text-white">
                                {adminModule === null ? '首頁' : adminModule === 'dashboard' ? '儀表板' : adminModule === 'review' ? '審核中心' : adminModule === 'personnel' ? '人員管理' : adminModule === 'course' ? '課程管理' : adminModule === 'quest' ? '任務管理' : adminModule === 'monopoly' ? '開運大富翁' : adminModule === 'params' ? '參數管理' : adminModule === 'gallery' ? '圖片庫' : 'Log 紀錄'}
                            </h1>
                            <p className="text-[10px] text-slate-600">大會管理後台</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="md:hidden p-3 bg-slate-900 rounded-2xl text-slate-500 border border-slate-800 hover:text-red-400"><X size={18} /></button>
                </header>

                {/* ══ 首頁：模組選單 ══ */}
                {adminModule === null && (<>

                    {/* 模組導航卡片 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
                        <button onClick={() => setAdminModule('personnel')}
                            className="text-left bg-slate-900 border-2 border-cyan-500/30 hover:border-cyan-400/60 p-6 rounded-4xl shadow-xl transition-all hover:bg-slate-800 group">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-cyan-600/20 rounded-2xl text-cyan-400 group-hover:bg-cyan-600/30 transition-colors"><Users size={22} /></div>
                                <h2 className="text-lg font-black text-white">人員管理</h2>
                            </div>
                            <ul className="text-xs text-slate-400 space-y-1.5 font-bold">
                                <li>・戰隊名冊管理</li>
                                <li>・大小隊分組管理</li>
                                <li>・參與人員名單</li>
                            </ul>
                        </button>
                        <button onClick={() => setAdminModule('course')}
                            className="text-left bg-slate-900 border-2 border-amber-500/30 hover:border-amber-400/60 p-6 rounded-4xl shadow-xl transition-all hover:bg-slate-800 group">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-amber-600/20 rounded-2xl text-amber-400 group-hover:bg-amber-600/30 transition-colors"><BookOpen size={22} /></div>
                                <h2 className="text-lg font-black text-white">課程管理</h2>
                            </div>
                            <ul className="text-xs text-slate-400 space-y-1.5 font-bold">
                                <li>・課程新增 / 編輯</li>
                                <li>・報名名單查詢</li>
                                <li>・志工掃碼授權</li>
                            </ul>
                        </button>
                        <button onClick={() => setAdminModule('quest')}
                            className="text-left bg-slate-900 border-2 border-orange-500/30 hover:border-orange-400/60 p-6 rounded-4xl shadow-xl transition-all hover:bg-slate-800 group">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-orange-600/20 rounded-2xl text-orange-400 group-hover:bg-orange-600/30 transition-colors"><BarChart3 size={22} /></div>
                                <h2 className="text-lg font-black text-white">任務管理</h2>
                            </div>
                            <ul className="text-xs text-slate-400 space-y-1.5 font-bold">
                                <li>・臨時加分任務管理</li>
                                <li>・全域修行設定</li>
                                <li>・動態難度系統 (DDA)</li>
                            </ul>
                        </button>
                        <button onClick={() => setAdminModule('params')}
                            className="text-left bg-slate-900 border-2 border-violet-500/30 hover:border-violet-400/60 p-6 rounded-4xl shadow-xl transition-all hover:bg-slate-800 group">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-violet-600/20 rounded-2xl text-violet-400 group-hover:bg-violet-600/30 transition-colors"><Save size={22} /></div>
                                <h2 className="text-lg font-black text-white">參數管理</h2>
                            </div>
                            <ul className="text-xs text-slate-400 space-y-1.5 font-bold">
                                <li>・定課管理</li>
                                <li>・道具管理</li>
                            </ul>
                        </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <button onClick={() => setAdminModule('dashboard')}
                            className="text-left bg-slate-900 border-2 border-sky-500/30 hover:border-sky-400/60 p-6 rounded-4xl shadow-xl transition-all hover:bg-slate-800 group">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-sky-600/20 rounded-2xl text-sky-400 group-hover:bg-sky-600/30 transition-colors"><BarChart3 size={22} /></div>
                                <h2 className="text-lg font-black text-white">儀表板</h2>
                            </div>
                            <ul className="text-xs text-slate-400 space-y-1.5 font-bold">
                                <li>・功能尚未想好</li>
                            </ul>
                        </button>
                        <button onClick={() => setAdminModule('logs')}
                            className="text-left bg-slate-900 border-2 border-rose-500/30 hover:border-rose-400/60 p-6 rounded-4xl shadow-xl transition-all hover:bg-slate-800 group">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-rose-600/20 rounded-2xl text-rose-400 group-hover:bg-rose-600/30 transition-colors"><BarChart3 size={22} /></div>
                                <h2 className="text-lg font-black text-white">Log 紀錄</h2>
                            </div>
                            <ul className="text-xs text-slate-400 space-y-1.5 font-bold">
                                <li>・逐筆後台操作記錄</li>
                                <li>・可刪除單筆記錄</li>
                            </ul>
                        </button>
                    </div>

                    {/* LINE 選單設定 */}
                    <LineRichMenuSection />

                </>)}

                {/* ══ 審核中心模組 ══ */}
                {adminModule === 'review' && (<>
                    <div className="space-y-8">
                        <div className="flex items-center gap-2 text-pink-400 font-black text-sm uppercase tracking-widest">
                            <CheckCircle size={16} /> 審核中心
                        </div>

                        {/* 傳愛分數終審 */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-2 text-pink-500 font-black text-sm uppercase tracking-widest">
                                ❤️ 傳愛分數終審（管理員）
                                {reviewPendingCount > 0 && <span className="text-[10px] font-black text-white bg-red-500 px-2 py-0.5 rounded-full">{reviewPendingCount} 待審</span>}
                            </div>

                            {/* W4 參數管理 */}
                            <W4ConfigPanel systemSettings={systemSettings} updateGlobalSetting={updateGlobalSetting} />

                            <div className="bg-slate-900 border-2 border-pink-500/20 p-8 rounded-4xl shadow-xl space-y-4">
                                {squadApprovedW4Apps.length === 0 ? (
                                    <p className="text-sm text-slate-500 text-center py-4">目前無待審核申請</p>
                                ) : (
                                    squadApprovedW4Apps.map(app => (
                                        <div key={app.id} className="bg-slate-800 rounded-2xl p-5 space-y-3">
                                            <div className="flex justify-between items-start flex-wrap gap-2">
                                                <div>
                                                    <p className="font-black text-white">{app.user_name}</p>
                                                    <p className="text-xs text-slate-400">{app.squad_name} · 訪談：{app.interview_target} · {app.interview_date}</p>
                                                    {app.squad_review_notes && <p className="text-xs text-indigo-400 mt-1">小隊長備註：{app.squad_review_notes}</p>}
                                                </div>
                                                <span className="text-[10px] font-black text-violet-400 bg-violet-400/10 px-2 py-1 rounded-lg">待管理員審核</span>
                                            </div>
                                            {app.description && <p className="text-xs text-slate-400 italic">{app.description}</p>}
                                            <textarea placeholder="終審備註（選填）" value={w4Notes[app.id] || ''}
                                                onChange={e => setW4Notes(prev => ({ ...prev, [app.id]: e.target.value }))}
                                                rows={2} className="w-full bg-slate-700 border border-slate-600 rounded-xl p-3 text-white text-xs outline-none focus:border-pink-500 resize-none" />
                                            <div className="flex gap-3">
                                                <button disabled={reviewingW4Id === app.id} onClick={() => handleW4Review(app.id, false)}
                                                    className="flex-1 py-2 bg-red-600/20 text-red-400 font-black rounded-xl text-sm border border-red-600/30 active:scale-95 transition-all disabled:opacity-50">❌ 駁回</button>
                                                <button disabled={reviewingW4Id === app.id} onClick={() => handleW4Review(app.id, true)}
                                                    className="flex-2 py-2 bg-emerald-600 text-white font-black rounded-xl text-sm shadow-lg active:scale-95 transition-all disabled:opacity-50">✅ 核准入帳</button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>

                        {/* 親證故事存檔 */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-2 text-orange-500 font-black text-sm uppercase tracking-widest">
                                <BarChart3 size={16} /> 親證故事存檔（{testimonies.length} 筆）
                            </div>
                            <div className="bg-slate-900 border-2 border-slate-800 rounded-4xl overflow-hidden shadow-xl max-h-[500px] overflow-y-auto divide-y divide-slate-800">
                                {testimonies.length === 0 ? (
                                    <p className="text-sm text-slate-500 text-center py-8">尚無親證故事記錄</p>
                                ) : testimonies.map(t => (
                                    <div key={t.id} className="p-4 hover:bg-white/5 transition-colors space-y-1">
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-black text-white">
                                                    {t.parsed_name ?? t.display_name ?? '未知'}
                                                    {t.parsed_category && <span className="ml-2 text-[10px] font-normal bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-lg">{t.parsed_category}</span>}
                                                </p>
                                                <p className="text-xs text-slate-400 mt-1 leading-relaxed line-clamp-3">{t.content}</p>
                                            </div>
                                            <div className="text-right shrink-0 text-[10px] text-slate-500 space-y-1">
                                                <p>{t.parsed_date ?? '日期未填'}</p>
                                                <p>{new Date(t.created_at).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* 巔峰試煉審核 */}
                        <section className="space-y-4">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-2 text-indigo-400 font-black text-sm uppercase tracking-widest">
                                    🏆 巔峰試煉審核
                                    {ptReviews.filter(r => r.status === 'pending').length > 0 && (
                                        <span className="text-[10px] font-black text-white bg-indigo-500 px-2 py-0.5 rounded-full">
                                            {ptReviews.filter(r => r.status === 'pending').length} 待審
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <button
                                        onClick={() => refreshPtReviews()}
                                        disabled={ptRecalculating || ptBatchApproving || ptBatchRejecting}
                                        className="px-3 py-1.5 bg-slate-700/60 border border-slate-600/40 hover:bg-slate-700 text-slate-400 text-xs font-black rounded-xl active:scale-95 transition-all disabled:opacity-50"
                                    >
                                        ↻ 重整
                                    </button>
                                    <button
                                        onClick={handlePtRecalcAll}
                                        disabled={ptRecalculating || ptBatchApproving || ptBatchRejecting}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-amber-600/20 border border-amber-500/30 hover:bg-amber-600/30 text-amber-400 text-xs font-black rounded-xl active:scale-95 transition-all disabled:opacity-50"
                                    >
                                        {ptRecalculating ? '計算中…' : '🔄 重新計算修為'}
                                    </button>
                                    <button
                                        onClick={handlePtBatchReject}
                                        disabled={ptBatchRejecting || ptBatchApproving || ptRecalculating}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-red-600/20 border border-red-500/30 hover:bg-red-600/30 text-red-400 text-xs font-black rounded-xl active:scale-95 transition-all disabled:opacity-50"
                                    >
                                        {ptBatchRejecting ? '處理中…' : '❌ 批次駁回'}
                                    </button>
                                    <button
                                        onClick={handlePtBatchApprove}
                                        disabled={ptBatchApproving || ptBatchRejecting || ptRecalculating}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600/20 border border-emerald-500/30 hover:bg-emerald-600/30 text-emerald-400 text-xs font-black rounded-xl active:scale-95 transition-all disabled:opacity-50"
                                    >
                                        {ptBatchApproving ? '處理中…' : '✅ 批次核准'}
                                    </button>
                                </div>
                            </div>
                            <div className="bg-slate-900 border-2 border-indigo-500/20 p-6 rounded-4xl shadow-xl space-y-4">
                                {ptReviews.length === 0 ? (
                                    <p className="text-sm text-slate-500 text-center py-4">目前無審核申請</p>
                                ) : ptReviews.map(rv => (
                                    <div key={rv.id} className="bg-slate-800 rounded-2xl p-5 space-y-4">
                                        {/* Header */}
                                        <div className="flex items-start justify-between gap-3 flex-wrap">
                                            <div className="flex items-start gap-3">
                                                {rv.status === 'pending' && (
                                                    <input
                                                        type="checkbox"
                                                        checked={ptSelectedIds.has(rv.id)}
                                                        onChange={() => togglePtSelect(rv.id)}
                                                        className="mt-1 w-4 h-4 accent-indigo-500 cursor-pointer shrink-0"
                                                    />
                                                )}
                                                <div>
                                                    <p className="text-white font-black text-sm">{rv.trial_title}</p>
                                                    <p className="text-xs text-indigo-400 mt-0.5">{rv.battalion_name}</p>
                                                    <p className="text-[10px] text-slate-500 mt-0.5">{new Date(rv.created_at).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                                                </div>
                                            </div>
                                            <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${rv.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : rv.status === 'rejected' ? 'bg-red-500/20 text-red-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
                                                {rv.status === 'approved' ? '✅ 已核准' : rv.status === 'rejected' ? '❌ 已駁回' : '⏳ 待審核'}
                                            </span>
                                        </div>

                                        {/* 修為統計 */}
                                        <div className="grid grid-cols-3 gap-2 text-center">
                                            <div className="bg-purple-500/10 rounded-xl p-2">
                                                <p className="text-[10px] text-slate-400">本隊參與</p>
                                                <p className="text-white font-black">{rv.own_participants} 人</p>
                                                <p className="text-purple-400 text-[10px]">+{(Math.min(rv.own_participants, 21) * 1500).toLocaleString()}</p>
                                            </div>
                                            <div className="bg-amber-500/10 rounded-xl p-2">
                                                <p className="text-[10px] text-slate-400">跨隊參與</p>
                                                <p className="text-white font-black">{rv.cross_participants} 人</p>
                                                <p className="text-amber-400 text-[10px]">+{(Math.min(rv.cross_participants, 21) * 1050).toLocaleString()}</p>
                                            </div>
                                            <div className="bg-indigo-500/10 rounded-xl p-2">
                                                <p className="text-[10px] text-slate-400">每人修為</p>
                                                <p className="text-indigo-300 font-black">{rv.reward_per_person.toLocaleString()}</p>
                                                <p className="text-slate-500 text-[10px]">× {rv.total_members} 人</p>
                                            </div>
                                        </div>

                                        {/* 參與名單 */}
                                        <div>
                                            <button
                                                onClick={() => handleLoadParticipants(rv.id, rv.trial_id, rv.battalion_name)}
                                                disabled={ptLoadingParticipants === rv.id}
                                                className="text-xs text-indigo-400 hover:text-indigo-300 font-black transition-colors disabled:opacity-50"
                                            >
                                                {ptLoadingParticipants === rv.id ? '載入中…' : ptParticipants[rv.id] ? '▲ 收起名單' : '▼ 查看參與名單'}
                                            </button>
                                            {ptParticipants[rv.id] && (
                                                <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                                                    {ptParticipants[rv.id].length === 0 ? (
                                                        <p className="text-xs text-slate-500 text-center py-2">無報名記錄</p>
                                                    ) : ptParticipants[rv.id].map(r => (
                                                        <div key={r.id} className="flex items-center justify-between bg-slate-700/50 rounded-xl px-3 py-1.5">
                                                            <div>
                                                                <span className="text-white text-xs font-black">{r.user_name}</span>
                                                                <span className="text-slate-400 text-[10px] ml-1.5">{r.battalion_name === rv.battalion_name ? '本隊' : `跨隊 · ${r.battalion_name}`}{r.squad_name ? ` · ${r.squad_name}` : ''}</span>
                                                            </div>
                                                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-lg ${r.attended ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-600/60 text-slate-400'}`}>
                                                                {r.attended ? '✅ 出席' : '未出席'}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* 大合照 */}
                                        {rv.photo_data && (
                                            <div>
                                                <button onClick={() => setPtPhotoOpen(ptPhotoOpen === rv.id ? null : rv.id)}
                                                    className="text-xs text-indigo-400 hover:text-indigo-300 font-black transition-colors">
                                                    {ptPhotoOpen === rv.id ? '▲ 收起照片' : '▼ 查看大合照'}
                                                </button>
                                                {ptPhotoOpen === rv.id && (
                                                    <img src={rv.photo_data} alt="大合照" className="mt-2 w-full rounded-2xl object-cover max-h-72" />
                                                )}
                                            </div>
                                        )}

                                        {/* 影片連結 */}
                                        <div className="flex items-center gap-2 bg-slate-700/40 rounded-xl px-3 py-2">
                                            <span className="text-xs text-slate-400 shrink-0">🎬 影片：</span>
                                            {rv.video_url ? (
                                                <a href={rv.video_url} target="_blank" rel="noopener noreferrer"
                                                    className="text-xs text-indigo-400 hover:text-indigo-300 underline truncate transition-colors">
                                                    {rv.video_url}
                                                </a>
                                            ) : (
                                                <span className="text-xs text-slate-500">未提供影片連結</span>
                                            )}
                                        </div>

                                        {/* 駁回備註 */}
                                        {rv.status === 'rejected' && rv.review_notes && (
                                            <p className="text-xs text-slate-400 bg-red-500/10 rounded-xl px-3 py-2">駁回原因：{rv.review_notes}</p>
                                        )}

                                        {/* 審核操作 */}
                                        {rv.status === 'pending' && (
                                            <div className="space-y-2">
                                                <textarea
                                                    placeholder="駁回原因（選填，核准可留空）"
                                                    value={ptReviewNotes[rv.id] || ''}
                                                    onChange={e => setPtReviewNotes(prev => ({ ...prev, [rv.id]: e.target.value }))}
                                                    rows={2}
                                                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-indigo-500 resize-none transition-colors"
                                                />
                                                <div className="flex gap-3">
                                                    <button
                                                        disabled={ptReviewingId === rv.id}
                                                        onClick={() => handlePtReject(rv.id)}
                                                        className="flex-1 py-2.5 rounded-xl font-black text-sm text-red-400 bg-red-600/10 border border-red-600/30 active:scale-95 transition-all disabled:opacity-50"
                                                    >
                                                        ❌ 駁回
                                                    </button>
                                                    <button
                                                        disabled={ptReviewingId === rv.id}
                                                        onClick={() => handlePtApprove(rv.id)}
                                                        className="flex-[2] py-2.5 rounded-xl font-black text-sm text-white bg-emerald-600 shadow-lg shadow-emerald-900/30 active:scale-95 transition-all disabled:opacity-50"
                                                    >
                                                        {ptReviewingId === rv.id ? '處理中…' : '✅ 核准並發放修為'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                </>)}

                {/* ══ 儀表板模組 ══ */}
                {adminModule === 'dashboard' && (<>
                    <div className="space-y-8">
                        {/* 頂部工具列 */}
                        <div className="flex items-center justify-between flex-wrap gap-3">
                            <div className="flex items-center gap-2 text-sky-400 font-black text-sm uppercase tracking-widest">
                                <BarChart3 size={16} /> 儀表板
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => {
                                    setDashStats(null);
                                    loadDashStats();
                                }} disabled={dashLoading}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200 transition-all disabled:opacity-50">
                                    {dashLoading ? '載入中…' : '↻ 重新整理'}
                                </button>
                                <button onClick={() => setAdminModule(null)}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-black rounded-xl transition-all">
                                    ← 返回上一步
                                </button>
                            </div>
                        </div>

                        {/* 第一橫列：三個統計模塊 */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {/* 總參與人數 */}
                            <div className="bg-gradient-to-br from-sky-950/60 to-slate-900 border-2 border-sky-700/30 rounded-3xl p-6 flex flex-col items-center justify-center gap-2 text-center shadow-xl min-h-[140px]">
                                <div className="w-10 h-10 bg-sky-800/40 rounded-2xl flex items-center justify-center text-sky-400 mb-1">
                                    <Users size={20} />
                                </div>
                                <p className="text-[11px] font-black text-sky-400 uppercase tracking-widest">總參與人數</p>
                                {dashLoading ? (
                                    <div className="w-12 h-8 bg-slate-800 rounded-xl animate-pulse" />
                                ) : (
                                    <p className="text-4xl font-black text-white">{dashStats?.total ?? '—'}</p>
                                )}
                                <p className="text-[10px] text-slate-500">全體修行者</p>
                            </div>

                            {/* 活躍人數 */}
                            <div className="bg-gradient-to-br from-emerald-950/60 to-slate-900 border-2 border-emerald-700/30 rounded-3xl p-6 flex flex-col items-center justify-center gap-2 text-center shadow-xl min-h-[140px]">
                                <div className="w-10 h-10 bg-emerald-800/40 rounded-2xl flex items-center justify-center text-emerald-400 mb-1">
                                    <Zap size={20} />
                                </div>
                                <p className="text-[11px] font-black text-emerald-400 uppercase tracking-widest">活躍人數</p>
                                {dashLoading ? (
                                    <div className="w-12 h-8 bg-slate-800 rounded-xl animate-pulse" />
                                ) : (
                                    <p className="text-4xl font-black text-white">{dashStats?.active ?? '—'}</p>
                                )}
                                <p className="text-[10px] text-slate-500">近 2 日有回報</p>
                            </div>

                            {/* 沉寂人數 */}
                            <div className="bg-gradient-to-br from-red-950/60 to-slate-900 border-2 border-red-800/30 rounded-3xl p-6 flex flex-col items-center justify-center gap-2 text-center shadow-xl min-h-[140px]">
                                <div className="w-10 h-10 bg-red-900/40 rounded-2xl flex items-center justify-center text-red-400 mb-1">
                                    <Shield size={20} />
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <p className="text-[11px] font-black text-red-400 uppercase tracking-widest">沉寂人數</p>
                                    <button
                                        onClick={() => { if (dashStats && dashStats.fallen > 0) setShowFallenModal(true); }}
                                        disabled={dashLoading || !dashStats || dashStats.fallen === 0}
                                        className="p-1 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-30 disabled:cursor-default"
                                        title="查看沉寂名單">
                                        <Search size={12} />
                                    </button>
                                </div>
                                {dashLoading ? (
                                    <div className="w-12 h-8 bg-slate-800 rounded-xl animate-pulse" />
                                ) : (
                                    <p className="text-4xl font-black text-white">{dashStats?.fallen ?? '—'}</p>
                                )}
                                <p className="text-[10px] text-slate-500">逾 3 日無動靜</p>
                            </div>
                        </div>
                    </div>

                    {/* ── 沉寂名單彈窗 ── */}
                    {showFallenModal && dashStats && (
                        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:p-6 bg-black/80 backdrop-blur-sm"
                            onClick={() => setShowFallenModal(false)}>
                            <div className="bg-slate-900 border border-slate-700 rounded-t-4xl sm:rounded-4xl w-full sm:max-w-lg shadow-2xl flex flex-col max-h-[80vh]"
                                onClick={e => e.stopPropagation()}>
                                {/* 標題列 */}
                                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 shrink-0">
                                    <div className="flex items-center gap-2">
                                        <Shield size={15} className="text-red-400" />
                                        <p className="font-black text-white text-sm">沉寂名單</p>
                                        <span className="text-[10px] font-black bg-red-500/20 text-red-400 px-2 py-0.5 rounded-lg">{dashStats.fallen} 人</span>
                                    </div>
                                    <button onClick={() => setShowFallenModal(false)}
                                        className="p-1.5 bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors">
                                        <X size={14} />
                                    </button>
                                </div>
                                {/* 表頭 */}
                                <div className="grid grid-cols-3 px-5 py-2 border-b border-slate-800 shrink-0">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">姓名</p>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">大隊</p>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">小隊</p>
                                </div>
                                {/* 名單 */}
                                <div className="overflow-y-auto divide-y divide-slate-800/60 flex-1">
                                    {dashStats.fallenUsers.map((u, i) => (
                                        <div key={i} className="grid grid-cols-3 px-5 py-3 hover:bg-white/5 transition-colors">
                                            <p className="text-sm font-bold text-white">{u.name}</p>
                                            <p className="text-sm text-slate-400">{u.teamName ?? '—'}</p>
                                            <p className="text-sm text-slate-400">{u.squadName ?? '—'}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── 修行者修為榜 ── */}
                    <div>
                        <RankTab leaderboard={leaderboard} />
                    </div>
                </>)}

                {/* ══ Log 紀錄模組 ══ */}
                {adminModule === 'logs' && (() => {
                    const visibleLogs = freshLogs.filter(l => !trashedLogIds.has(l.id));
                    const trashedLogs = freshLogs.filter(l => trashedLogIds.has(l.id));
                    const displayLogs = showTrash ? trashedLogs : visibleLogs;
                    return (
                    <div className="space-y-6">
                        {/* 頂部工具列 */}
                        <div className="flex items-center justify-between flex-wrap gap-3">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 text-rose-400 font-black text-sm uppercase tracking-widest">
                                    <BarChart3 size={16} />
                                    {showTrash ? `回收桶（${trashedLogs.length} 筆）` : `Log 紀錄（${visibleLogs.length} 筆）`}
                                </div>
                                <button onClick={() => setShowTrash(v => !v)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all border ${showTrash ? 'bg-rose-900/40 text-rose-300 border-rose-700/40' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'}`}>
                                    🗑 回收桶{trashedLogs.length > 0 && <span className="bg-rose-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">{trashedLogs.length}</span>}
                                </button>
                                <button onClick={refreshLogs} disabled={loadingLogs}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200 transition-all disabled:opacity-50">
                                    {loadingLogs ? '載入中…' : '↻ 重新整理'}
                                </button>
                            </div>
                            <button onClick={() => { setAdminModule(null); setShowTrash(false); }}
                                className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-black rounded-xl transition-all">
                                ← 返回上一步
                            </button>
                        </div>

                        {/* 日誌列表 */}
                        <div className="bg-slate-900 border-2 border-slate-800 rounded-4xl overflow-hidden shadow-xl divide-y divide-slate-800">
                            {displayLogs.length === 0 ? (
                                <p className="text-sm text-slate-500 text-center py-10">
                                    {showTrash ? '回收桶是空的' : '尚無操作記錄'}
                                </p>
                            ) : displayLogs.map(log => (
                                <div key={log.id} className={`flex items-start gap-3 p-4 hover:bg-white/5 transition-colors ${log.result === 'error' ? 'bg-red-950/20' : ''} ${showTrash ? 'opacity-60' : ''}`}>
                                    <div className="flex-1 min-w-0 space-y-0.5">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className={`text-xs font-black ${log.result === 'error' ? 'text-red-400' : 'text-slate-200'}`}>
                                                {ACTION_LABELS[log.action] || log.action}
                                            </p>
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${log.result === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                                {log.result === 'error' ? '失敗' : '成功'}
                                            </span>
                                        </div>
                                        {log.actor && <p className="text-[10px] text-slate-500">操作者：{log.actor}</p>}
                                        {log.target_name && <p className="text-[10px] text-slate-500">對象：{log.target_name}</p>}
                                        {log.details && Object.keys(log.details).length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {Object.entries(log.details).map(([k, v]) => (
                                                    <span key={k} className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-md">
                                                        {DETAIL_LABELS[k] ?? k}：{typeof v === 'boolean' ? (v ? '是' : '否') : String(v)}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        <p className="text-[10px] text-slate-700">{new Date(log.created_at).toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                    {showTrash ? (
                                        <button
                                            onClick={() => setTrashedLogIds(prev => { const next = new Set(prev); next.delete(log.id); return next; })}
                                            className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-black text-emerald-400 hover:bg-emerald-500/10 transition-all border border-emerald-700/30"
                                            title="復原此記錄">
                                            復原
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => setTrashedLogIds(prev => new Set(prev).add(log.id))}
                                            className="shrink-0 p-2 rounded-xl text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                                            title="移至回收桶">
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                    );
                })()}

                {/* ══ 人員管理模組 ══ */}
                {adminModule === 'personnel' && (<>

                    {/* 戰隊名冊管理 */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-2 text-orange-500 font-black text-sm uppercase tracking-widest"><Users size={16} /> 戰隊名冊管理</div>
                        <div className="bg-slate-900 border-2 border-slate-800 p-8 rounded-4xl space-y-6 shadow-xl">
                            <div className="space-y-3">
                                <p className="text-xs font-black text-slate-500 uppercase tracking-widest">登入模式</p>
                                <div className={`flex items-center justify-between p-4 rounded-2xl border-2 ${systemSettings.RegistrationMode === 'roster' ? 'border-indigo-500/50 bg-indigo-950/30' : 'border-emerald-500/50 bg-emerald-950/30'}`}>
                                    <div>
                                        <p className={`font-black text-sm ${systemSettings.RegistrationMode === 'roster' ? 'text-indigo-300' : 'text-emerald-300'}`}>
                                            {systemSettings.RegistrationMode === 'roster' ? '🔐 名單驗證模式' : '🌐 自由註冊模式'}
                                        </p>
                                        <p className="text-[10px] text-slate-500 mt-0.5">
                                            {systemSettings.RegistrationMode === 'roster' ? '僅限名冊內信箱登入，新生需由管理員預先匯入' : '任何人可自行填表註冊'}
                                        </p>
                                    </div>
                                    <button onClick={() => updateGlobalSetting('RegistrationMode', systemSettings.RegistrationMode === 'roster' ? 'open' : 'roster')}
                                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${systemSettings.RegistrationMode === 'roster' ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white'}`}>
                                        切換為{systemSettings.RegistrationMode === 'roster' ? '自由註冊' : '名單驗證'}
                                    </button>
                                </div>
                            </div>
                            <div className="border-t border-white/5 pt-4" />
                            <form onSubmit={handleImportSubmit} className="space-y-4 text-center">
                                <div className="flex items-start justify-between gap-4">
                                    <p className="text-xs text-slate-400 text-left">
                                        請貼上 CSV 格式資料（含表頭行將自動略過）<br />
                                        格式：<span className="text-orange-400 font-mono">電話, 姓名, 生日(YYYY-MM-DD), 大隊, 是否大隊長, 小隊, 是否小隊長</span><br />
                                        <span className="text-slate-500 text-[10px]">電話去除開頭 0 後作為 UserID；是否大小隊長支援 true/false、1/0、Y/N；大隊長小隊欄位可留空</span>
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const header = '電話,姓名,生日(YYYY-MM-DD),大隊,是否大隊長,小隊,是否小隊長';
                                            const example = [
                                                '0912340001,王小明,1960-03-15,第一大隊,N,第一小隊,N',
                                                '0912340002,李大華,1985-07-22,第一大隊,N,第一小隊,Y',
                                                '0912340003,張美玲,1970-11-08,第一大隊,Y,,N',
                                            ].join('\n');
                                            const blob = new Blob([header + '\n' + example], { type: 'text/csv;charset=utf-8;' });
                                            const url = URL.createObjectURL(blob);
                                            const a = document.createElement('a');
                                            a.href = url;
                                            a.download = '名冊匯入範本.csv';
                                            a.click();
                                            URL.revokeObjectURL(url);
                                        }}
                                        className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-black rounded-xl border border-slate-700 transition-colors"
                                    >
                                        <Download size={13} /> 下載範本
                                    </button>
                                </div>
                                {/* 上傳 CSV 檔案 */}
                                <label className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-slate-700 hover:border-orange-500/60 rounded-2xl text-slate-400 hover:text-orange-400 text-xs font-black cursor-pointer transition-colors bg-slate-950/50">
                                    <Upload size={14} /> 點擊上傳 CSV 檔案（會自動填入下方）
                                    <input type="file" accept=".csv,text/csv" className="hidden"
                                        onChange={e => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            const reader = new FileReader();
                                            reader.onload = ev => setCsvInput((ev.target?.result as string) ?? '');
                                            reader.readAsText(file, 'UTF-8');
                                            e.target.value = '';
                                        }} />
                                </label>
                                <textarea value={csvInput} onChange={(e) => setCsvInput(e.target.value)}
                                    placeholder={`ex:\n0912340001,王小明,1960-03-15,第一大隊,N,第一小隊,N\n0912340002,李大華,1985-07-22,第一大隊,N,第一小隊,Y\n0912340003,張美玲,1970-11-08,第一大隊,Y,,N`}
                                    className="w-full h-36 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-mono text-xs outline-none focus:border-orange-500 resize-none" />
                                <button
                                    type="button"
                                    disabled={rosterCheckLoading || !csvInput.trim()}
                                    onClick={handlePreviewRoster}
                                    className="w-full bg-orange-600 p-4 rounded-2xl text-white font-black shadow-lg hover:bg-orange-500 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    <Search size={15} /> {rosterCheckLoading ? '檢查中…' : '🔍 預覽並檢查錯誤'}
                                </button>
                            </form>
                        </div>
                    </section>

                    {/* 大小隊分組管理 */}
                    <section className="space-y-6">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2 text-cyan-400 font-black text-sm uppercase tracking-widest">
                                <Users size={16} /> 大小隊分組管理
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => { setAddBattalionOpen(v => !v); setAddSquadOpen(false); setAddBattalionId(''); }}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 text-xs font-black rounded-xl border border-amber-600/30 transition-colors"
                                >
                                    <Plus size={13} /> 新增大隊
                                </button>
                                <button
                                    onClick={() => { setAddSquadOpen(v => !v); setAddBattalionOpen(false); setAddSquadTeam(''); setAddSquadId(''); }}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 text-xs font-black rounded-xl border border-cyan-600/30 transition-colors"
                                >
                                    <Plus size={13} /> 新增小隊
                                </button>
                            </div>
                        </div>

                        {/* 新增大隊表單 */}
                        {addBattalionOpen && (
                            <div className="bg-slate-900 border-2 border-amber-500/30 rounded-2xl p-4 space-y-3">
                                <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">新增大隊</p>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-slate-500 font-black uppercase">大隊識別碼（必填）</label>
                                    <input
                                        value={addBattalionId}
                                        onChange={e => setAddBattalionId(e.target.value)}
                                        placeholder="ex: 第一大隊"
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-bold outline-none focus:border-amber-500"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleAddBattalion}
                                        disabled={!addBattalionId.trim()}
                                        className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-black rounded-xl disabled:opacity-40 transition-colors"
                                    >
                                        ✅ 新增
                                    </button>
                                    <button onClick={() => setAddBattalionOpen(false)}
                                        className="px-4 py-2 bg-slate-800 text-slate-400 text-xs font-bold rounded-xl hover:text-white transition-colors">
                                        取消
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* 新增小隊表單 */}
                        {addSquadOpen && (
                            <div className="bg-slate-900 border-2 border-cyan-500/30 rounded-2xl p-4 space-y-3">
                                <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">新增小隊</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-500 font-black uppercase">大隊（必填）</label>
                                        <input
                                            list="add-squad-team-options"
                                            value={addSquadTeam}
                                            onChange={e => setAddSquadTeam(e.target.value)}
                                            placeholder="ex: 第一大隊"
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-bold outline-none focus:border-cyan-500"
                                        />
                                        <datalist id="add-squad-team-options">
                                            {allTeamNames.map(t => <option key={t} value={t}>{formatTeamLabel(t)}</option>)}
                                        </datalist>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-500 font-black uppercase">小隊識別碼（必填）</label>
                                        <input
                                            value={addSquadId}
                                            onChange={e => setAddSquadId(e.target.value)}
                                            placeholder="ex: 第一小隊"
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-bold outline-none focus:border-cyan-500"
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleAddSquad}
                                        disabled={!addSquadTeam.trim() || !addSquadId.trim()}
                                        className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black rounded-xl disabled:opacity-40 transition-colors"
                                    >
                                        ✅ 新增
                                    </button>
                                    <button onClick={() => setAddSquadOpen(false)}
                                        className="px-4 py-2 bg-slate-800 text-slate-400 text-xs font-bold rounded-xl hover:text-white transition-colors">
                                        取消
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="bg-slate-900 border-2 border-cyan-500/20 rounded-4xl shadow-xl overflow-hidden">
                            {leaderboard.length === 0 ? (
                                <p className="text-sm text-slate-500 text-center py-8">尚無成員資料</p>
                            ) : (
                                <div className="divide-y divide-slate-800">
                                    {[...groupedByTeam.entries()].map(([teamId, squadMap]) => (
                                        <div key={teamId}>
                                            <div className="flex items-center">
                                                <button onClick={() => toggleTeam(teamId)}
                                                    className="flex-1 flex items-center justify-between px-6 py-4 hover:bg-white/5 transition-colors text-left">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[10px] font-black text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-lg">大隊</span>
                                                        <span className="font-black text-white">{formatTeamLabel(teamId)}</span>
                                                        <span className="text-xs text-slate-500">{[...squadMap.values()].flat().length} 人・{[...squadMap.keys()].filter(k => k !== COMMANDANT_KEY).length} 小隊</span>
                                                    </div>
                                                    <span className="text-slate-500">{squadExpandedTeams.has(teamId) ? '▲' : '▼'}</span>
                                                </button>
                                                <div className="flex items-center gap-1 mr-4">
                                                    <button onClick={() => { setSettingDisplayNameFor({ type: 'battalion', id: teamId }); setDisplayNameInput(battalionDisplayNames[teamId] ?? ''); }}
                                                        className="px-3 py-1.5 text-[10px] font-black text-slate-500 bg-slate-800 rounded-lg hover:text-cyan-400 transition-colors">
                                                        設定隊名
                                                    </button>
                                                    {[...squadMap.entries()].filter(([k]) => k !== COMMANDANT_KEY).flatMap(([, v]) => v).length === 0 && !squadMap.has(COMMANDANT_KEY) && definedBattalions.includes(teamId) && (
                                                        <button onClick={() => handleRemoveDefinedBattalion(teamId)}
                                                            className="p-1.5 text-slate-700 bg-slate-800 rounded-lg hover:text-red-400 hover:bg-red-900/20 transition-colors"
                                                            title="移除此空大隊">
                                                            <Trash2 size={11} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {settingDisplayNameFor?.type === 'battalion' && settingDisplayNameFor.id === teamId && (
                                                <div className="px-6 pb-4 flex gap-2 flex-wrap items-center bg-slate-950/40">
                                                    <span className="text-xs text-slate-500 font-black">{teamId}</span>
                                                    <span className="text-slate-600">→</span>
                                                    <input autoFocus value={displayNameInput} onChange={e => setDisplayNameInput(e.target.value)}
                                                        placeholder="自訂隊名（如：龍騎隊）"
                                                        className="flex-1 min-w-[160px] bg-slate-900 border border-cyan-500/50 rounded-xl px-3 py-2 text-white text-xs font-bold outline-none" />
                                                    <button onClick={saveDisplayName} disabled={displayNameSaving}
                                                        className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black rounded-xl disabled:opacity-50 transition-colors">
                                                        {displayNameSaving ? '儲存中…' : '確認'}
                                                    </button>
                                                    <button onClick={() => setSettingDisplayNameFor(null)}
                                                        className="px-3 py-2 bg-slate-800 text-slate-400 text-xs font-bold rounded-xl hover:text-white transition-colors">
                                                        取消
                                                    </button>
                                                </div>
                                            )}

                                            {squadExpandedTeams.has(teamId) && (
                                                <div className="divide-y divide-slate-800/50">
                                                    {/* 大隊長顯示在小隊列表之前 */}
                                                    {(squadMap.get(COMMANDANT_KEY) ?? []).map(p => (
                                                        <div key={p.UserID} className="flex items-center justify-between px-8 py-2.5 bg-amber-950/20">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-black bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">大隊長</span>
                                                                <span className="text-sm text-slate-200">{p.Name}</span>
                                                                <span className="text-[10px] text-slate-600">Lv.{p.Level}</span>
                                                            </div>
                                                            <button onClick={() => startEditMember(p)}
                                                                className="p-1.5 rounded-lg text-slate-600 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors">
                                                                <Pencil size={13} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    {[...squadMap.entries()].filter(([squadId]) => squadId !== COMMANDANT_KEY).map(([squadId, members]) => (
                                                        <div key={squadId} className="bg-slate-950/30">
                                                            <div className="flex items-center justify-between px-8 py-3">
                                                                <button onClick={() => toggleSquad(squadId)}
                                                                    className="flex items-center gap-3 text-left hover:text-white transition-colors flex-1">
                                                                    <span className="text-[10px] font-black text-slate-500 bg-slate-800 px-2 py-0.5 rounded-lg">小隊</span>
                                                                    <span className="font-bold text-slate-200">{formatSquadLabel(squadId)}</span>
                                                                    <span className="text-xs text-slate-600">{members.length} 人</span>
                                                                    <span className="text-slate-600">{squadExpandedSquads.has(squadId) ? '▲' : '▼'}</span>
                                                                </button>
                                                                <div className="flex items-center gap-1 ml-2">
                                                                    <button onClick={() => { setSettingDisplayNameFor({ type: 'squad', id: squadId }); setDisplayNameInput(squadDisplayNames[squadId] ?? ''); }}
                                                                        className="px-3 py-1 text-[10px] font-black text-slate-500 bg-slate-800 rounded-lg hover:text-cyan-400 transition-colors">
                                                                        設定隊名
                                                                    </button>
                                                                    {members.length === 0 && definedSquads.some(s => s.teamId === teamId && s.squadId === squadId) && (
                                                                        <button onClick={() => handleRemoveDefinedSquad(teamId, squadId)}
                                                                            className="p-1.5 text-slate-700 bg-slate-800 rounded-lg hover:text-red-400 hover:bg-red-900/20 transition-colors"
                                                                            title="移除此空小隊">
                                                                            <Trash2 size={11} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {settingDisplayNameFor?.type === 'squad' && settingDisplayNameFor.id === squadId && (
                                                                <div className="px-8 pb-4 flex gap-2 flex-wrap items-center">
                                                                    <span className="text-xs text-slate-500 font-black">{squadId}</span>
                                                                    <span className="text-slate-600">→</span>
                                                                    <input autoFocus value={displayNameInput} onChange={e => setDisplayNameInput(e.target.value)}
                                                                        placeholder="自訂隊名（如：鳳凰隊）"
                                                                        className="flex-1 min-w-[140px] bg-slate-900 border border-cyan-500/50 rounded-xl px-3 py-2 text-white text-xs font-bold outline-none" />
                                                                    <button onClick={saveDisplayName} disabled={displayNameSaving}
                                                                        className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black rounded-xl disabled:opacity-50 transition-colors">
                                                                        {displayNameSaving ? '儲存中…' : '確認'}
                                                                    </button>
                                                                    <button onClick={() => setSettingDisplayNameFor(null)}
                                                                        className="px-3 py-2 bg-slate-800 text-slate-400 text-xs font-bold rounded-xl hover:text-white transition-colors">
                                                                        取消
                                                                    </button>
                                                                </div>
                                                            )}

                                                            {squadExpandedSquads.has(squadId) && (
                                                                <div className="pb-3 px-8 space-y-1">
                                                                    {members.map(p => (
                                                                        <div key={p.UserID}>
                                                                            {editingMemberId === p.UserID ? (
                                                                                <div className="bg-slate-900 border border-cyan-500/30 rounded-2xl p-4 space-y-3">
                                                                                    <div className="flex items-center gap-2 mb-1">
                                                                                        <span className="font-black text-white">{p.Name}</span>
                                                                                        <span className="text-xs text-slate-500">調整分組</span>
                                                                                    </div>
                                                                                    <div className={`grid gap-2 ${memberEditForm.isCommandant ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
                                                                                        <div className="space-y-1">
                                                                                            <label className="text-[10px] text-slate-500 font-black uppercase">大隊（固定識別碼）</label>
                                                                                            <input list="team-id-options" value={memberEditForm.teamName}
                                                                                                onChange={e => setMemberEditForm(f => ({ ...f, teamName: e.target.value }))}
                                                                                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-bold outline-none focus:border-cyan-500" />
                                                                                            <datalist id="team-id-options">
                                                                                                {allTeamNames.map(t => <option key={t} value={t}>{formatTeamLabel(t)}</option>)}
                                                                                            </datalist>
                                                                                        </div>
                                                                                        {!memberEditForm.isCommandant && (
                                                                                            <div className="space-y-1">
                                                                                                <label className="text-[10px] text-slate-500 font-black uppercase">小隊（固定識別碼）</label>
                                                                                                <input list="squad-id-options" value={memberEditForm.squadName}
                                                                                                    onChange={e => setMemberEditForm(f => ({ ...f, squadName: e.target.value }))}
                                                                                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-bold outline-none focus:border-cyan-500" />
                                                                                                <datalist id="squad-id-options">
                                                                                                    {allSquadNames.map(s => <option key={s} value={s}>{formatSquadLabel(s)}</option>)}
                                                                                                </datalist>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                    <div className="flex gap-4 flex-wrap">
                                                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                                                            <input type="checkbox" checked={memberEditForm.isCaptain}
                                                                                                onChange={e => setMemberEditForm(f => ({ ...f, isCaptain: e.target.checked, isCommandant: e.target.checked ? false : f.isCommandant }))}
                                                                                                className="accent-cyan-500 w-4 h-4" />
                                                                                            <span className="text-xs font-bold text-slate-300">小隊長</span>
                                                                                        </label>
                                                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                                                            <input type="checkbox" checked={memberEditForm.isCommandant}
                                                                                                onChange={e => setMemberEditForm(f => ({ ...f, isCommandant: e.target.checked, isCaptain: e.target.checked ? false : f.isCaptain, squadName: e.target.checked ? '' : f.squadName }))}
                                                                                                className="accent-amber-500 w-4 h-4" />
                                                                                            <span className="text-xs font-bold text-slate-300">大隊長</span>
                                                                                        </label>
                                                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                                                            <input type="checkbox" checked={memberEditForm.isGM}
                                                                                                onChange={e => setMemberEditForm(f => ({ ...f, isGM: e.target.checked }))}
                                                                                                className="accent-red-500 w-4 h-4" />
                                                                                            <span className="text-xs font-bold text-red-400">GM 模式</span>
                                                                                        </label>
                                                                                    </div>
                                                                                    <div className="flex gap-2">
                                                                                        <button onClick={saveMemberEdit} disabled={memberSaving}
                                                                                            className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black rounded-xl disabled:opacity-50 transition-colors">
                                                                                            {memberSaving ? '儲存中…' : '✅ 儲存'}
                                                                                        </button>
                                                                                        <button onClick={() => setEditingMemberId(null)}
                                                                                            className="px-4 py-2 bg-slate-800 text-slate-400 text-xs font-bold rounded-xl hover:text-white transition-colors">
                                                                                            取消
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                            ) : (
                                                                                <div className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/5 transition-colors">
                                                                                    <div className="flex items-center gap-2">
                                                                                        {p.IsCommandant
                                                                                            ? <span className="text-[10px] font-black bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">大隊長</span>
                                                                                            : p.IsCaptain
                                                                                                ? <span className="text-[10px] font-black bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded">小隊長</span>
                                                                                                : <span className="text-[10px] text-slate-700 px-1.5 py-0.5">學員</span>}
                                                                                        <span className="text-sm text-slate-200">{p.Name}</span>
                                                                                        <span className="text-[10px] text-slate-600">Lv.{p.Level}</span>
                                                                                    </div>
                                                                                    <button onClick={() => startEditMember(p)}
                                                                                        className="p-1.5 rounded-lg text-slate-600 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors">
                                                                                        <Pencil size={13} />
                                                                                    </button>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>

                    {/* 參與人員名單 */}
                    <section className="space-y-6">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                            <div className="flex items-center gap-2 text-violet-400 font-black text-sm uppercase tracking-widest">
                                <Users size={16} /> 參與人員名單（{leaderboard.length} 人）
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setAddMemberOpen(v => !v)}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-violet-600/20 hover:bg-violet-600/30 text-violet-400 text-xs font-black rounded-xl border border-violet-600/30 transition-colors"
                                >
                                    <Plus size={13} /> 新增人員
                                </button>
                                <button
                                    onClick={onRefreshLeaderboard}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-black rounded-xl border border-slate-700 transition-colors"
                                    title="重新整理名單"
                                >
                                    <RefreshCw size={13} />
                                </button>
                                {filteredMembers.length > 0 && (
                                    <button onClick={downloadMembersCsv} className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-black rounded-xl transition-colors">
                                        ⬇️ 下載 Excel
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* 新增人員表單 */}
                        {addMemberOpen && (
                            <div className="bg-slate-900 border-2 border-violet-500/30 rounded-2xl p-5 space-y-4">
                                <p className="text-[10px] font-black text-violet-400 uppercase tracking-widest">新增人員</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-500 font-black uppercase">姓名（必填）</label>
                                        <input value={addMemberForm.name} onChange={e => setAddMemberForm(f => ({ ...f, name: e.target.value }))}
                                            placeholder="王小明"
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-bold outline-none focus:border-violet-500" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-500 font-black uppercase">手機號碼（必填，作為登入 ID）</label>
                                        <input value={addMemberForm.phone} onChange={e => setAddMemberForm(f => ({ ...f, phone: e.target.value }))}
                                            placeholder="0912345678"
                                            inputMode="numeric"
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-bold outline-none focus:border-violet-500" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-500 font-black uppercase">Email（選填）</label>
                                        <input value={addMemberForm.email} onChange={e => setAddMemberForm(f => ({ ...f, email: e.target.value }))}
                                            placeholder="user@example.com" type="email"
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-bold outline-none focus:border-violet-500" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-500 font-black uppercase">生日（選填）</label>
                                        <input value={addMemberForm.birthday} onChange={e => setAddMemberForm(f => ({ ...f, birthday: e.target.value }))}
                                            placeholder="YYYY-MM-DD" type="date"
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-bold outline-none focus:border-violet-500 [color-scheme:dark]" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-500 font-black uppercase">角色</label>
                                        <div className="flex gap-2">
                                            <select value={addMemberForm.role} onChange={e => setAddMemberForm(f => ({ ...f, role: e.target.value }))}
                                                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-bold outline-none focus:border-violet-500 [color-scheme:dark]">
                                                {Object.keys(ROLE_CURE_MAP).map(r => <option key={r} value={r}>{r}</option>)}
                                            </select>
                                            <button type="button"
                                                onClick={() => {
                                                    const roles = Object.keys(ROLE_CURE_MAP);
                                                    const pick = roles[Math.floor(Math.random() * roles.length)];
                                                    setAddMemberForm(f => ({ ...f, role: pick }));
                                                }}
                                                className="px-3 py-2 bg-slate-700 hover:bg-violet-700 text-slate-300 hover:text-white text-xs font-black rounded-xl border border-slate-600 transition-colors shrink-0"
                                                title="隨機選角色"
                                            >
                                                🎲
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-500 font-black uppercase">大隊</label>
                                        <input list="add-member-team-opts" value={addMemberForm.teamName} onChange={e => setAddMemberForm(f => ({ ...f, teamName: e.target.value }))}
                                            placeholder="第一大隊"
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-bold outline-none focus:border-violet-500" />
                                        <datalist id="add-member-team-opts">
                                            {allTeamNames.map(t => <option key={t} value={t}>{formatTeamLabel(t)}</option>)}
                                        </datalist>
                                    </div>
                                    {!addMemberForm.isCommandant && (
                                        <div className="space-y-1">
                                            <label className="text-[10px] text-slate-500 font-black uppercase">小隊</label>
                                            <input list="add-member-squad-opts" value={addMemberForm.squadName} onChange={e => setAddMemberForm(f => ({ ...f, squadName: e.target.value }))}
                                                placeholder="第一小隊"
                                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-bold outline-none focus:border-violet-500" />
                                            <datalist id="add-member-squad-opts">
                                                {allSquadNames.map(s => <option key={s} value={s}>{formatSquadLabel(s)}</option>)}
                                            </datalist>
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-4 flex-wrap">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={addMemberForm.isCaptain}
                                            onChange={e => setAddMemberForm(f => ({ ...f, isCaptain: e.target.checked, isCommandant: e.target.checked ? false : f.isCommandant }))}
                                            className="accent-cyan-500 w-4 h-4" />
                                        <span className="text-xs font-bold text-slate-300">小隊長</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={addMemberForm.isCommandant}
                                            onChange={e => setAddMemberForm(f => ({ ...f, isCommandant: e.target.checked, isCaptain: e.target.checked ? false : f.isCaptain, squadName: e.target.checked ? '' : f.squadName }))}
                                            className="accent-amber-500 w-4 h-4" />
                                        <span className="text-xs font-bold text-slate-300">大隊長</span>
                                    </label>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={handleAddMember} disabled={addMemberSaving || !addMemberForm.name.trim() || !addMemberForm.phone.trim()}
                                        className="flex-1 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-black rounded-xl disabled:opacity-40 transition-colors">
                                        {addMemberSaving ? '新增中…' : '✅ 新增人員'}
                                    </button>
                                    <button onClick={() => setAddMemberOpen(false)}
                                        className="px-4 py-2 bg-slate-800 text-slate-400 text-xs font-bold rounded-xl hover:text-white transition-colors">
                                        取消
                                    </button>
                                </div>
                            </div>
                        )}
                        <div className="bg-slate-900 border-2 border-violet-500/20 rounded-4xl shadow-xl overflow-hidden">
                            <div className="p-5 border-b border-slate-800 flex gap-2 flex-wrap">
                                <input type="text" placeholder="搜尋姓名 / 大隊 / 小隊..." value={memberFilter}
                                    onChange={e => setMemberFilter(e.target.value)}
                                    className="flex-1 min-w-[160px] bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs font-bold outline-none focus:border-violet-500" />
                                <select value={memberTeamFilter} onChange={e => { setMemberTeamFilter(e.target.value); setMemberSquadFilter(''); }}
                                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs font-bold outline-none focus:border-violet-500 [color-scheme:dark]">
                                    <option value="">全部大隊</option>
                                    {allTeams.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                                <select value={memberSquadFilter} onChange={e => setMemberSquadFilter(e.target.value)}
                                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs font-bold outline-none focus:border-violet-500 [color-scheme:dark]">
                                    <option value="">全部小隊</option>
                                    {allSquadsForTeam.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                {(memberFilter || memberTeamFilter || memberSquadFilter) && (
                                    <button onClick={() => { setMemberFilter(''); setMemberTeamFilter(''); setMemberSquadFilter(''); }}
                                        className="px-3 py-2 bg-slate-800 text-slate-400 rounded-xl text-xs font-bold hover:text-white transition-colors">
                                        清除
                                    </button>
                                )}
                                {filteredMembers.length !== leaderboard.length && (
                                    <p className="text-xs text-violet-400 font-bold self-center">篩選後 {filteredMembers.length} 人</p>
                                )}
                            </div>
                            <div className="overflow-auto max-h-[500px]">
                                <table className="w-full text-xs min-w-[600px]">
                                    <thead className="sticky top-0 bg-slate-900 z-10">
                                        <tr className="border-b border-slate-800">
                                            <th className="text-left px-4 py-3 text-slate-500 font-black w-8">#</th>
                                            {([
                                                { key: 'Name', label: '姓名' },
                                                { key: 'BigTeamLeagelName', label: '大隊' },
                                                { key: 'LittleTeamLeagelName', label: '小隊' },
                                            ] as { key: MemberSortKey; label: string }[]).map(col => (
                                                <th key={col.key} onClick={() => handleMemberSort(col.key)}
                                                    className="text-left px-4 py-3 text-slate-500 font-black cursor-pointer hover:text-white transition-colors select-none">
                                                    {col.label}
                                                    {memberSort.key === col.key && <span className="ml-1 text-violet-400">{memberSort.dir === 'asc' ? '↑' : '↓'}</span>}
                                                </th>
                                            ))}
                                            <th className="text-left px-4 py-3 text-slate-500 font-black">職位</th>
                                            <th className="text-left px-4 py-3 text-slate-500 font-black">任務角色</th>
                                            {([
                                                { key: 'Level', label: '等級' },
                                                { key: 'Exp', label: '修為' },
                                            ] as { key: MemberSortKey; label: string }[]).map(col => (
                                                <th key={col.key} onClick={() => handleMemberSort(col.key)}
                                                    className="text-left px-4 py-3 text-slate-500 font-black cursor-pointer hover:text-white transition-colors select-none">
                                                    {col.label}
                                                    {memberSort.key === col.key && <span className="ml-1 text-violet-400">{memberSort.dir === 'asc' ? '↑' : '↓'}</span>}
                                                </th>
                                            ))}
                                            <th className="px-4 py-3 w-16"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/60">
                                        {filteredMembers.length === 0 ? (
                                            <tr><td colSpan={10} className="text-center py-8 text-slate-500">無符合條件的成員</td></tr>
                                        ) : filteredMembers.map((p, i) => {
                                            return (
                                                <tr key={p.UserID} className="hover:bg-white/5 transition-colors">
                                                    <td className="px-4 py-3 text-slate-600">{i + 1}</td>
                                                    <td className="px-4 py-3 font-bold text-white">{p.Name}</td>
                                                    <td className="px-4 py-3 text-slate-300">
                                                        <span>{p.BigTeamLeagelName ?? '—'}</span>
                                                        {p.BigTeamLeagelName && battalionDisplayNames[p.BigTeamLeagelName] && (
                                                            <span className="block text-[10px] text-slate-500">（{battalionDisplayNames[p.BigTeamLeagelName]}）</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-300">
                                                        <span>{p.LittleTeamLeagelName ?? '—'}</span>
                                                        {p.LittleTeamLeagelName && squadDisplayNames[p.LittleTeamLeagelName] && (
                                                            <span className="block text-[10px] text-slate-500">（{squadDisplayNames[p.LittleTeamLeagelName]}）</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {p.IsCommandant
                                                            ? <span className="text-[10px] font-black bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-lg">大隊長</span>
                                                            : p.IsCaptain
                                                                ? <span className="text-[10px] font-black bg-violet-500/20 text-violet-400 px-2 py-0.5 rounded-lg">小隊長</span>
                                                                : <span className="text-[10px] text-slate-600">學員</span>}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex flex-wrap gap-1">
                                                            {parseQuestRoles(p.QuestRole).length === 0
                                                                ? <span className="text-[10px] text-slate-700">—</span>
                                                                : parseQuestRoles(p.QuestRole).map(r => {
                                                                    const label = questRolesConfig.find(rc => rc.id === r)?.name ?? r;
                                                                    return <span key={r} className="text-[10px] font-black bg-sky-500/10 text-sky-400 px-1.5 py-0.5 rounded-lg">{label}</span>;
                                                                })}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-400">Lv.{p.Level}</td>
                                                    <td className="px-4 py-3 text-orange-400 font-bold">{p.Exp.toLocaleString()}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-1.5">
                                                            {onQuickLogin && (
                                                                <button onClick={() => onQuickLogin(p.UserID)}
                                                                    title={`快捷登入：${p.Name}`}
                                                                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-[10px] font-black transition-colors border border-emerald-500/20">
                                                                    <LogIn size={11} />
                                                                </button>
                                                            )}
                                                            <button onClick={() => { setMemberDetailTarget(p); setMemberDetailRoles(parseQuestRoles(p.QuestRole)); }}
                                                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 text-[10px] font-black transition-colors">
                                                                詳情 <ChevronRight size={11} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>

                </>)}

                {/* ══ 人員詳情 Modal ══ */}
                {memberDetailTarget && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in"
                        onClick={() => setMemberDetailTarget(null)}>
                        <div className="bg-slate-900 border border-slate-700 rounded-4xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl"
                            onClick={e => e.stopPropagation()}>

                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-slate-800 shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow">
                                        {memberDetailTarget.Name[0]}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-lg font-black text-white">{memberDetailTarget.Name}</h3>
                                            {memberDetailTarget.IsCommandant && <span className="text-[10px] font-black bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-lg">大隊長</span>}
                                            {memberDetailTarget.IsCaptain && !memberDetailTarget.IsCommandant && <span className="text-[10px] font-black bg-violet-500/20 text-violet-400 px-2 py-0.5 rounded-lg">小隊長</span>}
                                            {memberDetailTarget.IsGM && <span className="text-[10px] font-black bg-red-500/20 text-red-400 px-2 py-0.5 rounded-lg">GM</span>}
                                        </div>
                                        <p className="text-xs text-slate-400">{memberDetailTarget.Role} · {memberDetailTarget.BigTeamLeagelName ?? '—'} / {memberDetailTarget.LittleTeamLeagelName ?? '—'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {onQuickLogin && (
                                        <button
                                            onClick={() => onQuickLogin(memberDetailTarget.UserID)}
                                            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 rounded-xl text-xs font-black transition-colors border border-emerald-600/30"
                                        >
                                            <LogIn size={13} /> 快捷登入
                                        </button>
                                    )}
                                    <button
                                        onClick={() => {
                                            startEditMember(memberDetailTarget);
                                        }}
                                        className="flex items-center gap-1.5 px-3 py-2 bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600/30 rounded-xl text-xs font-black transition-colors border border-cyan-600/30"
                                    >
                                        <Pencil size={13} /> 編輯
                                    </button>
                                    <button onClick={() => setMemberDetailTarget(null)} className="p-2 bg-slate-800 rounded-xl text-slate-400 hover:text-white"><X size={18} /></button>
                                </div>
                            </div>

                            {/* Body */}
                            <div className="overflow-y-auto flex-1 p-6 space-y-6">
                                {/* 修行數值 */}
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">修行數值</p>
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                        {[
                                            { label: '等級', value: `Lv.${memberDetailTarget.Level}`, color: 'text-yellow-400' },
                                            { label: '修為', value: memberDetailTarget.Exp.toLocaleString(), color: 'text-orange-400' },
                                            { label: '金幣', value: memberDetailTarget.Coins, color: 'text-yellow-500' },
                                            { label: '戰鬥金幣', value: memberDetailTarget.GameGold ?? 0, color: 'text-emerald-400' },
                                            { label: '連勝', value: `${memberDetailTarget.Streak} 天`, color: 'text-sky-400' },
                                            { label: '能量骰', value: memberDetailTarget.EnergyDice, color: 'text-indigo-400' },
                                            { label: '黃金骰', value: memberDetailTarget.GoldenDice ?? 0, color: 'text-amber-400' },
                                            { label: '難度', value: memberDetailTarget.DDA_Difficulty ?? 'normal', color: 'text-slate-300' },
                                        ].map(({ label, value, color }) => (
                                            <div key={label} className="bg-slate-800 rounded-2xl p-3 text-center">
                                                <p className="text-[10px] text-slate-500 font-bold mb-1">{label}</p>
                                                <p className={`text-sm font-black ${color}`}>{value}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* 五行屬性 */}
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">五行屬性</p>
                                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                        {[
                                            { label: '靈性', value: memberDetailTarget.Spirit },
                                            { label: '體魄', value: memberDetailTarget.Physique },
                                            { label: '魅力', value: memberDetailTarget.Charisma },
                                            { label: '悟性', value: memberDetailTarget.Savvy },
                                            { label: '福緣', value: memberDetailTarget.Luck },
                                            { label: '潛力', value: memberDetailTarget.Potential },
                                        ].map(({ label, value }) => (
                                            <div key={label} className="bg-slate-800 rounded-2xl p-3 text-center">
                                                <p className="text-[10px] text-slate-500 font-bold mb-1">{label}</p>
                                                <p className="text-sm font-black text-white">{value}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* 地圖 & 戰鬥 */}
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">地圖 & 戰鬥</p>
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                        {[
                                            { label: 'HP', value: `${memberDetailTarget.HP ?? '—'} / ${memberDetailTarget.MaxHP ?? '—'}` },
                                            { label: '座標 Q', value: memberDetailTarget.CurrentQ },
                                            { label: '座標 R', value: memberDetailTarget.CurrentR },
                                            { label: '朝向', value: memberDetailTarget.Facing ?? '—' },
                                        ].map(({ label, value }) => (
                                            <div key={label} className="bg-slate-800 rounded-2xl p-3 text-center">
                                                <p className="text-[10px] text-slate-500 font-bold mb-1">{label}</p>
                                                <p className="text-sm font-black text-slate-200">{String(value)}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* 財務 */}
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">財務</p>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="bg-slate-800 rounded-2xl p-3 text-center">
                                            <p className="text-[10px] text-slate-500 font-bold mb-1">總罰金</p>
                                            <p className="text-sm font-black text-red-400">NT${memberDetailTarget.TotalFines}</p>
                                        </div>
                                        <div className="bg-slate-800 rounded-2xl p-3 text-center">
                                            <p className="text-[10px] text-slate-500 font-bold mb-1">已繳金額</p>
                                            <p className="text-sm font-black text-emerald-400">NT${memberDetailTarget.FinePaid}</p>
                                        </div>
                                        <div className="bg-slate-800 rounded-2xl p-3 text-center">
                                            <p className="text-[10px] text-slate-500 font-bold mb-1">未繳餘額</p>
                                            <p className={`text-sm font-black ${memberDetailTarget.TotalFines - memberDetailTarget.FinePaid > 0 ? 'text-red-400' : 'text-slate-500'}`}>
                                                NT${memberDetailTarget.TotalFines - memberDetailTarget.FinePaid}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* 道具 */}
                                {(memberDetailTarget.Inventory?.length > 0 || (memberDetailTarget.GameInventory?.length ?? 0) > 0) && (
                                    <div>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">道具</p>
                                        <div className="space-y-2">
                                            {memberDetailTarget.Inventory?.length > 0 && (
                                                <div className="flex flex-wrap gap-2">
                                                    {memberDetailTarget.Inventory.map(id => {
                                                        const art = ARTIFACTS_CONFIG.find(a => a.id === id);
                                                        return (
                                                            <span key={id} className="text-[10px] font-black bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2.5 py-1.5 rounded-xl">
                                                                {art ? art.name : id}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                            {(memberDetailTarget.GameInventory?.length ?? 0) > 0 && (
                                                <div className="flex flex-wrap gap-2">
                                                    {memberDetailTarget.GameInventory!.map(({ id, count }) => (
                                                        <span key={id} className="text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1.5 rounded-xl">
                                                            {id} ×{count}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* 帳號資訊 */}
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">帳號資訊</p>
                                    <div className="bg-slate-800 rounded-2xl p-4 space-y-2 text-xs">
                                        {[
                                            { label: 'UserID', value: memberDetailTarget.UserID },
                                            { label: 'Email', value: memberDetailTarget.Email ?? '—' },
                                            { label: 'LINE ID', value: memberDetailTarget.LineUserId ?? '未綁定' },
                                            { label: '生日', value: memberDetailTarget.Birthday ?? '—' },
                                            { label: '最後打卡', value: memberDetailTarget.LastCheckIn ? new Date(memberDetailTarget.LastCheckIn).toLocaleString('zh-TW') : '—' },
                                        ].map(({ label, value }) => (
                                            <div key={label} className="flex items-start gap-3">
                                                <span className="text-slate-500 font-bold w-20 shrink-0">{label}</span>
                                                <span className="text-slate-300 font-mono break-all">{value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* 任務角色 */}
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <Tag size={12} className="text-sky-400" />
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">任務角色</p>
                                    </div>
                                    <div className="bg-slate-800 rounded-2xl p-4 space-y-3">
                                        {/* 目前角色 */}
                                        <div className="flex flex-wrap gap-2 min-h-[28px]">
                                            {memberDetailRoles.length === 0
                                                ? <span className="text-xs text-slate-600">尚未指派角色</span>
                                                : memberDetailRoles.map(role => {
                                                    const label = questRolesConfig.find(rc => rc.id === role)?.name ?? role;
                                                    return (
                                                        <button key={role}
                                                            onClick={() => setMemberDetailRoles(prev => prev.filter(r => r !== role))}
                                                            className="flex items-center gap-1 text-[11px] font-black bg-sky-500/15 text-sky-300 border border-sky-500/30 px-2.5 py-1 rounded-xl hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/30 transition-colors group">
                                                            {label} <X size={9} className="opacity-50 group-hover:opacity-100" />
                                                        </button>
                                                    );
                                                })
                                            }
                                        </div>
                                        {/* 可選角色 */}
                                        <div className="border-t border-slate-700 pt-3">
                                            <p className="text-[10px] text-slate-500 mb-2">點擊新增（最多 2 個）</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {questRolesConfig.map(rc => {
                                                    const active = memberDetailRoles.includes(rc.id);
                                                    const maxed = memberDetailRoles.length >= 2 && !active;
                                                    return (
                                                        <button key={rc.id}
                                                            disabled={maxed}
                                                            onClick={() => {
                                                                if (active) setMemberDetailRoles(prev => prev.filter(r => r !== rc.id));
                                                                else if (!maxed) setMemberDetailRoles(prev => [...prev, rc.id]);
                                                            }}
                                                            className={`text-[11px] font-black px-2.5 py-1 rounded-xl border transition-colors ${
                                                                active ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                                                                : maxed ? 'opacity-30 cursor-not-allowed bg-slate-700 text-slate-500 border-slate-600'
                                                                : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-sky-500/15 hover:text-sky-300 hover:border-sky-500/30'
                                                            }`}>
                                                            {active ? '✓ ' : ''}{rc.name}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        {/* 儲存 */}
                                        <button
                                            disabled={rolesSaving}
                                            onClick={async () => {
                                                setRolesSaving(true);
                                                const { adminSetMemberQuestRole } = await import('@/app/actions/admin');
                                                const res = await adminSetMemberQuestRole(memberDetailTarget.UserID, memberDetailRoles);
                                                setRolesSaving(false);
                                                if (!res.success) alert('儲存失敗：' + res.error);
                                            }}
                                            className="w-full py-2 bg-sky-600/20 hover:bg-sky-600/30 text-sky-400 text-xs font-black rounded-xl border border-sky-600/30 transition-colors disabled:opacity-50">
                                            {rolesSaving ? '儲存中…' : '✅ 儲存角色'}
                                        </button>
                                    </div>
                                </div>

                                {/* ── 編輯表單 ── */}
                                {editingMemberId === memberDetailTarget.UserID && (
                                    <div className="border-t border-slate-700 pt-4 space-y-3">
                                        <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">編輯人員資料</p>
                                        <div className={`grid gap-3 ${memberEditForm.isCommandant ? 'grid-cols-1' : 'grid-cols-2'}`}>
                                            <div className="space-y-1">
                                                <label className="text-[10px] text-slate-500 font-black uppercase">大隊</label>
                                                <input list="detail-team-options" value={memberEditForm.teamName}
                                                    onChange={e => setMemberEditForm(f => ({ ...f, teamName: e.target.value }))}
                                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-bold outline-none focus:border-cyan-500" />
                                                <datalist id="detail-team-options">
                                                    {allTeamNames.map(s => <option key={s} value={s}>{formatTeamLabel(s)}</option>)}
                                                </datalist>
                                            </div>
                                            {!memberEditForm.isCommandant && (
                                                <div className="space-y-1">
                                                    <label className="text-[10px] text-slate-500 font-black uppercase">小隊</label>
                                                    <input list="detail-squad-options" value={memberEditForm.squadName}
                                                        onChange={e => setMemberEditForm(f => ({ ...f, squadName: e.target.value }))}
                                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-bold outline-none focus:border-cyan-500" />
                                                    <datalist id="detail-squad-options">
                                                        {allSquadNames.map(s => <option key={s} value={s}>{formatSquadLabel(s)}</option>)}
                                                    </datalist>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-4 flex-wrap">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="checkbox" checked={memberEditForm.isCaptain}
                                                    onChange={e => setMemberEditForm(f => ({ ...f, isCaptain: e.target.checked, isCommandant: e.target.checked ? false : f.isCommandant }))}
                                                    className="accent-cyan-500 w-4 h-4" />
                                                <span className="text-xs font-bold text-slate-300">小隊長</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="checkbox" checked={memberEditForm.isCommandant}
                                                    onChange={e => setMemberEditForm(f => ({ ...f, isCommandant: e.target.checked, isCaptain: e.target.checked ? false : f.isCaptain, squadName: e.target.checked ? '' : f.squadName }))}
                                                    className="accent-amber-500 w-4 h-4" />
                                                <span className="text-xs font-bold text-slate-300">大隊長</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="checkbox" checked={memberEditForm.isGM}
                                                    onChange={e => setMemberEditForm(f => ({ ...f, isGM: e.target.checked }))}
                                                    className="accent-red-500 w-4 h-4" />
                                                <span className="text-xs font-bold text-red-400">GM 模式</span>
                                            </label>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={async () => { await saveMemberEdit(); setMemberDetailTarget(null); }} disabled={memberSaving}
                                                className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black rounded-xl disabled:opacity-50 transition-colors">
                                                {memberSaving ? '儲存中…' : '✅ 儲存'}
                                            </button>
                                            <button onClick={() => setEditingMemberId(null)}
                                                className="px-4 py-2 bg-slate-800 text-slate-400 text-xs font-bold rounded-xl hover:text-white transition-colors">
                                                取消
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ══ 課程管理模組 ══ */}
                {adminModule === 'course' && (<>

                    {/* 志工掃碼授權 */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-2 text-teal-500 font-black text-sm uppercase tracking-widest"><QrCode size={16} /> 志工掃碼授權</div>
                        <div className="bg-slate-900 border-2 border-teal-500/20 p-8 rounded-4xl space-y-5 shadow-xl">
                            <p className="text-xs text-slate-400">
                                志工掃碼密碼為 6 位數字，每天凌晨 12 點自動更新。手動更新後，已登入的志工將立即被登出。
                            </p>

                            {/* 目前密碼顯示 */}
                            <div className="flex items-center gap-4 bg-slate-950 border border-teal-500/30 rounded-2xl p-4">
                                <div className="flex-1">
                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">目前密碼</p>
                                    <p className="text-3xl font-black text-teal-300 tracking-[0.3em] font-mono">
                                        {systemSettings.VolunteerPassword || '——'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        const newPwd = String(Math.floor(100000 + Math.random() * 900000));
                                        updateGlobalSetting('VolunteerPassword', newPwd);
                                    }}
                                    className="flex items-center gap-2 px-4 py-3 bg-teal-600 hover:bg-teal-500 active:scale-95 text-white text-xs font-black rounded-2xl transition-all shrink-0"
                                >
                                    🎲 手動更新
                                </button>
                            </div>
                            <p className="text-[10px] text-slate-600 text-center">自動輪換：每日 00:00（台灣時間）</p>

                            {/* 自訂密碼（進階） */}
                            <details className="group">
                                <summary className="text-[10px] text-slate-600 hover:text-slate-400 cursor-pointer font-black uppercase tracking-widest">▶ 自訂密碼（進階）</summary>
                                <div className="flex gap-2 mt-3">
                                    <input type="text" value={volunteerPwd} onChange={e => { setVolunteerPwd(e.target.value); setVolPwdSaved(false); }}
                                        placeholder="輸入自訂密碼"
                                        className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white text-sm font-bold outline-none focus:border-teal-500" />
                                    <button onClick={() => { if (!volunteerPwd.trim()) return; updateGlobalSetting('VolunteerPassword', volunteerPwd.trim()); setVolPwdSaved(true); }}
                                        disabled={!volunteerPwd.trim()} className="bg-teal-600 px-5 rounded-2xl text-white font-black hover:bg-teal-500 transition-colors disabled:opacity-40">
                                        <Save size={16} />
                                    </button>
                                </div>
                                {volPwdSaved && <p className="text-xs text-teal-400 font-bold text-center mt-2">✅ 已儲存</p>}
                            </details>
                        </div>
                    </section>

                    {/* 課程管理 */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-2 text-amber-500 font-black text-sm uppercase tracking-widest">
                            <BookOpen size={16} /> 課程管理
                            <button onClick={() => { setCourseForm(emptyCourseForm); setEditingCourseId(null); setShowCourseModal(true); }}
                                className="ml-auto flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-black rounded-xl transition-colors">
                                <Plus size={13} /> 新增課程
                            </button>
                        </div>
                        <div className="bg-slate-900 border-2 border-amber-500/20 p-8 rounded-4xl space-y-6 shadow-xl">
                            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                                {courses.length === 0 && <p className="text-xs text-slate-500 text-center py-4">尚無課程</p>}
                                {courses.map(c => (
                                    <div key={c.id} className="flex justify-between items-start bg-slate-950 p-4 rounded-2xl border border-slate-800 gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-black text-white">{c.name}</span>
                                                <span className="text-[10px] font-mono text-slate-500">{c.id}</span>
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${c.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-500'}`}>
                                                    {c.is_active ? '開放' : '關閉'}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-400 mt-1">{c.date_display}・{c.time}</p>
                                            <p className="text-xs text-slate-500">{c.location}{c.address ? `・${c.address}` : ''}</p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <button onClick={() => { setRegModalCourse(c); loadRegList(c.id); }}
                                                className="px-3 py-1.5 rounded-xl bg-sky-700 hover:bg-sky-600 text-white text-xs font-black transition-colors">報名名單</button>
                                            <button onClick={() => onUpsertCourse({ ...c, is_active: !c.is_active })}
                                                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-amber-400 transition-colors">
                                                {c.is_active ? <ToggleRight size={16} className="text-emerald-400" /> : <ToggleLeft size={16} />}
                                            </button>
                                            <button onClick={() => handleEditCourse(c)} className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-amber-400 transition-colors"><Pencil size={15} /></button>
                                            <button onClick={() => onDeleteCourse(c.id)} className="p-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"><X size={15} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* 巔峰試煉管理 */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-2 text-purple-500 font-black text-sm uppercase tracking-widest">
                            <Trophy size={16} /> 巔峰試煉管理
                            <button onClick={() => { setPtForm(emptyPtForm); setShowPtForm(v => !v); }}
                                className="ml-auto flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-black rounded-xl transition-colors">
                                <Plus size={13} /> 新增活動
                            </button>
                        </div>
                        <div className="bg-slate-900 border-2 border-purple-500/20 p-6 rounded-4xl space-y-4 shadow-xl">
                            {/* 新增 / 編輯表單 */}
                            {showPtForm && (
                                <div className="bg-slate-800/60 border border-purple-500/20 rounded-2xl p-4 space-y-3">
                                    <p className="text-purple-300 font-black text-xs uppercase tracking-widest">
                                        {ptEditingId ? '編輯活動' : '新增巔峰試煉活動'}
                                    </p>
                                    <input value={ptForm.title} onChange={e => setPtForm(p => ({ ...p, title: e.target.value }))}
                                        placeholder="活動名稱 *"
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-purple-500" />
                                    <textarea value={ptForm.description} onChange={e => setPtForm(p => ({ ...p, description: e.target.value }))}
                                        placeholder="活動說明（選填）" rows={2}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-purple-500 resize-none" />
                                    <div className="grid grid-cols-2 gap-2">
                                        <input type="date" value={ptForm.date} onChange={e => setPtForm(p => ({ ...p, date: e.target.value }))}
                                            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-purple-500" />
                                        <input value={ptForm.time} onChange={e => setPtForm(p => ({ ...p, time: e.target.value }))}
                                            placeholder="時間（如 14:00）"
                                            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-purple-500" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input value={ptForm.location} onChange={e => setPtForm(p => ({ ...p, location: e.target.value }))}
                                            placeholder="地點（選填）"
                                            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-purple-500" />
                                        <input type="number" value={ptForm.max_participants} onChange={e => setPtForm(p => ({ ...p, max_participants: e.target.value }))}
                                            placeholder="名額上限（選填）"
                                            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-purple-500" />
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={handleSavePt} disabled={ptSaving || !ptForm.title || !ptForm.date}
                                            className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-black text-xs rounded-xl transition-colors">
                                            {ptSaving ? '儲存中…' : ptEditingId ? '✅ 更新活動' : '✅ 建立活動'}
                                        </button>
                                        <button onClick={() => { setShowPtForm(false); setPtEditingId(null); setPtForm(emptyPtForm); }}
                                            className="px-4 py-2 bg-slate-700 text-slate-300 text-xs font-black rounded-xl">取消</button>
                                    </div>
                                </div>
                            )}

                            {/* 活動列表 */}
                            {peakTrials.length === 0 && !showPtForm && (
                                <p className="text-xs text-slate-500 text-center py-4">尚無巔峰試煉活動</p>
                            )}
                            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                                {peakTrials.map(trial => {
                                    const isViewingThis = ptViewRegs?.trialId === trial.id;
                                    return (
                                        <div key={trial.id} className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
                                            <div className="flex items-center gap-3 p-4">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-black text-white">{trial.title}</span>
                                                        {trial.battalion_name && <span className="text-[10px] text-purple-400">{trial.battalion_name}</span>}
                                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${trial.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-500'}`}>
                                                            {trial.is_active ? '開放' : '關閉'}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-400 mt-1">
                                                        {trial.date}{trial.time ? ` · ${trial.time}` : ''}{trial.location ? ` · ${trial.location}` : ''}
                                                    </p>
                                                    <p className="text-[10px] text-purple-400 mt-0.5">
                                                        已報名 {trial.registration_count ?? 0} 人{trial.max_participants ? ` / 限額 ${trial.max_participants}` : ''}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <button onClick={() => handleViewPtRegs(trial.id)}
                                                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-colors ${isViewingThis ? 'bg-purple-600 text-white' : 'bg-sky-700 hover:bg-sky-600 text-white'}`}>
                                                        報名名單
                                                    </button>
                                                    <button onClick={() => openPtEdit(trial)}
                                                        className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-purple-400 transition-colors">
                                                        <Pencil size={15} />
                                                    </button>
                                                    <button onClick={() => togglePeakTrialActive(trial.id, !trial.is_active).then(refreshPtList)}
                                                        className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-purple-400 transition-colors">
                                                        {trial.is_active ? <ToggleRight size={16} className="text-emerald-400" /> : <ToggleLeft size={16} />}
                                                    </button>
                                                    <button onClick={() => handleDeletePt(trial.id)} disabled={ptDeletingId === trial.id}
                                                        className="p-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors disabled:opacity-40">
                                                        <X size={15} />
                                                    </button>
                                                </div>
                                            </div>
                                            {/* 報名名單展開 */}
                                            {isViewingThis && (
                                                <div className="border-t border-slate-800 px-4 py-3 space-y-2 max-h-64 overflow-y-auto">
                                                    <p className="text-xs text-slate-500 font-black">報名名單（{ptViewRegs.regs.length} 人）</p>
                                                    {ptViewRegs.regs.length === 0 ? (
                                                        <p className="text-xs text-slate-600 py-2">尚無人報名</p>
                                                    ) : ptViewRegs.regs.map(reg => (
                                                        <div key={reg.id} className="flex items-center gap-2">
                                                            <span className={`text-sm flex-1 ${reg.attended ? 'text-slate-500 line-through' : 'text-white'}`}>{reg.user_name}</span>
                                                            <span className="text-[10px] text-slate-500">{reg.squad_name}</span>
                                                            <span className="text-[10px] text-slate-500">{reg.battalion_name}</span>
                                                            {reg.attended ? (
                                                                <span className="text-[10px] font-black text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-lg">已出席</span>
                                                            ) : (
                                                                <button onClick={() => handleMarkPtAttendance(reg.id, trial.id)} disabled={ptMarkingId === reg.id}
                                                                    className="text-[10px] font-black text-purple-400 bg-purple-400/10 hover:bg-purple-400/20 px-2 py-0.5 rounded-lg transition-colors disabled:opacity-40">
                                                                    {ptMarkingId === reg.id ? '…' : '核銷'}
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </section>

                </>)}

                {/* ══ 任務管理模組 ══ */}
                {adminModule === 'quest' && (<>

                    {/* ── 主線任務管理（統一版） ── */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-2 text-yellow-500 font-black text-sm uppercase tracking-widest">
                            <Calendar size={16} /> 主線任務管理
                            <button onClick={() => { setMqFormEntry({ topicTitle: '', title: '', description: '', reward: '1000', coins: '0', startDate: '', bonusThresholdPct: '', bonusRewardType: 'coins', bonusRewardAmount: '' }); setShowMqModal(true); }}
                                className="ml-auto flex items-center gap-1 px-3 py-1.5 bg-yellow-600 hover:bg-yellow-500 text-white text-xs font-black rounded-xl transition-colors">
                                <Plus size={13} /> 新增排程
                            </button>
                        </div>
                        <div className="bg-slate-900 border-2 border-yellow-500/20 p-6 rounded-4xl space-y-6 shadow-xl">

                            {/* 1. 當前主線任務（唯讀） */}
                            <div className="space-y-2">
                                <p className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">⚔️ 當前主線任務（唯讀）</p>
                                {activeMqEntry ? (
                                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 space-y-2">
                                        {activeMqEntry.topicTitle && (
                                            <p className="text-xs font-black text-yellow-400 uppercase tracking-widest">{activeMqEntry.topicTitle}</p>
                                        )}
                                        <p className="text-base font-bold text-white">{activeMqEntry.title}</p>
                                        {activeMqEntry.description && (
                                            <p className="text-xs text-slate-400">{activeMqEntry.description}</p>
                                        )}
                                        <p className="text-[10px] text-slate-500 pt-1">
                                            開始：{activeMqEntry.startDate}　·　+{activeMqEntry.reward} 修為　·　+{activeMqEntry.coins} 🪙
                                        </p>
                                        {activeMqEntry.bonusThresholdPct && activeMqEntry.bonusRewardAmount && (
                                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mt-2 space-y-2">
                                                <p className="text-[10px] text-amber-400 font-bold">
                                                    🎁 額外獎勵：全員 {activeMqEntry.bonusThresholdPct}% 達成 → 每人 +{activeMqEntry.bonusRewardAmount} {activeMqEntry.bonusRewardType === 'exp' ? '修為' : '金幣'}
                                                </p>
                                                <MqBonusSettleButton entry={activeMqEntry} />
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-500 italic">尚無進行中的主線任務</p>
                                )}
                            </div>

                            {/* 2. 排程列表（可編輯） */}
                            <div className="space-y-2 border-t border-slate-800 pt-5">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">排程列表</p>
                                {mainQuestSchedule.length > 0 ? (
                                    <div className="space-y-3">
                                        {mainQuestSchedule.map(entry => {
                                            const isActive = activeMqEntry?.id === entry.id;
                                            const isPast = !isActive && entry.startDate <= today;
                                            return (
                                                <div key={entry.id} className={`bg-slate-950 p-4 rounded-2xl border space-y-2 transition-all ${isActive ? 'border-yellow-500/50' : isPast ? 'border-slate-800 opacity-50' : 'border-slate-800'}`}>
                                                    <div className="flex justify-between items-start gap-3">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                                {entry.topicTitle && (
                                                                    <span className="text-[10px] font-black text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-lg">{entry.topicTitle}</span>
                                                                )}
                                                                <span className="text-[10px] font-black text-slate-500 bg-slate-800 px-2 py-0.5 rounded-lg">{entry.startDate}</span>
                                                                {isActive && <span className="text-[10px] font-black text-yellow-400 bg-yellow-500/20 px-2 py-0.5 rounded-lg">✦ 當前</span>}
                                                            </div>
                                                            <h4 className="font-bold text-slate-200">{entry.title}</h4>
                                                            {entry.description && <p className="text-xs text-slate-500 mt-0.5">{entry.description}</p>}
                                                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                                <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-lg">+{entry.reward} 修為</span>
                                                                <span className="text-[10px] font-black text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-lg">+{entry.coins} 🪙</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            {!isActive && (
                                                                <button onClick={() => handleApplyMqEntry(entry)}
                                                                    className="text-[10px] font-black text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded-xl transition-colors">
                                                                    套用
                                                                </button>
                                                            )}
                                                            <button onClick={() => mqEditId === entry.id ? setMqEditId(null) : handleOpenMqEdit(entry)}
                                                                className="p-2 bg-slate-700/50 text-slate-400 rounded-xl hover:bg-slate-700 transition-colors">
                                                                <Pencil size={13} />
                                                            </button>
                                                            {!isActive && (
                                                                <button onClick={() => handleRemoveMqEntry(entry.id)}
                                                                    className="p-2 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-colors">
                                                                    <Trash2 size={13} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {/* Inline edit form */}
                                                    {mqEditId === entry.id && (
                                                        <div className="border-t border-slate-700/40 pt-3 space-y-2">
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <input placeholder="主題標籤（選填）" value={mqEditForm.topicTitle}
                                                                    onChange={e => setMqEditForm(f => ({ ...f, topicTitle: e.target.value }))}
                                                                    className="col-span-2 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-yellow-500" />
                                                                <input placeholder="任務名稱*" value={mqEditForm.title}
                                                                    onChange={e => setMqEditForm(f => ({ ...f, title: e.target.value }))}
                                                                    className="col-span-2 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-yellow-500" />
                                                                <input placeholder="說明（選填）" value={mqEditForm.description}
                                                                    onChange={e => setMqEditForm(f => ({ ...f, description: e.target.value }))}
                                                                    className="col-span-2 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-yellow-500" />
                                                                <input type="number" placeholder="修為" value={mqEditForm.reward}
                                                                    onChange={e => setMqEditForm(f => ({ ...f, reward: e.target.value }))}
                                                                    className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-yellow-500" />
                                                                <input type="number" placeholder="金幣" value={mqEditForm.coins}
                                                                    onChange={e => setMqEditForm(f => ({ ...f, coins: e.target.value }))}
                                                                    className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-yellow-500" />
                                                                <input type="date" value={mqEditForm.startDate}
                                                                    onChange={e => setMqEditForm(f => ({ ...f, startDate: e.target.value }))}
                                                                    className="col-span-2 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-yellow-500" />
                                                            </div>
                                                            {/* 額外獎勵 */}
                                                            <div className="bg-amber-950/20 border border-amber-500/20 rounded-xl p-3 space-y-2">
                                                                <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest">🎁 額外獎勵</p>
                                                                <div className="grid grid-cols-3 gap-2">
                                                                    <input type="number" min={1} max={100} placeholder="達成率%"
                                                                        value={mqEditForm.bonusThresholdPct}
                                                                        onChange={e => setMqEditForm(f => ({ ...f, bonusThresholdPct: e.target.value }))}
                                                                        className="bg-slate-900 border border-amber-500/30 rounded-xl px-2 py-2 text-white text-xs text-center outline-none focus:border-amber-500" />
                                                                    <select value={mqEditForm.bonusRewardType}
                                                                        onChange={e => setMqEditForm(f => ({ ...f, bonusRewardType: e.target.value as 'coins' | 'exp' }))}
                                                                        className="bg-slate-900 border border-amber-500/30 rounded-xl px-2 py-2 text-white text-xs outline-none focus:border-amber-500">
                                                                        <option value="coins">🪙 金幣</option>
                                                                        <option value="exp">✨ 修為</option>
                                                                    </select>
                                                                    <input type="number" min={1} placeholder="數量"
                                                                        value={mqEditForm.bonusRewardAmount}
                                                                        onChange={e => setMqEditForm(f => ({ ...f, bonusRewardAmount: e.target.value }))}
                                                                        className="bg-slate-900 border border-amber-500/30 rounded-xl px-2 py-2 text-white text-xs text-center outline-none focus:border-amber-500" />
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <button onClick={() => setMqEditId(null)}
                                                                    className="flex-1 py-2 rounded-xl text-xs font-black text-slate-400 bg-slate-800 hover:bg-slate-700 transition-colors">
                                                                    取消
                                                                </button>
                                                                <button onClick={handleSaveMqEdit}
                                                                    className="flex-[2] py-2 rounded-xl text-xs font-black text-white bg-yellow-600 hover:bg-yellow-500 transition-colors">
                                                                    儲存變更
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-500 text-center py-4">尚無排程。新增後系統將依開始日期自動切換。</p>
                                )}
                            </div>

                            {/* 4. 歷史排程紀錄 */}
                            {topicHistory.length > 0 && (
                                <div className="border-t border-slate-800 pt-5 space-y-2">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">歷史排程紀錄</p>
                                    <div className="bg-slate-950/50 rounded-2xl border border-white/5 overflow-hidden">
                                        <div className="max-h-36 overflow-y-auto divide-y divide-white/5">
                                            {topicHistory.map(h => (
                                                <div key={h.id} className="px-3 py-2 text-xs flex justify-between items-center text-slate-300">
                                                    <span>{h.TopicTitle}</span>
                                                    <span className="text-[10px] text-slate-600">{new Date(h.created_at).toLocaleDateString('zh-TW')}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* ── 副本任務管理 ── */}
                    <BonusQuestConfigSection systemSettings={systemSettings} updateGlobalSetting={updateGlobalSetting} />

                    <section className="space-y-6">
                        <div className="flex items-center gap-2 text-orange-500 font-black text-sm uppercase tracking-widest">
                            <Settings size={16} /> 臨時加分任務管理
                            <button onClick={() => { setTqFormTitle(''); setTqFormSub(''); setTqFormDesc(''); setTqFormReward('500'); setTqFormCoins(''); setShowTqModal(true); }}
                                className="ml-auto flex items-center gap-1 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-black rounded-xl transition-colors">
                                <Plus size={13} /> 新增任務
                            </button>
                        </div>
                        <div className="bg-slate-900 border-2 border-slate-800 p-8 rounded-4xl space-y-6 shadow-xl">
                            <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                                {temporaryQuests.filter(tq => tq.category !== 'special').map(tq => {
                                    const isEditing = tqEditId === tq.id;
                                    return (
                                        <div key={tq.id} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                                            <div className="flex justify-between items-start gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h4 className="font-bold text-slate-200">{tq.title}</h4>
                                                        <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-lg">
                                                            +{tq.reward} 修為
                                                        </span>
                                                        <span className="text-[10px] font-black text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-lg">
                                                            +{tq.coins ?? Math.floor(tq.reward * 0.1)} 🪙
                                                        </span>
                                                    </div>
                                                    {tq.sub && <p className="text-xs text-orange-400 font-bold mt-1">{tq.sub}</p>}
                                                    {tq.desc && <p className="text-xs text-slate-500 mt-0.5">{tq.desc}</p>}
                                                    {(tq.start_date || tq.end_date) && (
                                                        <p className="text-[10px] text-indigo-400 mt-1">
                                                            {tq.start_date && `${tq.start_date} 起`}{tq.start_date && tq.end_date && ' ~ '}{tq.end_date && `${tq.end_date} 止`}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <button onClick={() => onToggleTempQuest(tq.id, !tq.active)}
                                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${tq.active ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/50' : 'bg-slate-800 text-slate-400'}`}>
                                                        {tq.active ? '🟢 啟用' : '🔴 暫停'}
                                                    </button>
                                                    <button onClick={() => {
                                                        if (isEditing) {
                                                            setTqEditId(null);
                                                        } else {
                                                            setTqEditId(tq.id);
                                                            setTqEditTitle(tq.title);
                                                            setTqEditSub(tq.sub || '');
                                                            setTqEditDesc(tq.desc || '');
                                                            setTqEditReward(String(tq.reward));
                                                            setTqEditCoins(tq.coins !== undefined ? String(tq.coins) : '');
                                                            setTqEditStartDate(tq.start_date || '');
                                                            setTqEditEndDate(tq.end_date || '');
                                                        }
                                                    }} className={`p-2 rounded-xl transition-colors ${isEditing ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-800 text-slate-400 hover:text-orange-400'}`}>
                                                        <Pencil size={14} />
                                                    </button>
                                                    <button onClick={() => onDeleteTempQuest(tq.id)} className="p-2 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-colors"><X size={14} /></button>
                                                </div>
                                            </div>
                                            {isEditing && (
                                                <div className="border-t border-slate-800 pt-3 space-y-3">
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] text-slate-500 font-bold">主標題</label>
                                                        <input value={tqEditTitle} onChange={e => setTqEditTitle(e.target.value)}
                                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-bold outline-none focus:border-orange-500 text-sm" />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] text-slate-500 font-bold">副標題</label>
                                                            <input value={tqEditSub} onChange={e => setTqEditSub(e.target.value)}
                                                                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-bold outline-none focus:border-orange-500 text-sm" />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] text-slate-500 font-bold">說明</label>
                                                            <input value={tqEditDesc} onChange={e => setTqEditDesc(e.target.value)}
                                                                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-bold outline-none focus:border-orange-500 text-sm" />
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-3 items-end">
                                                        <div className="space-y-1 flex-1">
                                                            <label className="text-[10px] text-slate-500 font-bold">修為</label>
                                                            <input type="number" value={tqEditReward} onChange={e => setTqEditReward(e.target.value)}
                                                                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-bold text-center outline-none focus:border-orange-500 text-sm" />
                                                        </div>
                                                        <div className="space-y-1 flex-1">
                                                            <label className="text-[10px] text-slate-500 font-bold">金幣（空白 = × 10%）</label>
                                                            <input type="number" value={tqEditCoins} onChange={e => setTqEditCoins(e.target.value)}
                                                                placeholder="自動" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-bold text-center outline-none focus:border-orange-500 text-sm" />
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-3 items-end">
                                                        <div className="space-y-1 flex-1">
                                                            <label className="text-[10px] text-slate-500 font-bold">開始日期</label>
                                                            <input type="date" value={tqEditStartDate} onChange={e => setTqEditStartDate(e.target.value)}
                                                                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-bold outline-none focus:border-orange-500 text-sm" />
                                                        </div>
                                                        <div className="space-y-1 flex-1">
                                                            <label className="text-[10px] text-slate-500 font-bold">結束日期</label>
                                                            <input type="date" value={tqEditEndDate} onChange={e => setTqEditEndDate(e.target.value)}
                                                                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-bold outline-none focus:border-orange-500 text-sm" />
                                                        </div>
                                                    </div>
                                                    <button onClick={async () => {
                                                        const r = parseInt(tqEditReward, 10);
                                                        const c = tqEditCoins.trim() ? parseInt(tqEditCoins, 10) : null;
                                                        if (r > 0) {
                                                            const { createClient } = await import('@supabase/supabase-js');
                                                            const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
                                                            await sb.from('temporaryquests').update({
                                                                title: tqEditTitle, sub: tqEditSub, desc: tqEditDesc, reward: r, coins: c,
                                                                start_date: tqEditStartDate || null,
                                                                end_date: tqEditEndDate || null,
                                                            }).eq('id', tq.id);
                                                            onUpdateTempQuest(tq.id, r, c);
                                                            setTqEditId(null);
                                                        }
                                                    }} className="w-full flex items-center justify-center gap-1 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2.5 rounded-xl font-black text-xs transition-colors">
                                                        <Save size={13} /> 儲存
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </section>

                    {/* ── 特殊任務管理 ── */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-2 text-purple-400 font-black text-sm uppercase tracking-widest">
                            <Settings size={16} /> 特殊任務管理
                            <button onClick={() => {
                                setTqFormTitle(''); setTqFormSub(''); setTqFormDesc(''); setTqFormReward('500'); setTqFormCoins(''); setTqFormStartDate(''); setTqFormEndDate('');
                                setShowSpecialModal(true);
                            }}
                                className="ml-auto flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-black rounded-xl transition-colors">
                                <Plus size={13} /> 新增任務
                            </button>
                        </div>
                        <div className="bg-slate-900 border-2 border-purple-500/20 p-8 rounded-4xl space-y-6 shadow-xl">
                            <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                                {temporaryQuests.filter(tq => tq.category === 'special').length === 0 && (
                                    <p className="text-sm text-slate-500 text-center py-4">尚無特殊任務</p>
                                )}
                                {temporaryQuests.filter(tq => tq.category === 'special').map(tq => {
                                    const isEditing = tqEditId === tq.id;
                                    return (
                                    <div key={tq.id} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                                        <div className="flex justify-between items-start gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h4 className="font-bold text-slate-200">{tq.title}</h4>
                                                    <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-lg">+{tq.reward} 修為</span>
                                                    <span className="text-[10px] font-black text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-lg">+{tq.coins ?? Math.floor(tq.reward * 0.1)} 🪙</span>
                                                </div>
                                                {tq.sub && <p className="text-xs text-purple-400 font-bold mt-1">{tq.sub}</p>}
                                                {tq.desc && <p className="text-xs text-slate-500 mt-0.5">{tq.desc}</p>}
                                                {(tq.start_date || tq.end_date) && (
                                                    <p className="text-[10px] text-indigo-400 mt-1">
                                                        {tq.start_date && `${tq.start_date} 起`}{tq.start_date && tq.end_date && ' ~ '}{tq.end_date && `${tq.end_date} 止`}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <button onClick={() => onToggleTempQuest(tq.id, !tq.active)}
                                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${tq.active ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/50' : 'bg-slate-800 text-slate-400'}`}>
                                                    {tq.active ? '🟢 啟用' : '🔴 暫停'}
                                                </button>
                                                <button onClick={() => {
                                                    if (isEditing) { setTqEditId(null); } else {
                                                        setTqEditId(tq.id);
                                                        setTqEditTitle(tq.title);
                                                        setTqEditSub(tq.sub || '');
                                                        setTqEditDesc(tq.desc || '');
                                                        setTqEditReward(String(tq.reward));
                                                        setTqEditCoins(tq.coins !== undefined ? String(tq.coins) : '');
                                                        setTqEditStartDate(tq.start_date || '');
                                                        setTqEditEndDate(tq.end_date || '');
                                                    }
                                                }} className={`p-2 rounded-xl transition-colors ${isEditing ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-800 text-slate-400 hover:text-purple-400'}`}>
                                                    <Pencil size={14} />
                                                </button>
                                                <button onClick={() => { if (confirm(`確定刪除特殊任務「${tq.title}」？`)) onDeleteTempQuest(tq.id); }} className="p-2 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-colors"><X size={14} /></button>
                                            </div>
                                        </div>
                                        {isEditing && (
                                            <div className="border-t border-slate-800 pt-3 space-y-3">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] text-slate-500 font-bold">主標題</label>
                                                    <input value={tqEditTitle} onChange={e => setTqEditTitle(e.target.value)}
                                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-bold outline-none focus:border-purple-500 text-sm" />
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] text-slate-500 font-bold">副標題</label>
                                                        <input value={tqEditSub} onChange={e => setTqEditSub(e.target.value)}
                                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-bold outline-none focus:border-purple-500 text-sm" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] text-slate-500 font-bold">說明</label>
                                                        <input value={tqEditDesc} onChange={e => setTqEditDesc(e.target.value)}
                                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-bold outline-none focus:border-purple-500 text-sm" />
                                                    </div>
                                                </div>
                                                <div className="flex gap-3 items-end">
                                                    <div className="space-y-1 flex-1">
                                                        <label className="text-[10px] text-slate-500 font-bold">修為</label>
                                                        <input type="number" value={tqEditReward} onChange={e => setTqEditReward(e.target.value)}
                                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-bold text-center outline-none focus:border-purple-500 text-sm" />
                                                    </div>
                                                    <div className="space-y-1 flex-1">
                                                        <label className="text-[10px] text-slate-500 font-bold">金幣（空白 = × 10%）</label>
                                                        <input type="number" value={tqEditCoins} onChange={e => setTqEditCoins(e.target.value)}
                                                            placeholder="自動" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-bold text-center outline-none focus:border-purple-500 text-sm" />
                                                    </div>
                                                </div>
                                                <div className="flex gap-3 items-end">
                                                    <div className="space-y-1 flex-1">
                                                        <label className="text-[10px] text-slate-500 font-bold">開始日期</label>
                                                        <input type="date" value={tqEditStartDate} onChange={e => setTqEditStartDate(e.target.value)}
                                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-bold outline-none focus:border-purple-500 text-sm" />
                                                    </div>
                                                    <div className="space-y-1 flex-1">
                                                        <label className="text-[10px] text-slate-500 font-bold">結束日期</label>
                                                        <input type="date" value={tqEditEndDate} onChange={e => setTqEditEndDate(e.target.value)}
                                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-bold outline-none focus:border-purple-500 text-sm" />
                                                    </div>
                                                </div>
                                                <button onClick={async () => {
                                                    const r = parseInt(tqEditReward, 10);
                                                    const c = tqEditCoins.trim() ? parseInt(tqEditCoins, 10) : null;
                                                    if (r > 0) {
                                                        const { createClient } = await import('@supabase/supabase-js');
                                                        const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
                                                        await sb.from('temporaryquests').update({
                                                            title: tqEditTitle, sub: tqEditSub, desc: tqEditDesc, reward: r, coins: c,
                                                            start_date: tqEditStartDate || null,
                                                            end_date: tqEditEndDate || null,
                                                        }).eq('id', tq.id);
                                                        onUpdateTempQuest(tq.id, r, c);
                                                        setTqEditId(null);
                                                    }
                                                }} className="w-full flex items-center justify-center gap-1 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2.5 rounded-xl font-black text-xs transition-colors">
                                                    <Save size={13} /> 儲存
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    );
                                })}
                            </div>
                        </div>
                    </section>

                    {/* ── 動態難度與共業系統 ── */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-2 text-orange-500 font-black text-sm uppercase tracking-widest"><Settings size={16} /> 動態難度與共業系統 (DDA)</div>
                        <div className="bg-slate-900 border-2 border-slate-800 p-8 rounded-4xl space-y-6 shadow-xl text-center">
                            <div className="space-y-2">
                                <p className="text-xs font-black text-slate-500 uppercase tracking-widest">目前共業狀態</p>
                                <p className="text-xl font-bold text-white">{systemSettings.WorldState || 'normal'}</p>
                                <p className="text-xs text-slate-400 mt-2">{systemSettings.WorldStateMsg || '環境保持平衡。'}</p>
                            </div>
                            <button onClick={onTriggerSnapshot} className="w-full bg-blue-600 p-4 rounded-2xl text-white font-black shadow-lg hover:bg-blue-500 transition-colors">🔄 執行每週業力結算 (Weekly Snapshot)</button>
                            <button onClick={onCheckW3Compliance} className="w-full bg-red-700 p-4 rounded-2xl text-white font-black shadow-lg hover:bg-red-600 transition-colors">⚖️ 執行 w3 週罰款結算（未完成者 +NT$200）</button>
                            <button onClick={onAutoDrawAllSquads} className="w-full bg-indigo-600 p-4 rounded-2xl text-white font-black shadow-lg hover:bg-indigo-500 transition-colors">🎲 全服自動抽籤（為未抽小隊代選本週定課）</button>
                        </div>
                    </section>

                </>)}

                {/* ══ 開運大富翁模組 ══ */}
                {adminModule === 'monopoly' && (
                    <div className="p-6 space-y-6">
                        {/* Header */}
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-emerald-600/20 rounded-xl"><Dices size={20} className="text-emerald-400" /></div>
                            <div>
                                <h2 className="text-lg font-black text-white">開運大富翁</h2>
                                <p className="text-xs text-slate-500">大富翁遊戲模組管理</p>
                            </div>
                        </div>

                        {/* 模式開關 */}
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between gap-4">
                            <div>
                                <p className="font-black text-white text-sm">開運大富翁模式</p>
                                <p className="text-xs text-slate-400 mt-0.5">開啟後，玩家登入時將自動跳出遊戲入場彈框</p>
                            </div>
                            <button
                                onClick={() => updateGlobalSetting('BoardGameEnabled', systemSettings.BoardGameEnabled === 'true' ? 'false' : 'true')}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-sm transition-all ${systemSettings.BoardGameEnabled === 'true' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-400'}`}
                            >
                                {systemSettings.BoardGameEnabled === 'true' ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                                {systemSettings.BoardGameEnabled === 'true' ? '已開啟' : '已關閉'}
                            </button>
                        </div>

                        {/* 換匯比率設定 + 人生歸零 — 左右並排 */}
                        <div className="grid grid-cols-2 gap-3">
                            {/* 換匯比率設定 */}
                            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 text-center">
                                <p className="font-black text-white text-sm">換匯比率設定</p>
                                {/* 買匯 */}
                                <div className="space-y-1">
                                    <span className="text-[10px] text-violet-400 font-black block">買匯</span>
                                    <div className="flex items-center justify-center gap-1.5">
                                        <span className="text-slate-400 text-xs shrink-0">1福報＝</span>
                                        <input
                                            type="number" min={1} value={bgBuyRate}
                                            onChange={e => setBgBuyRate(e.target.value)}
                                            className="w-14 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-bold text-sm text-center focus:outline-none focus:border-emerald-500"
                                        />
                                        <span className="text-slate-400 text-xs">現金</span>
                                    </div>
                                </div>
                                {/* 賣匯 */}
                                <div className="space-y-1">
                                    <div className="flex flex-col items-center gap-1">
                                        <span className="text-[10px] text-amber-400 font-black">賣匯</span>
                                        <button
                                            onClick={() => updateGlobalSetting('BoardGameSellEnabled', systemSettings.BoardGameSellEnabled === 'true' ? 'false' : 'true')}
                                            className={`flex items-center gap-1 px-2 py-0.5 rounded-lg font-black text-[10px] transition-all ${systemSettings.BoardGameSellEnabled === 'true' ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-400'}`}
                                        >
                                            {systemSettings.BoardGameSellEnabled === 'true' ? <ToggleRight size={11} /> : <ToggleLeft size={11} />}
                                            {systemSettings.BoardGameSellEnabled === 'true' ? '開放' : '關閉'}
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-center gap-1.5">
                                        <input
                                            type="number" min={1} value={bgSellRate}
                                            onChange={e => setBgSellRate(e.target.value)}
                                            className="w-14 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-bold text-sm text-center focus:outline-none focus:border-emerald-500"
                                        />
                                        <span className="text-slate-400 text-xs">現金＝1福報</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        if (parseInt(bgBuyRate) > 0) updateGlobalSetting('BoardGameBuyRate', bgBuyRate);
                                        if (parseInt(bgSellRate) > 0) updateGlobalSetting('BoardGameSellRate', bgSellRate);
                                        updateGlobalSetting('BoardGameRateUpdatedAt', new Date().toISOString());
                                    }}
                                    className="w-full py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-black text-xs rounded-xl transition-colors"
                                >
                                    儲存比率
                                </button>
                            </div>

                            {/* 人生歸零 */}
                            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 text-center">
                                <div className="flex items-center justify-between">
                                    <p className="font-black text-white text-sm">人生歸零</p>
                                    <button
                                        onClick={() => updateGlobalSetting('BoardGameZeroEnabled', systemSettings.BoardGameZeroEnabled === 'true' ? 'false' : 'true')}
                                        className={`flex items-center gap-1 px-2 py-0.5 rounded-lg font-black text-[10px] transition-all ${systemSettings.BoardGameZeroEnabled === 'true' ? 'bg-red-700 text-white' : 'bg-slate-700 text-slate-400'}`}
                                    >
                                        {systemSettings.BoardGameZeroEnabled === 'true' ? <ToggleRight size={11} /> : <ToggleLeft size={11} />}
                                        {systemSettings.BoardGameZeroEnabled === 'true' ? '開啟' : '關閉'}
                                    </button>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] text-slate-400 block">現金倍率</span>
                                    <div className="flex items-center justify-center gap-1.5">
                                        <span className="text-slate-400 text-xs">×</span>
                                        <input
                                            type="number" min={0} step={0.1} value={bgZeroCash}
                                            onChange={e => setBgZeroCash(e.target.value)}
                                            className="w-14 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-bold text-sm text-center focus:outline-none focus:border-red-500"
                                        />
                                        <span className="text-slate-400 text-xs">倍</span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] text-slate-400 block">福報倍率</span>
                                    <div className="flex items-center justify-center gap-1.5">
                                        <span className="text-slate-400 text-xs">×</span>
                                        <input
                                            type="number" min={0} step={0.1} value={bgZeroBlessing}
                                            onChange={e => setBgZeroBlessing(e.target.value)}
                                            className="w-14 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-bold text-sm text-center focus:outline-none focus:border-red-500"
                                        />
                                        <span className="text-slate-400 text-xs">倍</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        updateGlobalSetting('BoardGameZeroCashMultiplier', bgZeroCash);
                                        updateGlobalSetting('BoardGameZeroBlessingMultiplier', bgZeroBlessing);
                                    }}
                                    className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white font-black text-xs rounded-xl transition-colors"
                                >
                                    儲存倍率
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ══ 參數管理模組 ══ */}
                {adminModule === 'params' && (<>
                    <BasicParamsSection systemSettings={systemSettings} updateGlobalSetting={updateGlobalSetting} />
                    <LevelConfigSection />
                    <DailyQuestConfigSection />
                    <ArtifactConfigSection />
                    <AchievementConfigSection />
                    <RoleConfigSection />
                    <QuestRoleSection />
                    <CardMottoSection />
                </>)}

                {/* ══ 圖片庫模組 ══ */}
                {adminModule === 'gallery' && <ImageGallerySection />}

                {/* 報名名單彈窗（固定，不受模組切換影響）*/}
                {regModalCourse && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in" onClick={() => setRegModalCourse(null)}>
                        <div className="bg-slate-900 border border-slate-700 rounded-4xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between p-6 border-b border-slate-800 shrink-0">
                                <div>
                                    <p className="text-[10px] text-sky-400 font-black uppercase tracking-widest">報名名單</p>
                                    <h3 className="text-lg font-black text-white">{regModalCourse.name}</h3>
                                    <p className="text-xs text-slate-400">{regModalCourse.date_display}・{regModalCourse.time}・{regModalCourse.location}</p>
                                </div>
                                <button onClick={() => setRegModalCourse(null)} className="p-2 bg-slate-800 rounded-xl text-slate-400 hover:text-white"><X size={18} /></button>
                            </div>
                            <div className="px-6 pt-4 pb-3 space-y-3 shrink-0">
                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                    <p className="text-xs font-black text-slate-400">
                                        共 {regList.length} 人報名・{regList.filter(r => r.attended).length} 人已報到
                                        {filteredRegList.length !== regList.length && <span className="text-sky-400 ml-2">（篩選後 {filteredRegList.length} 人）</span>}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        {regListLoading && <p className="text-xs text-sky-400 font-bold">載入中...</p>}
                                        {regList.length > 0 && !regListLoading && (
                                            <button onClick={downloadRegListCsv} className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-black rounded-xl transition-colors">⬇️ 下載 Excel</button>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                    <input type="text" placeholder="搜尋姓名 / 大隊 / 小隊..." value={regFilter}
                                        onChange={e => setRegFilter(e.target.value)}
                                        className="flex-1 min-w-[160px] bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs font-bold outline-none focus:border-sky-500" />
                                    {(['all', 'attended', 'not_attended'] as const).map(v => (
                                        <button key={v} onClick={() => setRegAttendFilter(v)}
                                            className={`px-3 py-2 rounded-xl text-xs font-black transition-colors ${regAttendFilter === v ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                                            {v === 'all' ? '全部' : v === 'attended' ? '✅ 已報到' : '⭕ 未報到'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="overflow-auto flex-1 px-6 pb-6">
                                {regList.length === 0 && !regListLoading ? (
                                    <p className="text-xs text-slate-500 text-center py-8">尚無報名紀錄</p>
                                ) : (
                                    <table className="w-full text-xs min-w-[680px]">
                                        <thead className="sticky top-0 bg-slate-900">
                                            <tr className="border-b border-slate-800">
                                                <th className="text-left px-3 py-2 text-slate-500 font-black w-6">#</th>
                                                {([
                                                    { key: 'teamName', label: '大隊' },
                                                    { key: 'squadName', label: '小隊' },
                                                    { key: 'userName', label: '姓名' },
                                                    { key: 'registeredAt', label: '報名時間' },
                                                    { key: 'attended', label: '報到狀態' },
                                                    { key: 'attendedAt', label: '報到時間' },
                                                ] as { key: RegSortKey; label: string }[]).map(col => (
                                                    <th key={col.key} onClick={() => handleRegSort(col.key)}
                                                        className="text-left px-3 py-2 text-slate-500 font-black cursor-pointer hover:text-white transition-colors select-none">
                                                        {col.label}{regSort.key === col.key && <span className="ml-1 text-sky-400">{regSort.dir === 'asc' ? '↑' : '↓'}</span>}
                                                    </th>
                                                ))}
                                                <th className="text-left px-3 py-2 text-slate-500 font-black">掃碼者</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800">
                                            {filteredRegList.length === 0 ? (
                                                <tr><td colSpan={8} className="text-center py-6 text-slate-500">無符合條件的紀錄</td></tr>
                                            ) : filteredRegList.map((r, i) => (
                                                <tr key={r.userId} className="hover:bg-white/5 transition-colors">
                                                    <td className="px-3 py-3 text-slate-600">{i + 1}</td>
                                                    <td className="px-3 py-3 text-slate-300">{r.teamName}</td>
                                                    <td className="px-3 py-3 text-slate-300">{r.squadName}</td>
                                                    <td className="px-3 py-3 font-bold text-white">{r.userName}</td>
                                                    <td className="px-3 py-3 text-slate-500">{new Date(r.registeredAt).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                                                    <td className="px-3 py-3">
                                                        <span className={`flex items-center gap-1 font-black ${r.attended ? 'text-emerald-400' : 'text-slate-600'}`}>
                                                            {r.attended ? <><CheckCircle size={13} /> 已報到</> : <><Circle size={13} /> 未報到</>}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-3 text-slate-400 font-mono">
                                                        {r.attendedAt
                                                            ? new Date(r.attendedAt).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
                                                            : <span className="text-slate-700">—</span>}
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        {r.checkedInBy
                                                            ? <span className="text-[10px] font-black bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded-lg">
                                                                {r.checkedInBy.startsWith('checkin-') ? `掃碼・${r.checkedInBy.replace('checkin-', '')}` : r.checkedInBy}
                                                              </span>
                                                            : <span className="text-slate-700">—</span>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>
                )}

            </div>
                </div>
            </div>

            {/* ── 課程管理彈窗 ── */}
            {showCourseModal && (
                <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="w-full max-w-lg bg-slate-900 border-2 border-amber-500/30 rounded-4xl shadow-2xl my-4">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                            <p className="font-black text-white text-base">
                                {editingCourseId ? `✏️ 編輯課程：${editingCourseId}` : '➕ 新增課程'}
                            </p>
                            <button onClick={() => { setShowCourseModal(false); setCourseForm(emptyCourseForm); setEditingCourseId(null); }}
                                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors">
                                <X size={16} />
                            </button>
                        </div>
                        <form onSubmit={handleCourseSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <input required placeholder="課程代碼（唯一，如 class_d）" value={courseForm.id} disabled={!!editingCourseId}
                                    onChange={e => setCourseForm(f => ({ ...f, id: e.target.value.trim() }))}
                                    className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold outline-none focus:border-amber-500 disabled:opacity-40" />
                                <input required placeholder="課程名稱（如 課後課）" value={courseForm.name}
                                    onChange={e => setCourseForm(f => ({ ...f, name: e.target.value }))}
                                    className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold outline-none focus:border-amber-500" />
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">日期</label>
                                    <input type="date" required value={courseForm.date} onChange={e => setCourseForm(f => ({ ...f, date: e.target.value }))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold outline-none focus:border-amber-500 [color-scheme:dark]" />
                                    {courseForm.date && <p className="text-[10px] text-amber-400 font-bold px-1">{genDateDisplay(courseForm.date)}</p>}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">時間區間</label>
                                    <div className="flex items-center gap-2">
                                        <input type="time" required value={courseForm.startTime} onChange={e => setCourseForm(f => ({ ...f, startTime: e.target.value }))}
                                            className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold outline-none focus:border-amber-500 [color-scheme:dark]" />
                                        <span className="text-slate-500 font-black">–</span>
                                        <input type="time" value={courseForm.endTime} onChange={e => setCourseForm(f => ({ ...f, endTime: e.target.value }))}
                                            className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold outline-none focus:border-amber-500 [color-scheme:dark]" />
                                    </div>
                                </div>
                                <input required placeholder="地點名稱（如 Ticc 國際會議中心 201室）" value={courseForm.location}
                                    onChange={e => setCourseForm(f => ({ ...f, location: e.target.value }))}
                                    className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold outline-none focus:border-amber-500" />
                                <input placeholder="詳細地址（選填，如 台北市中山區…）" value={courseForm.address}
                                    onChange={e => setCourseForm(f => ({ ...f, address: e.target.value }))}
                                    className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold outline-none focus:border-amber-500" />
                                <input type="number" placeholder="排序（數字越小越前面）" value={courseForm.sort_order}
                                    onChange={e => setCourseForm(f => ({ ...f, sort_order: Number(e.target.value) }))}
                                    className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold outline-none focus:border-amber-500" />
                            </div>
                            <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-4 space-y-3">
                                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">🎁 報到完成獎勵（報名＋掃碼報到後自動發放）</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-emerald-400/70 font-bold">修為獎勵</label>
                                        <input type="number" min={0} value={courseForm.reward_exp}
                                            onChange={e => setCourseForm(f => ({ ...f, reward_exp: e.target.value }))}
                                            className="w-full bg-slate-950 border border-emerald-500/30 rounded-xl p-3 text-white font-bold text-center outline-none focus:border-emerald-500 text-sm" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-emerald-400/70 font-bold">金幣獎勵</label>
                                        <input type="number" min={0} value={courseForm.reward_coins}
                                            onChange={e => setCourseForm(f => ({ ...f, reward_coins: e.target.value }))}
                                            className="w-full bg-slate-950 border border-emerald-500/30 rounded-xl p-3 text-white font-bold text-center outline-none focus:border-yellow-500 text-sm" />
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => { setShowCourseModal(false); setCourseForm(emptyCourseForm); setEditingCourseId(null); }}
                                    className="px-6 py-3 bg-slate-800 text-slate-300 rounded-2xl font-black text-sm">取消</button>
                                <button type="submit" disabled={courseSubmitting}
                                    className="flex-1 bg-amber-600 p-4 rounded-2xl text-white font-black shadow-lg hover:bg-amber-500 transition-colors disabled:opacity-50">
                                    {courseSubmitting ? '儲存中...' : editingCourseId ? '💾 更新課程' : '➕ 新增課程'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── 主線任務排程彈窗 ── */}
            {showMqModal && (
                <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="w-full max-w-lg bg-slate-900 border-2 border-yellow-500/30 rounded-4xl shadow-2xl my-4">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                            <p className="font-black text-white text-base">➕ 新增主線排程</p>
                            <button onClick={() => setShowMqModal(false)}
                                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] text-slate-500 font-bold">主標題（TopicQuestTitle，顯示於主畫面標題）</label>
                                <input value={mqFormEntry.topicTitle} onChange={e => setMqFormEntry(p => ({ ...p, topicTitle: e.target.value }))}
                                    placeholder="例：感恩月·大道至簡" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold outline-none focus:border-yellow-500 text-sm" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] text-slate-500 font-bold">任務名稱（顯示於 UI 的簡短名稱）<span className="text-red-400 ml-1">*</span></label>
                                <input value={mqFormEntry.title} onChange={e => setMqFormEntry(p => ({ ...p, title: e.target.value }))}
                                    placeholder="例：感恩修行實踐" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold outline-none focus:border-yellow-500 text-sm" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] text-slate-500 font-bold">任務說明（詳細描述）</label>
                                <textarea value={mqFormEntry.description} onChange={e => setMqFormEntry(p => ({ ...p, description: e.target.value }))}
                                    placeholder="例：每日對家人說三句感謝的話，記錄於修行日誌。" rows={2}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold outline-none focus:border-yellow-500 text-sm resize-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] text-slate-500 font-bold">修為獎勵</label>
                                    <input type="number" value={mqFormEntry.reward} onChange={e => setMqFormEntry(p => ({ ...p, reward: e.target.value }))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold outline-none focus:border-yellow-500 text-sm text-center" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-slate-500 font-bold">金幣獎勵</label>
                                    <input type="number" value={mqFormEntry.coins} onChange={e => setMqFormEntry(p => ({ ...p, coins: e.target.value }))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold outline-none focus:border-yellow-500 text-sm text-center" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] text-slate-500 font-bold flex items-center gap-1"><Calendar size={10} /> 開始日期（到期自動套用）<span className="text-red-400 ml-1">*</span></label>
                                <input type="date" value={mqFormEntry.startDate} onChange={e => setMqFormEntry(p => ({ ...p, startDate: e.target.value }))}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold outline-none focus:border-yellow-500 text-sm [color-scheme:dark]" />
                            </div>
                            {/* 額外獎勵設定 */}
                            <div className="bg-amber-950/20 border border-amber-500/20 rounded-2xl p-4 space-y-3">
                                <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">🎁 額外獎勵設定（選填）</p>
                                <p className="text-[10px] text-slate-500">若全員達成率（四捨五入）達標，每位達成者額外獲得獎勵。</p>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-amber-400/70 font-bold">達成率門檻 %</label>
                                        <input type="number" min={1} max={100} placeholder="如 80"
                                            value={mqFormEntry.bonusThresholdPct}
                                            onChange={e => setMqFormEntry(p => ({ ...p, bonusThresholdPct: e.target.value }))}
                                            className="w-full bg-slate-950 border border-amber-500/30 rounded-xl p-2.5 text-white font-bold text-center outline-none focus:border-amber-500 text-sm" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-amber-400/70 font-bold">獎勵類型</label>
                                        <select value={mqFormEntry.bonusRewardType}
                                            onChange={e => setMqFormEntry(p => ({ ...p, bonusRewardType: e.target.value as 'coins' | 'exp' }))}
                                            className="w-full bg-slate-950 border border-amber-500/30 rounded-xl p-2.5 text-white font-bold outline-none focus:border-amber-500 text-sm">
                                            <option value="coins">🪙 金幣</option>
                                            <option value="exp">✨ 修為</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-amber-400/70 font-bold">獎勵數量</label>
                                        <input type="number" min={1} placeholder="如 50"
                                            value={mqFormEntry.bonusRewardAmount}
                                            onChange={e => setMqFormEntry(p => ({ ...p, bonusRewardAmount: e.target.value }))}
                                            className="w-full bg-slate-950 border border-amber-500/30 rounded-xl p-2.5 text-white font-bold text-center outline-none focus:border-amber-500 text-sm" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button onClick={() => setShowMqModal(false)}
                                    className="px-6 py-3 bg-slate-800 text-slate-300 rounded-2xl font-black text-sm">取消</button>
                                <button onClick={() => { handleAddMqEntry(); setShowMqModal(false); }}
                                    disabled={!mqFormEntry.title.trim() || !mqFormEntry.startDate}
                                    className="flex-1 flex items-center justify-center gap-2 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-40 text-white p-3 rounded-2xl font-black text-sm shadow-lg transition-colors">
                                    <Plus size={15} /> 加入排程列表
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── 臨時加分任務彈窗 ── */}
            {showTqModal && (
                <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="w-full max-w-lg bg-slate-900 border-2 border-orange-500/30 rounded-4xl shadow-2xl my-4">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                            <p className="font-black text-white text-base">➕ 新增臨時加分任務</p>
                            <button onClick={() => setShowTqModal(false)}
                                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] text-slate-500 font-bold">主標題</label>
                                    <input value={tqFormTitle} onChange={e => setTqFormTitle(e.target.value)}
                                        required placeholder="固定顯示：特殊仙緣任務" className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold outline-none focus:border-orange-500" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-slate-500 font-bold">任務名稱<span className="text-red-400 ml-1">*</span></label>
                                    <input value={tqFormSub} onChange={e => setTqFormSub(e.target.value)}
                                        required placeholder="例：跟父母三道菜" className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold outline-none focus:border-orange-500" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-slate-500 font-bold">任務說明（選填）</label>
                                    <input value={tqFormDesc} onChange={e => setTqFormDesc(e.target.value)}
                                        placeholder="例：面對面或是視訊" className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold outline-none focus:border-orange-500" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] text-slate-500 font-bold">修為</label>
                                    <input type="number" value={tqFormReward} onChange={e => setTqFormReward(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold text-center outline-none focus:border-orange-500" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-slate-500 font-bold">金幣（空白 = × 10%）</label>
                                    <input type="number" value={tqFormCoins} onChange={e => setTqFormCoins(e.target.value)}
                                        placeholder="自動" className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold text-center outline-none focus:border-orange-500" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] text-slate-500 font-bold">開始日期（選填）</label>
                                    <input type="date" value={tqFormStartDate} onChange={e => setTqFormStartDate(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold outline-none focus:border-orange-500" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-slate-500 font-bold">結束日期（選填）</label>
                                    <input type="date" value={tqFormEndDate} onChange={e => setTqFormEndDate(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold outline-none focus:border-orange-500" />
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setShowTqModal(false)}
                                    className="px-6 py-3 bg-slate-800 text-slate-300 rounded-2xl font-black text-sm">取消</button>
                                <button
                                    disabled={!tqFormTitle.trim() || !tqFormSub.trim() || !tqFormReward}
                                    onClick={() => {
                                        const reward = parseInt(tqFormReward, 10);
                                        const coins = tqFormCoins.trim() ? parseInt(tqFormCoins, 10) : undefined;
                                        if (tqFormTitle && tqFormSub && reward) {
                                            onAddTempQuest(tqFormTitle, tqFormSub, tqFormDesc, reward, coins, tqFormStartDate || undefined, tqFormEndDate || undefined);
                                            setShowTqModal(false);
                                        }
                                    }}
                                    className="flex-1 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white p-4 rounded-2xl font-black shadow-lg transition-colors">
                                    ➕ 新增
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── 特殊任務彈窗 ── */}
            {showSpecialModal && (
                <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="w-full max-w-lg bg-slate-900 border-2 border-purple-500/30 rounded-4xl shadow-2xl my-4">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                            <p className="font-black text-white text-base">➕ 新增特殊任務</p>
                            <button onClick={() => setShowSpecialModal(false)} className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"><X size={16} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] text-slate-500 font-bold">主標題</label>
                                    <input value={tqFormTitle} onChange={e => setTqFormTitle(e.target.value)}
                                        required placeholder="任務名稱" className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold outline-none focus:border-purple-500" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-slate-500 font-bold">副標題<span className="text-red-400 ml-1">*</span></label>
                                    <input value={tqFormSub} onChange={e => setTqFormSub(e.target.value)}
                                        required placeholder="例：特殊活動說明" className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold outline-none focus:border-purple-500" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-slate-500 font-bold">任務說明（選填）</label>
                                    <input value={tqFormDesc} onChange={e => setTqFormDesc(e.target.value)}
                                        placeholder="詳細描述" className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold outline-none focus:border-purple-500" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] text-slate-500 font-bold">修為</label>
                                    <input type="number" value={tqFormReward} onChange={e => setTqFormReward(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold text-center outline-none focus:border-purple-500" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-slate-500 font-bold">金幣（空白 = × 10%）</label>
                                    <input type="number" value={tqFormCoins} onChange={e => setTqFormCoins(e.target.value)}
                                        placeholder="自動" className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold text-center outline-none focus:border-purple-500" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] text-slate-500 font-bold">開始日期（選填）</label>
                                    <input type="date" value={tqFormStartDate} onChange={e => setTqFormStartDate(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold outline-none focus:border-purple-500" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-slate-500 font-bold">結束日期（選填）</label>
                                    <input type="date" value={tqFormEndDate} onChange={e => setTqFormEndDate(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold outline-none focus:border-purple-500" />
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setShowSpecialModal(false)}
                                    className="px-6 py-3 bg-slate-800 text-slate-300 rounded-2xl font-black text-sm">取消</button>
                                <button
                                    disabled={!tqFormTitle.trim() || !tqFormSub.trim() || !tqFormReward}
                                    onClick={() => {
                                        const reward = parseInt(tqFormReward, 10);
                                        const coins = tqFormCoins.trim() ? parseInt(tqFormCoins, 10) : undefined;
                                        if (tqFormTitle && tqFormSub && reward) {
                                            onAddTempQuest(tqFormTitle, tqFormSub, tqFormDesc, reward, coins, tqFormStartDate || undefined, tqFormEndDate || undefined, 'special');
                                            setShowSpecialModal(false);
                                        }
                                    }}
                                    className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white p-4 rounded-2xl font-black shadow-lg transition-colors">
                                    ➕ 新增
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── 名冊預覽彈窗 ── */}
            {showRosterPreview && (() => {
                const errorRows = rosterPreviewRows.filter(r => r.phoneError);
                const dupBatchRows = rosterPreviewRows.filter(r => !r.phoneError && r.isDupInBatch);
                const dupDbRows = rosterPreviewRows.filter(r => !r.phoneError && !r.isDupInBatch && r.isDupInDb);
                const okRows = rosterPreviewRows.filter(r => !r.phoneError && !r.isDupInBatch && !r.isDupInDb);
                const importableCount = rosterPreviewRows.filter(r => !r.phoneError).length;
                return (
                    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
                        <div className="w-full max-w-3xl bg-slate-900 border-2 border-orange-500/30 rounded-4xl shadow-2xl my-4">
                            {/* 標題列 */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                                <div>
                                    <p className="font-black text-white text-base">名冊預覽 · 糾錯報告</p>
                                    <p className="text-xs text-slate-400 mt-0.5">共 {rosterPreviewRows.length} 筆</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    {errorRows.length > 0 && (
                                        <span className="text-[11px] font-black text-red-400 bg-red-400/10 px-2 py-1 rounded-lg">{errorRows.length} 格式錯誤</span>
                                    )}
                                    {dupBatchRows.length > 0 && (
                                        <span className="text-[11px] font-black text-orange-400 bg-orange-400/10 px-2 py-1 rounded-lg">{dupBatchRows.length} 批次重複</span>
                                    )}
                                    {dupDbRows.length > 0 && (
                                        <span className="text-[11px] font-black text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded-lg">{dupDbRows.length} 將覆蓋</span>
                                    )}
                                    {okRows.length > 0 && (
                                        <span className="text-[11px] font-black text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-lg">{okRows.length} 正常</span>
                                    )}
                                    <button onClick={() => setShowRosterPreview(false)}
                                        className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors">
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* 圖例 */}
                            <div className="flex flex-wrap gap-3 px-6 py-3 border-b border-white/5 text-[10px] font-black">
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-500/30 border border-red-500/50 inline-block" /> 格式錯誤（匯入時跳過）</span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-orange-500/30 border border-orange-500/50 inline-block" /> 批次內重複（後列覆蓋前列）</span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-yellow-500/20 border border-yellow-500/40 inline-block" /> DB 已存在（覆蓋舊資料）</span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500/20 border border-emerald-500/40 inline-block" /> 正常新增</span>
                            </div>

                            {/* 表格 */}
                            <div className="overflow-x-auto px-2 pb-2">
                                <table className="w-full text-[11px]">
                                    <thead>
                                        <tr className="text-slate-500 font-black uppercase tracking-wider">
                                            <th className="px-3 py-2 text-left">#</th>
                                            <th className="px-3 py-2 text-left">電話</th>
                                            <th className="px-3 py-2 text-left">姓名</th>
                                            <th className="px-3 py-2 text-left">生日</th>
                                            <th className="px-3 py-2 text-left">大隊</th>
                                            <th className="px-3 py-2 text-left">小隊</th>
                                            <th className="px-3 py-2 text-left">職</th>
                                            <th className="px-3 py-2 text-left">狀態</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/60">
                                        {rosterPreviewRows.map((r, i) => {
                                            const rowBg = r.phoneError
                                                ? 'bg-red-950/30'
                                                : r.isDupInBatch
                                                    ? 'bg-orange-950/30'
                                                    : r.isDupInDb
                                                        ? 'bg-yellow-950/20'
                                                        : '';
                                            return (
                                                <tr key={i} className={rowBg}>
                                                    <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                                                    <td className={`px-3 py-2 font-mono ${r.phoneError ? 'text-red-400' : 'text-white'}`}>
                                                        {r.rawPhone}
                                                    </td>
                                                    <td className="px-3 py-2 text-white">{r.name || <span className="text-slate-600">—</span>}</td>
                                                    <td className="px-3 py-2 text-slate-400">{r.birthday || <span className="text-slate-600">—</span>}</td>
                                                    <td className="px-3 py-2 text-slate-300">{r.bigTeam || <span className="text-slate-600">—</span>}</td>
                                                    <td className="px-3 py-2 text-slate-300">{r.littleTeam || <span className="text-slate-600">—</span>}</td>
                                                    <td className="px-3 py-2">
                                                        {r.isCommandant && <span className="text-rose-400 font-black">大</span>}
                                                        {r.isCaptain && <span className="text-amber-400 font-black">小</span>}
                                                        {!r.isCommandant && !r.isCaptain && <span className="text-slate-600">—</span>}
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        {r.phoneError ? (
                                                            <span className="text-red-400 font-black">{r.phoneError}</span>
                                                        ) : r.isDupInBatch ? (
                                                            <span className="text-orange-400 font-black">批次重複</span>
                                                        ) : r.isDupInDb ? (
                                                            <span className="text-yellow-400 font-black">覆蓋</span>
                                                        ) : (
                                                            <span className="text-emerald-400 font-black">新增</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* 底部操作 */}
                            <div className="px-6 py-4 border-t border-white/5 flex flex-col sm:flex-row gap-3 items-center">
                                {errorRows.length > 0 && (
                                    <p className="text-[11px] text-red-400 flex-1">⚠️ {errorRows.length} 筆格式錯誤將自動跳過，其餘 {importableCount} 筆將正常匯入。</p>
                                )}
                                {errorRows.length === 0 && (
                                    <p className="text-[11px] text-slate-400 flex-1">共 {importableCount} 筆資料將匯入，其中 {dupDbRows.length + dupBatchRows.length} 筆覆蓋舊資料。</p>
                                )}
                                <div className="flex gap-3 shrink-0">
                                    <button onClick={() => setShowRosterPreview(false)}
                                        className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-black text-sm rounded-2xl transition-colors">
                                        取消
                                    </button>
                                    <button
                                        disabled={isImporting || importableCount === 0}
                                        onClick={handleImportSubmit.bind(null, { preventDefault: () => {} })}
                                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-sm rounded-2xl transition-colors flex items-center gap-2 shadow-lg shadow-emerald-900/30"
                                    >
                                        {isImporting ? '匯入中…' : `📥 確認匯入 ${importableCount} 筆`}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

        </div>
    );
}
