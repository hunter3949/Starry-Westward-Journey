"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

import {
  AlertTriangle, CheckCircle2, Sparkles,
  Dice5, Loader2, RotateCcw,
  Flame, Store, Trophy, BarChart3, Medal, CalendarDays, Compass, Swords, Mountain, ScrollText, Star
} from 'lucide-react';

import { CharacterStats, DailyLog, Quest, SystemSettings, TopicHistory, TemporaryQuest, W4Application, AdminLog, Testimony, AchievementRecord, Course, MainQuestEntry, PeakTrial, PeakTrialRegistration } from '@/types';
import { getLogicalDateStr, getWeeklyMonday } from '@/lib/utils/time';
import { standardizePhone } from '@/lib/utils/phone';
import { ROLE_CURE_MAP, DEFAULT_CONFIG, ADVENTURE_COST, ADMIN_PASSWORD, calculateLevelFromExp, ROLE_GROWTH_RATES, DEFAULT_QUEST_ROLES, setLevelExpCache } from '@/lib/constants';
const WorldMap = dynamic(() => import('@/components/Map/WorldMap').then(m => ({ default: m.WorldMap })), {
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-64 text-slate-400">載入地圖中...</div>,
});

import { Header } from '@/components/Layout/Header';
import { LoginForm } from '@/components/Login/LoginForm';
import { RegisterForm, evaluateFate } from '@/components/Login/RegisterForm';
import { DailyQuestsTab } from '@/components/Tabs/DailyQuestsTab';
import { WeeklyTopicTab } from '@/components/Tabs/WeeklyTopicTab';
import { StatsTab } from '@/components/Tabs/StatsTab';
import { RankTab } from '@/components/Tabs/RankTab';
import { CaptainTab } from '@/components/Tabs/CaptainTab';
import { CommandantTab } from '@/components/Tabs/CommandantTab';
import { ShopTab } from '@/components/Tabs/ShopTab';
import { AchievementsTab } from '@/components/Tabs/AchievementsTab';
import CourseTab from '@/components/Tabs/CourseTab';
import { PeakTrialTab } from '@/components/Tabs/PeakTrialTab';
import { HistoryTab } from '@/components/Tabs/HistoryTab';
import { AchievementIcon } from '@/components/AchievementIcon';
import { ACHIEVEMENT_MAP, RARITY_STYLE, type AchievementDef } from '@/lib/achievements';
import { getUserAchievements } from '@/app/actions/achievements';
const AdminDashboard = dynamic(() => import('@/components/Admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })), { ssr: false });
const MazeGameComponent = dynamic(() => import('@/components/Game/MazeGame').then(m => ({ default: m.MazeGame })), { ssr: false });
import { processCheckInTransaction } from '@/app/actions/quest';
import { triggerWeeklySnapshot, importRostersData, autoAssignSquadsForTesting, logAdminAction } from '@/app/actions/admin';
import { listCourses, upsertCourse, deleteCourse } from '@/app/actions/course';
import { listPeakTrials, getMyPeakTrialRegistrations } from '@/app/actions/peakTrials';
import { getTestimonies } from '@/app/actions/testimonies_admin';
import { drawWeeklyQuestForSquad, autoDrawAllSquads } from '@/app/actions/team';
import { submitW4Application, reviewW4BySquadLeader, reviewW4ByAdmin, reviewW4ByBattalionLeader, getW4Applications, getAdminActivityLog, deleteAdminLog } from '@/app/actions/w4';
import { generateWeeklyReview, generateCaptainBriefing } from '@/app/actions/gemini';
import { handleChestOpen } from '@/app/actions/map';
import { setMemberQuestRole } from '@/app/actions/fines';
import { getBoardGameStats } from '@/app/actions/boardGame';
import BoardGameView from '@/components/BoardGame/BoardGameView';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

const MessageBox = ({ message, onClose, type = 'info', image }: { message: string, onClose: () => void, type?: 'info' | 'error' | 'success', image?: string }) => (
  <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-sm animate-in fade-in duration-300 mx-auto text-center">
    <div className="bg-slate-900 border-2 border-slate-800 p-8 rounded-[2.5rem] shadow-2xl max-w-sm w-full text-center space-y-6 mx-auto flex flex-col items-center">
      {image ? (
        <img src={image} alt="" className="w-24 h-24 mx-auto object-contain drop-shadow-lg" />
      ) : (
        <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center ${type === 'error' ? 'bg-red-500/20 text-red-500' : type === 'success' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-blue-500/20 text-blue-500'}`}>
          {type === 'error' ? <AlertTriangle size={40} /> : type === 'success' ? <CheckCircle2 size={40} /> : <Sparkles size={40} />}
        </div>
      )}
      <p className="text-xl font-bold text-white leading-relaxed text-center mx-auto">{message}</p>
      <button onClick={onClose} className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white font-black rounded-2xl transition-all active:scale-95 shadow-lg text-center mx-auto">確認領旨</button>
    </div>
  </div>
);

// ── URL 偽路由對照表 ──────────────────────────────────────────────
type TabKey = 'daily' | 'weekly' | 'special' | 'stats' | 'rank' | 'captain' | 'shop' | 'commandant' | 'achievements' | 'course' | 'peakTrial' | 'history' | 'maze';
type ViewKey = 'login' | 'register' | 'app' | 'loading' | 'admin' | 'map';

const TAB_ROUTES: Record<string, TabKey> = {
  '/': 'daily',
  '/dailypractice': 'daily',
  '/mission': 'weekly',
  '/special': 'special',
  '/maze': 'maze',
  '/shop': 'shop',
  '/rank': 'rank',
  '/stats': 'stats',
  '/achievements': 'achievements',
  '/course': 'course',
  '/trial': 'peakTrial',
  '/history': 'history',
  '/captain': 'captain',
  '/commandant': 'commandant',
};

const TAB_TO_PATH: Record<TabKey, string> = {
  daily: '/',
  weekly: '/mission',
  special: '/special',
  maze: '/maze',
  shop: '/shop',
  rank: '/rank',
  stats: '/stats',
  achievements: '/achievements',
  course: '/course',
  peakTrial: '/trial',
  history: '/history',
  captain: '/captain',
  commandant: '/commandant',
};

const VIEW_ROUTES: Record<string, ViewKey> = {
  '/admin': 'admin',
  '/map': 'map',
  '/login': 'login',
  '/register': 'register',
};

function getInitialState(): { view: ViewKey; tab: TabKey } {
  if (typeof window === 'undefined') return { view: 'loading', tab: 'daily' };
  const path = window.location.pathname;
  if (path.startsWith('/admin')) return { view: 'admin', tab: 'daily' };
  if (VIEW_ROUTES[path]) return { view: VIEW_ROUTES[path], tab: 'daily' };
  if (TAB_ROUTES[path]) return { view: 'loading', tab: TAB_ROUTES[path] };
  return { view: 'loading', tab: 'daily' };
}

export default function App() {
  const initialState = getInitialState();
  const [view, setView] = useState<ViewKey>(initialState.view);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lineBannerDismissed, setLineBannerDismissed] = useState(false);
  const [activeTab, _setActiveTab] = useState<TabKey>(initialState.tab);

  // URL 同步：切換 Tab/View 時更新瀏覽器網址
  const setActiveTab = useCallback((tab: TabKey) => {
    _setActiveTab(tab);
    const path = TAB_TO_PATH[tab] || '/';
    if (window.location.pathname !== path) {
      window.history.pushState({ tab, view: 'app' }, '', path);
    }
  }, []);

  const setViewWithUrl = useCallback((v: ViewKey) => {
    setView(v);
    if (v === 'admin') {
      window.history.pushState({ view: 'admin' }, '', '/admin');
    } else if (v === 'map') {
      window.history.pushState({ view: 'map' }, '', '/map');
    } else if (v === 'login') {
      window.history.pushState({ view: 'login' }, '', '/login');
    }
  }, []);

  // 監聽瀏覽器上下頁
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const state = e.state;
      if (state?.view === 'admin') { setView('admin'); return; }
      if (state?.view === 'map') { setView('map'); return; }
      // 回到前台
      const path = window.location.pathname;
      const tab = TAB_ROUTES[path];
      if (tab) { setView('app'); _setActiveTab(tab); }
      else { setView('app'); _setActiveTab('daily'); }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  type GmViewMode = 'all' | 'player' | 'captain' | 'commandant';
  const [gmViewMode, setGmViewMode] = useState<GmViewMode>('all');
  const [userData, setUserData] = useState<CharacterStats | null>(null);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [leaderboard, setLeaderboard] = useState<CharacterStats[]>([]);
  const [topicHistory, setTopicHistory] = useState<TopicHistory[]>([]);
  const [temporaryQuests, setTemporaryQuests] = useState<TemporaryQuest[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({ TopicQuestTitle: '載入中...' });
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [modalMessage, setModalMessage] = useState<{ text: string, type: 'info' | 'error' | 'success', image?: string } | null>(null);
  const [boardGameEntered, setBoardGameEntered] = useState(false);
  const [boardGameStats, setBoardGameStats] = useState<{ cash: number; blessing: number }>({ cash: 0, blessing: 0 });
  const [undoTarget, setUndoTarget] = useState<Quest | null>(null);
  const [adminAuth, setAdminAuth] = useState(false);
  const [adminOperator, setAdminOperator] = useState<string>('');

  // 字體大小設定（存 localStorage，套用於 <html>）
  const FONT_SIZES = [100, 112, 125, 140] as const;
  type FontSizeValue = typeof FONT_SIZES[number];
  const [fontSize, setFontSizeState] = useState<FontSizeValue>(100);
  useEffect(() => {
    const saved = parseInt(localStorage.getItem('font_size_pref') || '100', 10);
    const valid = FONT_SIZES.includes(saved as FontSizeValue) ? saved as FontSizeValue : 100;
    setFontSizeState(valid);
    document.documentElement.style.fontSize = `${valid}%`;
    // 載入主題設定
    const theme = localStorage.getItem('theme');
    if (theme === 'light') document.documentElement.classList.add('light');
    else document.documentElement.classList.remove('light');
  }, []);
  const setFontSize = (size: FontSizeValue) => {
    setFontSizeState(size);
    localStorage.setItem('font_size_pref', String(size));
    document.documentElement.style.fontSize = `${size}%`;
  };
  const [mapData, setMapData] = useState<Record<string, string>>({});
  const [mapEntities, setMapEntities] = useState<any[]>([]);
  const [teamSettings, setTeamSettings] = useState<any>(null);
  const [battalionDisplayName, setBattalionDisplayName] = useState<string | undefined>(undefined);
  interface BattalionSquadMember { userId: string; name: string; level: number; role: string | null; isCaptain: boolean; lastCheckIn?: string | null; hp?: number | null; maxHp?: number | null; exp?: number | null; }
  interface BattalionSquad { squadName: string; members: BattalionSquadMember[]; }
  const [battalionSquads, setBattalionSquads] = useState<BattalionSquad[]>([]);
  const [teamMemberCount, setTeamMemberCount] = useState<number>(1);
  const [corridorL, setCorridorL] = useState<number>(DEFAULT_CONFIG.CORRIDOR_L);
  const [corridorW, setCorridorW] = useState<number>(DEFAULT_CONFIG.CORRIDOR_W);

  // States for Five Fortunes tie breaking
  const [tieBreakData, setTieBreakData] = useState<any>(null);
  // 首次登入補填問卷（後台匯入用戶無 Role）
  const [showFortuneOverlay, setShowFortuneOverlay] = useState(false);
  const [fortuneForm, setFortuneForm] = useState<Record<string, number>>({ wealth: 5, relationship: 5, family: 5, career: 5, health: 5 });

  // Map state
  const [stepsRemaining, setStepsRemaining] = useState(0);
  const [moveMultiplier, setMoveMultiplier] = useState(1);
  const [isRolling, setIsRolling] = useState(false);
  const [w4Applications, setW4Applications] = useState<W4Application[]>([]);
  const [pendingW4Apps, setPendingW4Apps] = useState<W4Application[]>([]);

  // AI features state
  const [weeklyReview, setWeeklyReview] = useState<import('@/types').WeeklyReview | null>(null);
  const [isLoadingReview, setIsLoadingReview] = useState(false);
  const [aiBriefing, setAiBriefing] = useState<import('@/types').CaptainBriefing | null>(null);
  const [isLoadingBriefing, setIsLoadingBriefing] = useState(false);
  const [squadApprovedW4Apps, setSquadApprovedW4Apps] = useState<W4Application[]>([]);
  const [adminLogs, setAdminLogs] = useState<AdminLog[]>([]);
  const [testimonies, setTestimonies] = useState<Testimony[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [peakTrials, setPeakTrials] = useState<PeakTrial[]>([]);
  const [myPeakTrialRegs, setMyPeakTrialRegs] = useState<PeakTrialRegistration[]>([]);

  interface SquadMemberWithRole { userId: string; name: string; questRoles: string[]; }
  const [squadMembersWithRoles, setSquadMembersWithRoles] = useState<SquadMemberWithRole[]>([]);
  interface QuestRoleDef { id: string; name: string; duties: string[] }
  const [questRoleDefs, setQuestRoleDefs] = useState<QuestRoleDef[]>([]);
  const [userAchievements, setUserAchievements] = useState<AchievementRecord[]>([]);
  const [achievementQueue, setAchievementQueue] = useState<AchievementDef[]>([]);

  const showCaptainTab = userData?.IsGM
    ? (gmViewMode === 'all' || gmViewMode === 'captain')
    : !!userData?.IsCaptain;
  const showCommandantTab = userData?.IsGM
    ? (gmViewMode === 'all' || gmViewMode === 'commandant')
    : !!userData?.IsCommandant;

  const formatCheckInTime = (timestamp: string) => {
    const d = new Date(timestamp);
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const logicalTodayStr = getLogicalDateStr();
  const currentWeeklyMonday = useMemo(() => getWeeklyMonday(), []);


  const isTopicDone = useMemo(() =>
    logs.some(l => l.QuestID === 't1' && new Date(l.Timestamp) >= currentWeeklyMonday),
    [logs, currentWeeklyMonday]
  );

  // 開運大富翁：載入玩家貨幣資料
  useEffect(() => {
    if (!userData?.UserID || systemSettings.BoardGameEnabled !== 'true') return;
    getBoardGameStats(userData.UserID).then(stats => setBoardGameStats(stats)).catch(() => {});
  }, [userData?.UserID, systemSettings.BoardGameEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // 主線任務排程自動切換：當排程中有 startDate <= 今天且尚未套用的項目，自動更新
  useEffect(() => {
    if (!systemSettings.MainQuestSchedule) return;
    let schedule: MainQuestEntry[] = [];
    try { schedule = JSON.parse(systemSettings.MainQuestSchedule); } catch { return; }
    if (schedule.length === 0) return;
    const today = getLogicalDateStr(new Date());
    const due = [...schedule]
      .filter(e => e.startDate <= today)
      .sort((a, b) => b.startDate.localeCompare(a.startDate))[0];
    if (!due) return;
    if (due.id === systemSettings.MainQuestAppliedId) return;
    updateGlobalSettings({
      TopicQuestTitle: due.topicTitle || due.title,
      TopicQuestReward: String(due.reward),
      TopicQuestCoins: String(due.coins),
      TopicQuestDescription: due.description || '',
      MainQuestAppliedId: due.id,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [systemSettings.MainQuestSchedule, systemSettings.MainQuestAppliedId]);

  const roleTrait = useMemo(() => {
    if (!userData) return null;
    const info = ROLE_CURE_MAP[userData.Role];
    if (!info) return null;
    const isCuredToday = logs.some(l => l.QuestID === info.cureTaskId && getLogicalDateStr(l.Timestamp) === logicalTodayStr);
    return { ...info, isCursed: !isCuredToday };
  }, [userData, logs, logicalTodayStr]);

  const todayCompletedQuestIds = useMemo(() => {
    return logs.filter(l => getLogicalDateStr(l.Timestamp) === logicalTodayStr).map(l => l.QuestID);
  }, [logs, logicalTodayStr]);

  const handleAdminAuth = async (e: { preventDefault: () => void; currentTarget: HTMLFormElement }) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const pwd = fd.get('password');
    const isGmLogin = pwd === userData?.UserID?.slice(-3);
    const isDirectLogin = !userData?.IsGM && pwd === ADMIN_PASSWORD;
    if (isGmLogin || isDirectLogin) {
      setAdminOperator(isGmLogin ? (userData?.Name || 'GM') : '最高管理員');
      setAdminAuth(true);
      // Fetch admin data on auth
      const [w4Res, logsRes] = await Promise.all([
        getW4Applications({ status: 'battalion_approved' }),
        getAdminActivityLog(30),
      ]);
      if (w4Res.success) setSquadApprovedW4Apps(w4Res.applications);
      if (logsRes.success) setAdminLogs(logsRes.logs as AdminLog[]);
    } else {
      setModalMessage({ text: "密令錯誤，大會禁地不可擅闖。", type: 'error' });
    }
  };

  const handleTriggerSnapshot = async () => {
    if (!confirm("確定要執行『每週業力結算』(Weekly Snapshot)？\n這將重新計算所有活躍使用者的完成率，並變更全服動態難度 (WorldState)。")) return;
    setIsSyncing(true);
    try {
      const res = await triggerWeeklySnapshot(adminOperator);
      if (res.success) {
        setSystemSettings(prev => ({
          ...prev,
          WorldState: res.worldState,
          WorldStateMsg: res.message
        }));
        setModalMessage({ text: `結算完成！目前的共業狀態為：${res.message}`, type: 'success' });
      } else {
        setModalMessage({ text: "結算失敗: " + res.error, type: 'error' });
      }
    } catch (e: any) {
      setModalMessage({ text: "系統異常：" + e.message, type: 'error' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleImportRoster = async (csvData: string) => {
    setIsSyncing(true);
    try {
      const res = await importRostersData(csvData, adminOperator);
      if (res.success) {
        setModalMessage({ text: `成功匯入！共新增/更新了 ${res.count} 筆名冊資料。`, type: 'success' });
      } else {
        setModalMessage({ text: `匯入失敗：${res.error}`, type: 'error' });
      }
    } catch (err: any) {
      setModalMessage({ text: `系統異常：${err.message}`, type: 'error' });
    } finally {
      setIsSyncing(false);
    }
  };



  const handleDrawWeeklyQuest = async () => {
    if (!userData?.LittleTeamLeagelName || !userData.IsCaptain) return;
    setIsSyncing(true);
    try {
      const res = await drawWeeklyQuestForSquad(userData.LittleTeamLeagelName, userData.UserID);
      if (res.success) {
        setTeamSettings((prev: any) => ({
          ...prev,
          mandatory_quest_id: res.questId,
          mandatory_quest_week: res.weekLabel,
          quest_draw_history: [...(prev?.quest_draw_history || []), res.questId],
        }));
        setModalMessage({ text: `本週推薦定課已抽出：「${res.questName}」`, type: 'success' });
      } else {
        setModalMessage({ text: res.error || '抽籤失敗', type: 'error' });
      }
    } catch (e: any) {
      setModalMessage({ text: '系統異常：' + e.message, type: 'error' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleOpenWeeklyTab = async () => {
    setActiveTab('weekly');
    if (!userData?.UserID || weeklyReview !== null || isLoadingReview) return;
    setIsLoadingReview(true);
    try {
      const res = await generateWeeklyReview(userData.UserID);
      if (res.success && res.review) setWeeklyReview(res.review);
    } catch (_) { /* non-critical, silently skip */ } finally {
      setIsLoadingReview(false);
    }
  };

  const handleOpenCaptainTab = () => {
    setActiveTab('captain');
  };

  const handleGetAIBriefing = async () => {
    if (!userData?.UserID || !userData.IsCaptain) return;
    setIsLoadingBriefing(true);
    try {
      const res = await generateCaptainBriefing(userData.UserID);
      if (res.success && res.briefing) {
        setAiBriefing(res.briefing);
      } else {
        setModalMessage({ text: res.error || 'AI 分析失敗，請稍後再試', type: 'error' });
      }
    } catch (e: any) {
      setModalMessage({ text: '系統異常：' + e.message, type: 'error' });
    } finally {
      setIsLoadingBriefing(false);
    }
  };

  const handleAutoAssignSquads = async () => {
    if (!confirm("確定要將所有玩家隨機分配大隊 / 小隊？（每隊 4 人，3 隊一大隊，會覆蓋現有編組）")) return;
    setIsSyncing(true);
    try {
      const res = await autoAssignSquadsForTesting();
      if (res.success) {
        setModalMessage({ text: `分配完成！共 ${res.totalPlayers} 位玩家，${res.squadCount} 支小隊，${res.battalionCount} 個大隊。`, type: 'success' });
      } else {
        setModalMessage({ text: '分配失敗：' + res.error, type: 'error' });
      }
    } catch (e: any) {
      setModalMessage({ text: '系統異常：' + e.message, type: 'error' });
    } finally {
      setIsSyncing(false);
    }
  };

  const parseQuestRoles = (qr: string | null): string[] => {
    if (!qr) return [];
    try { const p = JSON.parse(qr); return Array.isArray(p) ? p : [String(qr)]; } catch { return [String(qr)]; }
  };

  const loadSquadMembers = async (squadName: string) => {
    const { data } = await supabase
      .from('CharacterStats')
      .select('UserID, Name, QuestRole')
      .eq('LittleTeamLeagelName', squadName)
      .order('Name');
    if (data && data.length > 0) {
      setSquadMembersWithRoles(data.map((r: any) => ({ userId: r.UserID, name: r.Name, questRoles: parseQuestRoles(r.QuestRole) })));
    }
  };


  const handleSetQuestRole = async (targetUserId: string, roleId: string, action: 'assign' | 'unassign') => {
    if (!userData?.UserID || !userData.LittleTeamLeagelName) return;
    const res = await setMemberQuestRole(userData.UserID, targetUserId, roleId, action);
    if (res.success) {
      await loadSquadMembers(userData.LittleTeamLeagelName);
    } else {
      setModalMessage({ text: res.error || '設定失敗', type: 'error' });
    }
  };


  const loadBattalionSquads = async () => {
    if (!userData?.UserID) return;
    const battalionName = userData.BigTeamLeagelName;
    if (!battalionName) return;

    const { data, error } = await supabase
      .from('CharacterStats')
      .select('UserID, Name, Level, Exp, QuestRole, LittleTeamLeagelName, IsCaptain, LastCheckIn, HP, MaxHP')
      .eq('BigTeamLeagelName', battalionName);

    if (error || !data || data.length === 0) return;

    const squadMap = new Map<string, BattalionSquadMember[]>();
    for (const r of data) {
      const sq = r.LittleTeamLeagelName || '（未分隊）';
      if (!squadMap.has(sq)) squadMap.set(sq, []);
      squadMap.get(sq)!.push({ userId: r.UserID, name: r.Name, level: r.Level || 1, exp: r.Exp ?? null, role: r.QuestRole || null, isCaptain: !!r.IsCaptain, lastCheckIn: r.LastCheckIn ?? null, hp: r.HP ?? null, maxHp: r.MaxHP ?? null });
    }
    setBattalionSquads(Array.from(squadMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([squadName, members]) => ({ squadName, members: members.sort((a, b) => a.name.localeCompare(b.name)) })));
  };

  const handleAutoDrawAllSquads = async () => {
    if (!confirm("確定要為所有本週尚未抽籤的小隊自動抽選推薦定課？")) return;
    setIsSyncing(true);
    try {
      const res = await autoDrawAllSquads();
      if (res.success) {
        const summary = res.drawn?.map((d: { squadName: string; questName: string }) => `${d.squadName}→${d.questName}`).join('、') || '（無）';
        setModalMessage({ text: `自動抽籤完成！${res.drawnCount} 個小隊已抽選，${res.skippedCount} 個已跳過。\n${summary}`, type: 'success' });
      } else {
        setModalMessage({ text: '自動抽籤失敗：' + res.error, type: 'error' });
      }
    } catch (e: any) {
      setModalMessage({ text: '系統異常：' + e.message, type: 'error' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleEntityTrigger = async (entity: any) => {
    // Optimistic UI Removal
    setMapEntities(prev => prev.filter(e => e.id !== entity.id));

    setIsSyncing(true);
    try {
      if (entity.type === 'portal') {
        if (entity.id) await supabase.from('MapEntities').delete().eq('id', entity.id);
        // Validation already happened in WorldMap.tsx
        setModalMessage({
          text: `✨ 【歸心陣】\n\n業力清淨，陣法啟動！即將傳送回本心草原...`,
          type: 'success'
        });
        // Wait a tiny bit then jump
        setTimeout(() => {
          handleMoveCharacter(0, 0, 0, 'center', 0);
        }, 1500);
      } else if (entity.type === 'chest') {
        // handleChestOpen handles DB deletion internally
        if (!userData) throw new Error('用戶資料未載入');
        const result = await handleChestOpen(userData.UserID, entity.id);
        setUserData(prev => prev ? { ...prev, EnergyDice: (prev.EnergyDice || 0) + result.lootDice } : prev);
        setModalMessage({ text: result.message, type: result.isMimic && !result.lootDice ? 'error' : 'success' });
      } else if (entity.type !== 'monster') {
        if (entity.id) await supabase.from('MapEntities').delete().eq('id', entity.id);
        setModalMessage({
          text: `🎁 你發現了【${entity.name}】！\n「在這漫漫修行路上，天道給予了一份小驚喜。」\n(已自動拾取)`,
          type: 'success'
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSyncing(false);
    }
  };

  const updateGlobalSetting = async (key: string, value: string) => {
    setIsSyncing(true);
    try {
      const { error } = await supabase.from('SystemSettings').upsert({ SettingName: key, Value: value }, { onConflict: 'SettingName' });
      if (error) throw error;
      setSystemSettings(prev => ({ ...prev, [key]: value }));

      if (key === 'TopicQuestTitle') {
        const { data: newHistory, error: historyErr } = await supabase.from('TopicHistory').insert([{ TopicTitle: value }]).select();
        if (!historyErr && newHistory) {
          setTopicHistory(prev => [newHistory[0] as TopicHistory, ...prev]);
        }
      }

      setModalMessage({ text: "設定已同步雲端，諸位修行者將即時感應。", type: 'success' });
    } catch (err) {
      setModalMessage({ text: "同步失敗，法陣連線異常。", type: 'error' });
    } finally {
      setIsSyncing(false);
    }
  };

  // 批次更新多個 SystemSettings（主線任務用）
  const updateGlobalSettings = async (updates: Record<string, string>) => {
    setIsSyncing(true);
    try {
      const results = await Promise.all(
        Object.entries(updates).map(([key, value]) =>
          supabase.from('SystemSettings').upsert({ SettingName: key, Value: value }, { onConflict: 'SettingName' })
        )
      );
      if (results.some(r => r.error)) throw new Error('部分儲存失敗');
      setSystemSettings(prev => ({ ...prev, ...updates }));

      if ('TopicQuestTitle' in updates) {
        const { data: newHistory } = await supabase.from('TopicHistory').insert([{ TopicTitle: updates.TopicQuestTitle }]).select();
        if (newHistory) setTopicHistory(prev => [newHistory[0] as TopicHistory, ...prev]);
      }

      setModalMessage({ text: "設定已同步雲端，諸位修行者將即時感應。", type: 'success' });
    } catch {
      setModalMessage({ text: "同步失敗，法陣連線異常。", type: 'error' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddTempQuest = async (title: string, sub: string, desc: string, reward: number, coins?: number, startDate?: string, endDate?: string, category: 'temp' | 'special' = 'temp') => {
    setIsSyncing(true);
    try {
      const id = `${category === 'special' ? 'special' : 'temp'}_${Date.now()}`;
      const dbRow = { id, title, sub, desc, reward, coins: coins ?? null, limit: 1, active: true, start_date: startDate ?? null, end_date: endDate ?? null, category };
      const { error } = await supabase.from('temporaryquests').insert([dbRow]);
      if (error) throw error;
      const newQuest: TemporaryQuest = { id, title, sub, desc, reward, coins, limit: 1, active: true, start_date: startDate, end_date: endDate, category };
      setTemporaryQuests(prev => [newQuest, ...prev]);
      await logAdminAction(category === 'special' ? 'special_quest_add' : 'temp_quest_add', adminOperator, id, title, { reward, coins, startDate, endDate });
    } catch (err) {
      console.error(err);
      setModalMessage({ text: "新增臨時任務失敗。", type: 'error' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateTempQuest = async (id: string, reward: number, coins: number | null) => {
    setIsSyncing(true);
    try {
      const { error } = await supabase.from('temporaryquests').update({ reward, coins: coins ?? null }).eq('id', id);
      if (error) throw error;
      setTemporaryQuests(prev => prev.map(q => q.id === id ? { ...q, reward, coins: coins ?? undefined } : q));
      await logAdminAction('temp_quest_update', adminOperator, id, undefined, { reward, coins });
    } catch (err) {
      setModalMessage({ text: "更新臨時任務失敗。", type: 'error' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleToggleTempQuest = async (id: string, active: boolean) => {
    setIsSyncing(true);
    try {
      const { error } = await supabase.from('temporaryquests').update({ active }).eq('id', id);
      if (error) throw error;
      setTemporaryQuests(prev => prev.map(q => q.id === id ? { ...q, active } : q));
      await logAdminAction('temp_quest_toggle', adminOperator, id, undefined, { active });
    } catch (err) {
      setModalMessage({ text: "更新臨時任務狀態失敗。", type: 'error' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteTempQuest = async (id: string) => {
    if (!confirm("確定要刪除此臨時任務嗎？刪除後無法恢復。")) return;
    setIsSyncing(true);
    try {
      const { error } = await supabase.from('temporaryquests').delete().eq('id', id);
      if (error) throw error;
      setTemporaryQuests(prev => prev.filter(q => q.id !== id));
      await logAdminAction('temp_quest_delete', adminOperator, id);
    } catch (err) {
      setModalMessage({ text: "刪除臨時任務失敗。", type: 'error' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpsertCourse = async (course: Course) => {
    const res = await upsertCourse(course);
    if (!res.success) { setModalMessage({ text: `課程儲存失敗：${res.error}`, type: 'error' }); return; }
    setCourses(await listCourses());
  };

  const handleDeleteCourse = async (id: string) => {
    if (!confirm(`確定要刪除課程「${id}」嗎？相關報名紀錄也會一併刪除。`)) return;
    const res = await deleteCourse(id);
    if (!res.success) { setModalMessage({ text: `刪除課程失敗：${res.error}`, type: 'error' }); return; }
    setCourses(prev => prev.filter(c => c.id !== id));
  };

  const handleUpdateMemberAssignment = async (userId: string, teamName: string, squadName: string, isCaptain: boolean, isCommandant: boolean, isGM: boolean) => {
    const { updateMemberAssignment } = await import('@/app/actions/admin');
    const res = await updateMemberAssignment(userId, teamName, squadName, isCaptain, isCommandant, isGM);
    if (!res.success) { setModalMessage({ text: `更新失敗：${res.error}`, type: 'error' }); return; }
    // 刷新 leaderboard
    const { data } = await supabase.from('CharacterStats').select('*').order('Exp', { ascending: false });
    if (data) setLeaderboard(data as CharacterStats[]);
  };

  const handleSubmitW4 = async (data: { interviewTarget: string; interviewDate: string; description: string }) => {
    if (!userData) return;
    const res = await submitW4Application(
      userData.UserID, userData.Name,
      userData.LittleTeamLeagelName || null, userData.BigTeamLeagelName || null,
      data.interviewTarget, data.interviewDate, data.description
    );
    if (res.success && res.application) {
      setW4Applications(prev => [res.application as W4Application, ...prev]);
      const msg = res.initialStatus === 'battalion_approved'
        ? '傳愛申請已提交，已略過初審，直接進入管理員終審。'
        : res.initialStatus === 'squad_approved'
        ? '傳愛申請已提交，已略過小隊長初審，待大隊長二審。'
        : '傳愛申請已提交，待小隊長初審。';
      setModalMessage({ text: msg, type: 'success' });
    } else {
      setModalMessage({ text: res.error || '提交失敗', type: 'error' });
    }
  };

  const handleReviewW4BySquad = async (appId: string, approve: boolean, notes: string) => {
    if (!userData) return;
    const res = await reviewW4BySquadLeader(appId, userData.UserID, approve, notes);
    if (res.success) {
      setPendingW4Apps(prev => prev.filter(a => a.id !== appId));
      setModalMessage({ text: approve ? '初審通過！' : '已駁回申請。', type: approve ? 'success' : 'info' });
    } else {
      setModalMessage({ text: res.error || '審核失敗', type: 'error' });
    }
  };

  const handleFinalReviewW4 = async (appId: string, approve: boolean, notes: string) => {
    const res = await reviewW4ByAdmin(appId, approve ? 'approve' : 'reject', notes);
    if (res.success) {
      setSquadApprovedW4Apps(prev => prev.filter(a => a.id !== appId));
      setModalMessage({ text: approve ? '已核准入帳！修為已發放。' : '已駁回申請。', type: approve ? 'success' : 'info' });
      // Refresh admin logs
      const logsRes = await getAdminActivityLog(30);
      if (logsRes.success) setAdminLogs(logsRes.logs as AdminLog[]);
    } else {
      setModalMessage({ text: (res as any).error || '審核失敗', type: 'error' });
    }
  };

  const handleDeleteAdminLog = async (id: string) => {
    await deleteAdminLog(id);
    setAdminLogs(prev => prev.filter(l => l.id !== id));
  };

  const [showGoldenDicePicker, setShowGoldenDicePicker] = useState(false);

  const handleRollDice = (amount: number = 1) => {
    if (!userData || isRolling || stepsRemaining > 0) return;

    // Golden Dice Flow triggers number picker
    if (amount === -1) {
      if ((userData.GoldenDice || 0) < 1) {
        setModalMessage({ text: "萬能奇蹟骰不足！", type: 'error' });
        return;
      }
      setShowGoldenDicePicker(true);
      return;
    }


    if (userData.EnergyDice < amount) {
      setModalMessage({ text: "能量骰子不足！", type: 'error' });
      return;
    }
    setIsRolling(true);
    const newDiceCount = userData.EnergyDice - amount;

    // Fire DB write IMMEDIATELY (not inside setTimeout) so a page refresh can't cancel it
    const dbWrite = supabase
      .from('CharacterStats')
      .update({ EnergyDice: newDiceCount })
      .eq('UserID', userData.UserID);

    setTimeout(async () => {
      const { error } = await dbWrite;
      if (error) {
        setIsRolling(false);
        setModalMessage({ text: '骰子扣除失敗，請重試。', type: 'error' });
        return;
      }

      let roll = 0;
      for (let i = 0; i < amount; i++) {
        roll += Math.floor(Math.random() * 6) + 1;
      }
      if (userData.Role === '白龍馬') roll += 2 * amount;
      if (userData.Role === '唐三藏' && roleTrait?.isCursed) roll = Math.max(1, Math.floor(roll / 2));

      // Apply multiplier
      roll = roll * moveMultiplier;

      setStepsRemaining(roll);
      setMoveMultiplier(1); // Reset after single use
      setIsRolling(false);
      // Use functional update to avoid overwriting concurrent state changes (e.g. combat dice rewards)
      setUserData(prev => prev ? { ...prev, EnergyDice: newDiceCount } : null);
      setModalMessage({ text: `修行法輪轉動完成！獲得步數：${roll}`, type: 'success' });
    }, 800);
  };

  const handleExecuteGoldenDice = async (steps: number) => {
    if (!userData || (userData.GoldenDice || 0) < 1) return;

    setShowGoldenDicePicker(false);
    setIsRolling(true);
    const newGoldenCount = (userData.GoldenDice || 0) - 1;

    // Fire DB write immediately before the animation delay
    const dbWrite = supabase
      .from('CharacterStats')
      .update({ GoldenDice: newGoldenCount })
      .eq('UserID', userData.UserID);

    setTimeout(async () => {
      const { error } = await dbWrite;
      if (error) {
        setIsRolling(false);
        setModalMessage({ text: '萬能奇蹟骰扣除失敗，請重試。', type: 'error' });
        return;
      }
      setStepsRemaining(steps);
      setUserData(prev => prev ? { ...prev, GoldenDice: newGoldenCount } : null);
      setIsRolling(false);
      setModalMessage({ text: `萬能奇蹟骰已發動！精準鎖定 ${steps} 步！`, type: 'success' });
    }, 800);
  };

  const handleMoveCharacter = async (q: number, r: number, dist: number, zoneId?: string, newFacing?: number) => {
    if (!userData) return;
    setIsSyncing(true);
    try {
      let finalQ = q;
      let finalR = r;
      let remaining = Math.max(0, stepsRemaining - dist);
      let penaltyText = "";
      let finalFacing = newFacing ?? userData.Facing ?? 0;

      // 貪區 (慾望泥沼): 強制滯留，行動力歸零
      if (zoneId === 'greed' && !todayCompletedQuestIds.includes('q6') && !todayCompletedQuestIds.includes('q7')) {
        remaining = 0;
        penaltyText = "你陷入了慾望泥沼，本回合行動力歸零！";
      }

      if (zoneId === 'anger' && !todayCompletedQuestIds.includes('q1') && !todayCompletedQuestIds.includes('q2')) {
        penaltyText = penaltyText ? penaltyText + " 且遭到焦熱熔岩灼傷，業力增加！" : "遭到焦熱熔岩灼傷，業力增加！";
      }

      // 痴區 (虛妄流沙): 回合結束且停留在該處時，發生隨機位移
      if (remaining === 0 && zoneId === 'delusion' && !todayCompletedQuestIds.includes('q4')) {
        const drift = [
          { q: 1, r: -1 }, { q: 1, r: 0 }, { q: 0, r: 1 },
          { q: -1, r: 1 }, { q: -1, r: 0 }, { q: 0, r: -1 }
        ];
        const rand = drift[Math.floor(Math.random() * drift.length)];
        finalQ += rand.q;
        finalR += rand.r;
        penaltyText = penaltyText ? penaltyText + " 並在虛妄流沙中迷失方向！" : "在虛妄流沙中迷失方向，發生強制位移！";
      }

      const { error } = await supabase.from('CharacterStats')
        .update({ CurrentQ: finalQ, CurrentR: finalR, Facing: finalFacing })
        .eq('UserID', userData.UserID);
      if (error) throw error;

      setUserData(prev => prev ? { ...prev, CurrentQ: finalQ, CurrentR: finalR, Facing: finalFacing } : null);
      setStepsRemaining(remaining);

      if (penaltyText) {
        setModalMessage({ text: penaltyText, type: 'error' });
      }
    } catch (err) {
      setModalMessage({ text: "移動失敗，法陣傳送受阻。", type: 'error' });
    } finally {
      setIsSyncing(false);
    }
  };


  const handleCheckInAction = async (quest: Quest) => {
    if (!userData) return;
    setIsSyncing(true);
    try {
      const res = await processCheckInTransaction(userData.UserID, quest.id, quest.title, quest.reward, quest.dice, quest.coins);

      if (res.success && res.user) {
        setUserData(res.user as CharacterStats);
        // 本地追加 log（不重新載入整個列表）
        const newLog: DailyLog = {
          id: `local_${Date.now()}`,
          UserID: userData.UserID,
          QuestID: quest.id,
          QuestTitle: quest.title,
          RewardPoints: res.rewardCapped ? 0 : quest.reward,
          Timestamp: new Date().toISOString(),
        };
        setLogs(prev => [newLog, ...prev]);
        setModalMessage(res.rewardCapped
          ? { text: "破咒打卡完成，今日三項修為已滿，本次不計修為。", type: 'info' }
          : { text: "修為提升，法喜充滿！", type: 'success' }
        );
      } else {
        setModalMessage({ text: res.error || "記錄失敗，靈通中斷。", type: 'error' });
      }
    } catch (err) {
      setModalMessage({ text: "記錄失敗，靈通中斷。", type: 'error' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUndoCheckInAction = async (quest: Quest | null) => {
    if (!userData || !quest) return;
    setIsSyncing(true);
    try {
      const { data: targetLogs } = await supabase.from('DailyLogs').select('*').eq('UserID', userData.UserID).eq('QuestID', quest.id).order('Timestamp', { ascending: false }).limit(1);
      if (!targetLogs || targetLogs.length === 0) return;
      if (getLogicalDateStr(targetLogs[0].Timestamp) !== logicalTodayStr) {
        setModalMessage({ text: "因果已定，僅限回溯今日紀錄。", type: 'info' });
        setUndoTarget(null);
        return;
      }
      await supabase.from('DailyLogs').delete().eq('id', targetLogs[0].id);

      const actualReward: number = targetLogs[0].RewardPoints ?? quest.reward;
      const newExp = Math.max(0, userData.Exp - actualReward);
      const newLevel = calculateLevelFromExp(newExp);
      const roleInfo = ROLE_CURE_MAP[userData.Role];

      // 金幣：用跟打卡一樣的邏輯（quest.coins 或 baseReward × 0.1，不是 actualReward）
      const baseReward = quest.reward || 0;
      let coinToDeduct = quest.coins != null ? quest.coins : Math.floor(baseReward * 0.1);

      // 骰子：查 BonusQuestConfig 計算額外骰子
      let totalDice = quest.dice || 0;
      try {
        const { data: bcfg } = await supabase.from('SystemSettings').select('Value').eq('SettingName', 'BonusQuestConfig').single();
        if (bcfg?.Value) {
          const rules = JSON.parse(bcfg.Value);
          for (const rule of rules) {
            if (!rule.active || !rule.keywords) continue;
            if (rule.keywords.some((kw: string) => (quest.title || '').includes(kw))) {
              if (rule.bonusType === 'energy_dice') totalDice += rule.bonusAmount || 0;
            }
          }
        }
      } catch { /* fallback */ }

      const update: Partial<CharacterStats> = {
        Exp: newExp,
        Level: newLevel,
        EnergyDice: Math.max(0, userData.EnergyDice - totalDice),
        Coins: Math.max(0, userData.Coins - coinToDeduct),
      };

      // Reverse level-up stat bonuses if level dropped
      if (newLevel < userData.Level) {
        const growthRates = ROLE_GROWTH_RATES[userData.Role] || {};
        const levelsLost = userData.Level - newLevel;
        for (const [stat, rate] of Object.entries(growthRates)) {
          const key = stat as keyof CharacterStats;
          const current = (userData[key] as number) ?? 0;
          (update as any)[key] = Math.max(0, current - (rate as number) * levelsLost);
        }
      }

      // Reverse cure bonus if applicable
      if (roleInfo?.cureTaskId === quest.id) {
        const statKey = roleInfo.bonusStat;
        const current = (update as any)[statKey] ?? (userData[statKey] as number);
        (update as any)[statKey] = Math.max(10, current - 2);
      }

      await supabase.from('CharacterStats').update(update).eq('UserID', userData.UserID);
      const { data: newLogs } = await supabase.from('DailyLogs').select('*').eq('UserID', userData.UserID);
      const updatedLogs = (newLogs as DailyLog[]) || [];

      setLogs(updatedLogs);
      setUserData({ ...userData, ...update } as CharacterStats);
      setUndoTarget(null);

      // 回溯明細
      const { writeTransactionLog } = await import('@/app/actions/txlog');
      await writeTransactionLog(userData.UserID, 'quest_undo', `回溯：${quest.title || quest.id}`, -actualReward, -coinToDeduct, { questId: quest.id });

      setModalMessage({ text: "時光回溯成功，心識已歸位。", type: 'success' });
    } catch (err) { setModalMessage({ text: "回溯失敗，業力阻擋。", type: 'error' }); } finally { setIsSyncing(false); }
  };

  const handlePurchaseSuccess = async () => {
    // Re-fetch user and team data to update UI Coins & Inventory
    if (!userData) return;
    try {
      const { data: stats } = await supabase.from('CharacterStats').select('*').eq('UserID', userData.UserID).single();
      if (stats) setUserData(prev => ({ ...prev, ...stats }));

      if (userData.LittleTeamLeagelName) {
        const { data: tSettings } = await supabase.from('TeamSettings').select('*').eq('LittleTeamLeagelName', userData.LittleTeamLeagelName).single();
        if (tSettings) setTeamSettings(tSettings);
      }
    } catch (e) {
      console.error("Failed to refresh store data", e);
    }
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSyncing(true);
    const fd = new FormData(e.currentTarget);
    const name = (fd.get('name') as string).trim();
    const phoneSuffix = (fd.get('phone') as string).trim();
    try {
      const { data: allUsers, error: queryError } = await supabase.from('CharacterStats').select('*');
      if (queryError) throw new Error(queryError.message);
      let match = (allUsers as CharacterStats[])?.find(u => u.Name === name && u.UserID.endsWith(phoneSuffix));

      // 若 CharacterStats 無此人，檢查 Rosters（後台匯入名冊）→ 自動建立角色
      if (!match) {
        const { data: rosters } = await supabase.from('Rosters').select('*');
        const rosterMatch = (rosters as any[])?.find(r => r.name === name && r.email?.replace('@phone.local', '').endsWith(phoneSuffix));
        if (rosterMatch) {
          const userId = rosterMatch.email.replace('@phone.local', '');
          const newChar: any = {
            UserID: userId, Name: rosterMatch.name, Role: null,
            Level: 1, Exp: 0, Coins: 0, Inventory: [], EnergyDice: 3,
            Savvy: 10, Luck: 10, Charisma: 10, Spirit: 10, Physique: 10, Potential: 10,
            Streak: 0, LastCheckIn: null, CurrentQ: 0, CurrentR: 0,
            Email: rosterMatch.email,
            BigTeamLeagelName: rosterMatch.BigTeamLeagelName,
            LittleTeamLeagelName: rosterMatch.LittleTeamLeagelName,
            IsCaptain: rosterMatch.is_captain,
            IsCommandant: rosterMatch.is_commandant,
            Birthday: rosterMatch.birthday,
          };
          const { error: insertErr } = await supabase.from('CharacterStats').insert([newChar]);
          if (!insertErr) match = newChar as CharacterStats;
        }
      }

      if (match) {
        localStorage.setItem('starry_session_uid', match.UserID);
        localStorage.setItem('starry_session_expiry', String(Date.now() + 24 * 60 * 60 * 1000));
        const { data: userLogs } = await supabase.from('DailyLogs').select('*').eq('UserID', match.UserID);
        const logsArray = (userLogs as DailyLog[]) || [];

        if (match.LittleTeamLeagelName) {
          const { data: ts } = await supabase.from('TeamSettings').select('*').eq('LittleTeamLeagelName', match.LittleTeamLeagelName).single();
          if (ts) setTeamSettings(ts);
        }

        setUserData(match);
        setLogs(logsArray);
        setView('app');
        // 後台匯入用戶無 Role → 顯示五運問卷
        if (!match.Role) {
          setShowFortuneOverlay(true);
          setFortuneForm({ wealth: 5, relationship: 5, family: 5, career: 5, health: 5 });
        }
      } else { setModalMessage({ text: "查無此修行者印記。", type: 'error' }); }
    } catch (err) { setModalMessage({ text: "靈通感應異常。", type: 'error' }); } finally { setIsSyncing(false); }
  };

  const handleRegisterInput = (data: any) => {
    // Check fortunes evaluation
    const evalRes = evaluateFate(data.fortunes);
    if (evalRes.isTie) {
      setTieBreakData({ ...data, evalRes });
    } else {
      executeRegisterFlow({ ...data, assignedRole: evalRes.assignedRole, lowestScore: evalRes.lowestScore });
    }
  };

  const executeRegisterFlow = async (data: any) => {
    setIsSyncing(true);
    const { name, phone: phoneRaw, email: emailRaw, fortunes, assignedRole, lowestScore } = data;
    const email = emailRaw?.trim()?.toLowerCase();
    const phone = standardizePhone(phoneRaw);

    // Default Starting Values
    let newLevel = 1;
    let newExp = 0;
    let newDice = 3;
    let newInventory: string[] = [];
    let ddaDiff = 'Normal';
    let welcomeMessage = `天命已定！您的守護角色為【${assignedRole}】。`;

    // Apply Compensation Logic
    if (lowestScore >= 1 && lowestScore <= 3) {
      newExp = 1970; // Equivalent to Level 5 approx
      newLevel = 5;
      newInventory.push('t_shield_3d'); // 假裝送個限時道具
      welcomeMessage += `\n星象顯示您正處於極大的考驗中。佛祖特賜您「開局修為加成 (Lv.5)」與「新手防禦罩」，請務必堅持每日定課，逆轉命運！`;
    } else if (lowestScore >= 4 && lowestScore <= 7) {
      newDice = 5; // Extra 2 dice
      welcomeMessage += `\n您的運勢正在十字路口，藉由本次親證班的定課，您將能突破現有的瓶頸。系統已額外補給 2 顆能量骰子。`;
    } else if (lowestScore >= 8 && lowestScore <= 10) {
      ddaDiff = 'Hard';
      welcomeMessage += `\n您的現實狀態極佳！系統已自動切換「菁英模式」，準備迎接更高強度的試煉吧！`;
    }

    const newChar: any = {
      UserID: phone, Name: name.trim(), Role: assignedRole,
      Level: newLevel, Exp: newExp, Coins: 0, Inventory: newInventory, EnergyDice: newDice,
      Savvy: 10, Luck: 10, Charisma: 10, Spirit: 10, Physique: 10, Potential: 10,
      Streak: 0, LastCheckIn: null, CurrentQ: 0, CurrentR: 0,
      Email: email, InitialFortunes: fortunes, DDA_Difficulty: ddaDiff
    };

    try {
      if (email) {
        const { data: rosterMatch } = await supabase.from('Rosters').select('*').eq('email', email).single();
        if (rosterMatch) {
          newChar.BigTeamLeagelName = rosterMatch.BigTeamLeagelName;
          newChar.LittleTeamLeagelName = rosterMatch.LittleTeamLeagelName;
          newChar.IsCaptain = rosterMatch.is_captain;
        }
      }

      await supabase.from('CharacterStats').insert([newChar]);
      localStorage.setItem('starry_session_uid', newChar.UserID);
      localStorage.setItem('starry_session_expiry', String(Date.now() + 24 * 60 * 60 * 1000));
      setUserData(newChar);
      setModalMessage({ text: welcomeMessage, type: 'success' });
      setView('app');
    } catch (err) {
      setModalMessage({ text: "轉生受阻。可能該手機號碼已經註冊落籍。", type: 'error' });
    } finally {
      setIsSyncing(false);
      setTieBreakData(null);
    }
  };

  // ── 補填問卷提交（後台匯入用戶首次登入）───────────────────
  const handleFortuneOverlaySubmit = async () => {
    if (!userData) return;
    const evalRes = evaluateFate(fortuneForm);
    if (evalRes.isTie) {
      // 平手 → 轉交 tieBreak 流程，但完成後要更新而非新建
      setShowFortuneOverlay(false);
      setTieBreakData({ isExistingUser: true, evalRes });
      return;
    }
    await applyFortuneRole(evalRes.assignedRole, evalRes.lowestScore);
  };

  const applyFortuneRole = async (role: string, lowestScore: number) => {
    if (!userData) return;
    setIsSyncing(true);
    let extraDice = 0;
    let extraExp = 0;
    let extraLevel = 1;
    let ddaDiff = 'Normal';
    if (lowestScore <= 3) { extraExp = 1970; extraLevel = 5; }
    else if (lowestScore <= 7) { extraDice = 2; }
    else { ddaDiff = 'Hard'; }
    await supabase.from('CharacterStats').update({
      Role: role, Level: extraLevel, Exp: extraExp,
      EnergyDice: (userData.EnergyDice || 3) + extraDice,
      DDA_Difficulty: ddaDiff, InitialFortunes: fortuneForm,
    }).eq('UserID', userData.UserID);
    setUserData({ ...userData, Role: role, Level: extraLevel, Exp: extraExp, EnergyDice: (userData.EnergyDice || 3) + extraDice } as CharacterStats);
    setShowFortuneOverlay(false);
    setTieBreakData(null);
    setModalMessage({ text: `天命已定！您的守護角色為【${role}】。`, type: 'success', image: `/images/avatars/${role}.png` });
    setIsSyncing(false);
  };

  const handleTieBreakSelect = (role: string) => {
    if (tieBreakData?.isExistingUser) {
      applyFortuneRole(role, tieBreakData.evalRes.lowestScore);
      return;
    }
    executeRegisterFlow({ ...tieBreakData, assignedRole: role, lowestScore: tieBreakData.evalRes.lowestScore });
  };

  const handleStartAdventure = async () => {
    if (!userData || userData.EnergyDice < ADVENTURE_COST) {
      setModalMessage({ text: `能量不足！啟動需要 ${ADVENTURE_COST} 顆骰子。`, type: 'error' });
      return;
    }
    // Re-fetch fresh entity list (monsters, chests) every time before entering the map
    const { data: freshEntities } = await supabase.from('MapEntities').select('*').eq('is_active', true);
    if (freshEntities) {
      setMapEntities(prev => {
        const teammates = prev.filter(e => typeof e.id === 'string' && e.id.startsWith('teammate_'));
        return [...teammates, ...freshEntities];
      });
    }
    setViewWithUrl('map');
  };

  const handleLogout = () => { localStorage.removeItem('starry_session_uid'); localStorage.removeItem('starry_session_expiry'); setUserData(null); setView('login'); };

  const handleQuickLogin = (userId: string) => {
    window.open(`${window.location.origin}/?uid=${encodeURIComponent(userId)}`, '_blank');
  };

  const handleUnbindLine = async () => {
    if (!userData?.UserID) return;
    const { unbindLine } = await import('@/app/actions/admin');
    const res = await unbindLine(userData.UserID);
    if (res.success) {
      setUserData(prev => prev ? { ...prev, LineUserId: undefined } : prev);
      setModalMessage({ text: 'LINE 綁定已取消', type: 'success' });
    } else {
      setModalMessage({ text: res.error || '取消綁定失敗', type: 'error' });
    }
  };

  useEffect(() => {
    document.title = systemSettings.SiteName || '巨笑開運西遊';
  }, [systemSettings.SiteName]);

  // One-time static data load — world map terrain, settings, history
  // Separated from the login useEffect so userData changes don't re-fetch and potentially clobber mapData
  useEffect(() => {
    const loadStaticData = async () => {
      const { data: mapWorldData } = await supabase.from('world_maps').select('data').eq('id', 'main_world_map').single();
      if (mapWorldData?.data) {
        const fetchedData = mapWorldData.data as { terrain?: Record<string, string>, config?: { corridorL: number, corridorW: number } };
        if (fetchedData.terrain) setMapData(fetchedData.terrain);
        if (fetchedData.config) {
          setCorridorL(fetchedData.config.corridorL || DEFAULT_CONFIG.CORRIDOR_L);
          setCorridorW(fetchedData.config.corridorW || DEFAULT_CONFIG.CORRIDOR_W);
        }
      }

      const { data: settingsData } = await supabase.from('SystemSettings').select('*');
      if (settingsData) {
        const sObj = settingsData.reduce((acc: any, curr: any) => ({ ...acc, [curr.SettingName]: curr.Value }), {});
        setSystemSettings({
          TopicQuestTitle: sObj.TopicQuestTitle || '修行主題載入中',
          TopicQuestReward: sObj.TopicQuestReward || '1000',
          TopicQuestCoins: sObj.TopicQuestCoins || '100',
          MainQuestSchedule: sObj.MainQuestSchedule,
          MainQuestAppliedId: sObj.MainQuestAppliedId,
          TopicQuestDescription: sObj.TopicQuestDescription,
          RegistrationMode: (sObj.RegistrationMode as 'open' | 'roster') || 'open',
          WorldState: sObj.WorldState,
          WorldStateMsg: sObj.WorldStateMsg,
          VolunteerPassword: sObj.VolunteerPassword,
          DefinedSquads: sObj.DefinedSquads,
          DefinedBattalions: sObj.DefinedBattalions,
          SiteName: sObj.SiteName,
          SiteLogo: sObj.SiteLogo,
          OgTitle: sObj.OgTitle,
          OgDescription: sObj.OgDescription,
          OgImage: sObj.OgImage,
          CardMottos: sObj.CardMottos,
          CardBackImage: sObj.CardBackImage,
          BonusQuestConfig: sObj.BonusQuestConfig,
          BoardGameEnabled: sObj.BoardGameEnabled,
          BoardGameBuyRate: sObj.BoardGameBuyRate,
          BoardGameSellRate: sObj.BoardGameSellRate,
          BoardGameZeroEnabled: sObj.BoardGameZeroEnabled,
          BoardGameZeroCashMultiplier: sObj.BoardGameZeroCashMultiplier,
          BoardGameZeroBlessingMultiplier: sObj.BoardGameZeroBlessingMultiplier,
        });
        try {
          setQuestRoleDefs(sObj.QuestRoles ? JSON.parse(sObj.QuestRoles) : DEFAULT_QUEST_ROLES);
        } catch { setQuestRoleDefs(DEFAULT_QUEST_ROLES); }
      }

      const { data: historyData } = await supabase.from('TopicHistory').select('*').order('created_at', { ascending: false });
      if (historyData) setTopicHistory(historyData as TopicHistory[]);

      const { data: tempQuestsData } = await supabase.from('temporaryquests').select('*').order('created_at', { ascending: false });
      if (tempQuestsData) {
        const parsed = tempQuestsData.map((t: any) => ({ ...t, limit: t.limit_count }));
        setTemporaryQuests(parsed as TemporaryQuest[]);
      }

      const courseData = await listCourses();
      setCourses(courseData);
      const ptRes = await listPeakTrials({ activeOnly: false });
      if (ptRes.success) setPeakTrials(ptRes.trials);
    };
    loadStaticData().finally(() => setSettingsLoaded(true));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const init = async () => {
      // Fetch teammates' positions for map interaction
      const fetchTeammates = async (teamName: string, selfId: string) => {
        try {
          const { data: mates } = await supabase
            .from('CharacterStats')
            .select('UserID, Name, Role, CurrentQ, CurrentR, EnergyDice, Level')
            .eq('LittleTeamLeagelName', teamName)
            .neq('UserID', selfId);
          if (mates && mates.length > 0) {
            const teammateEntities = mates.map((m: any) => ({
              id: `teammate_${m.UserID}`,
              q: m.CurrentQ,
              r: m.CurrentR,
              type: 'teammate',
              icon: ROLE_CURE_MAP[m.Role]?.avatar || '👤',
              name: m.Name || m.UserID,
              is_active: true,
              data: { userId: m.UserID, role: m.Role, level: m.Level, dice: m.EnergyDice }
            }));
            setMapEntities(prev => [...prev, ...teammateEntities]);
          }
        } catch (_) { /* non-critical */ }
      };

      // 快捷登入：?uid=USERID — 直接登入指定帳號（不污染原分頁的 localStorage）
      if (typeof window !== 'undefined') {
        const qlParams = new URLSearchParams(window.location.search);
        const qlUid = qlParams.get('uid');
        if (qlUid) {
          window.history.replaceState({}, '', '/');
          sessionStorage.setItem('starry_session_uid', qlUid);
          sessionStorage.setItem('starry_session_expiry', String(Date.now() + 24 * 60 * 60 * 1000));
        }
      }

      // LINE OAuth session handoff — handle ?line_uid, ?line_bound, ?line_error params
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const lineUid = params.get('line_uid');
        const lineBound = params.get('line_bound');
        const lineError = params.get('line_error');
        if (lineUid || lineBound || lineError) {
          window.history.replaceState({}, '', '/');
          if (lineUid) {
            localStorage.setItem('starry_session_uid', decodeURIComponent(lineUid));
            localStorage.setItem('starry_session_expiry', String(Date.now() + 24 * 60 * 60 * 1000));
          } else if (lineBound === 'success') {
            setModalMessage({ text: '✅ LINE 帳號綁定成功！下次可直接以 LINE 登入。', type: 'success' });
          } else if (lineError === 'not_bound') {
            setModalMessage({ text: '此 LINE 帳號尚未綁定任何遊戲帳號，請先以姓名 + 手機末三碼登入後再進行綁定。', type: 'error' });
          } else if (lineError === 'already_bound') {
            setModalMessage({ text: '此 LINE 帳號已綁定其他玩家帳號。', type: 'error' });
          } else if (lineError === 'cancelled') {
            // User cancelled LINE auth — silent, no message
          } else if (lineError) {
            setModalMessage({ text: `LINE 登入發生錯誤（${lineError}），請稍後再試。`, type: 'error' });
          }
        }
      }

      const savedUid = (() => {
        // sessionStorage 優先（快捷登入新分頁），否則 fallback 到 localStorage
        const ssUid = sessionStorage.getItem('starry_session_uid');
        const ssExpiry = Number(sessionStorage.getItem('starry_session_expiry') || 0);
        if (ssUid && Date.now() < ssExpiry) return ssUid;
        const uid = localStorage.getItem('starry_session_uid');
        const expiry = Number(localStorage.getItem('starry_session_expiry') || 0);
        if (uid && Date.now() < expiry) return uid;
        localStorage.removeItem('starry_session_uid');
        localStorage.removeItem('starry_session_expiry');
        return null;
      })();
      // 載入等級門檻設定（覆蓋預設公式）
      try {
        const { data: lvCfg } = await supabase.from('LevelConfig').select('level, exp_required').order('level');
        if (lvCfg && lvCfg.length > 0) setLevelExpCache(lvCfg);
      } catch { /* fallback to default formula */ }

      if (savedUid && !userData) {
        // Fetch map entities only once on initial login (not on every userData change)
        try {
          const { data: pEntities, error: entErr } = await supabase.from('MapEntities').select('*').eq('is_active', true);
          if (pEntities && !entErr) {
            setMapEntities(pEntities);
          }
        } catch (e) {
          console.error("Error fetching map entities:", e);
        }
        const { data: stats, error } = await supabase.from('CharacterStats').select('*').eq('UserID', savedUid).single();
        if (stats && !error) {
          const { data: userLogs } = await supabase.from('DailyLogs').select('*').eq('UserID', stats.UserID);
          const logsArray = (userLogs as DailyLog[]) || [];

          // Fetch TeamSettings if User belongs to a Team
          if (stats.LittleTeamLeagelName) {
            const { data: tSettings } = await supabase.from('TeamSettings').select('*').eq('LittleTeamLeagelName', stats.LittleTeamLeagelName).single();
            if (tSettings) setTeamSettings(tSettings);
            // Fetch battalion display name for commandant
            if (stats.BigTeamLeagelName) {
              const { data: bSettings } = await supabase.from('BattalionSettings').select('display_name').eq('battalion_name', stats.BigTeamLeagelName).single();
              if (bSettings?.display_name) setBattalionDisplayName(bSettings.display_name);
            }
            const { count } = await supabase.from('CharacterStats').select('*', { count: 'exact', head: true }).eq('BigTeamLeagelName', stats.BigTeamLeagelName);
            setTeamMemberCount(count || 1);
            await fetchTeammates(stats.LittleTeamLeagelName, stats.UserID);

            // Auto-draw fallback: trigger for ALL squads every Monday after noon.
            // Do NOT gate on teamAlreadyDrew — if this squad drew manually but others didn't,
            // the fallback would skip those squads. autoDrawAllSquads() already skips squads that drew.
            const nowTaiwan = new Date(Date.now() + 8 * 3600 * 1000);
            const isMondayAfterNoon = nowTaiwan.getUTCDay() === 1 && nowTaiwan.getUTCHours() >= 12;
            if (isMondayAfterNoon) {
              const drawRes = await autoDrawAllSquads();
              if (drawRes.success && (drawRes.drawnCount ?? 0) > 0) {
                // Refresh teamSettings so UI reflects the newly drawn quest
                const { data: freshTS } = await supabase.from('TeamSettings').select('*').eq('LittleTeamLeagelName', stats.LittleTeamLeagelName).single();
                if (freshTS) setTeamSettings(freshTS);
              }
            }
          }

          setUserData(stats as CharacterStats);
          setLogs(logsArray);
          setView('app'); // 先進入畫面，次要資料背景載入，避免任一 fetch 卡住導致永久 loading
          // 後台匯入用戶無 Role → 顯示五運問卷
          if (!(stats as CharacterStats).Role) {
            setShowFortuneOverlay(true);
            setFortuneForm({ wealth: 5, relationship: 5, family: 5, career: 5, health: 5 });
          }

          // 背景載入次要資料（不阻塞畫面切換）
          const secondaryFetches: Promise<unknown>[] = [
            getW4Applications({ userId: stats.UserID }).then(res => {
              if (res.success) setW4Applications(res.applications);
            }),
            getUserAchievements(stats.UserID).then(records => {
              setUserAchievements(records);
            }),
            getMyPeakTrialRegistrations(stats.UserID).then(res => {
              if (res.success) setMyPeakTrialRegs(res.registrations);
            }),
          ];
          if (stats.IsCaptain && stats.LittleTeamLeagelName) {
            secondaryFetches.push(
              getW4Applications({ squadName: stats.LittleTeamLeagelName, status: 'pending' }).then(res => {
                if (res.success) setPendingW4Apps(res.applications);
              })
            );
          }
          if (stats.IsCommandant) {
            secondaryFetches.push(
              getW4Applications({ status: 'squad_approved' }).then(res => {
                if (res.success) setSquadApprovedW4Apps(res.applications);
              })
            );
          }
          Promise.all(secondaryFetches).catch(console.error);
        } else { setView(v => v === 'loading' ? 'login' : v); }
      } else if (!savedUid) { setView(v => v === 'loading' ? 'login' : v); }
    };
    init();
  }, [userData]);

  useEffect(() => {
    const fetchRank = async () => {
      const { data: rankData } = await supabase.from('CharacterStats').select('*').order('Exp', { ascending: false });
      if (rankData) setLeaderboard(rankData as CharacterStats[]);
    };
    if (activeTab === 'rank' || view === 'admin') fetchRank();
    if (view === 'admin') getTestimonies().then(setTestimonies).catch(console.error);
  }, [activeTab, view]);

  // Refresh w4 applications whenever the weekly tab becomes active
  useEffect(() => {
    if (activeTab === 'weekly' && userData?.UserID) {
      getW4Applications({ userId: userData.UserID }).then(res => {
        if (res.success) setW4Applications(res.applications);
      });
    }
  }, [activeTab, userData?.UserID]); // eslint-disable-line react-hooks/exhaustive-deps

  // 切換到巔峰試煉 tab 時刷新活動資料與我的報名記錄
  useEffect(() => {
    if (activeTab === 'peakTrial') {
      listPeakTrials({ activeOnly: false }).then(r => {
        if (r.success) setPeakTrials(r.trials);
        else console.error('[PeakTrials] listPeakTrials 失敗:', r.error);
      });
      if (userData?.UserID) {
        getMyPeakTrialRegistrations(userData.UserID).then(r => { if (r.success) setMyPeakTrialRegs(r.registrations); });
      }
    }
  }, [activeTab, userData?.UserID]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab === 'captain' && !showCaptainTab) setActiveTab('daily');
    if (activeTab === 'commandant' && !showCommandantTab) setActiveTab('daily');
  }, [gmViewMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // 小隊長：登入後或切換到 captain tab 時自動載入隊員名單
  useEffect(() => {
    if ((userData?.IsCaptain || userData?.IsGM) && userData?.UserID && activeTab === 'captain') {
    }
  }, [userData?.UserID, activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // 大隊長：切換到 commandant tab 時載入所管轄小隊名單
  useEffect(() => {
    if ((userData?.IsCommandant || userData?.IsGM) && userData?.UserID && activeTab === 'commandant') {
      loadBattalionSquads();
    }
  }, [userData?.UserID, activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const GmToolbar = () => {
    if (!userData?.IsGM) return null;
    const modes: { label: string; value: GmViewMode }[] = [
      { label: '全部', value: 'all' },
      { label: '一般修行者', value: 'player' },
      { label: '小隊長', value: 'captain' },
      { label: '大隊長', value: 'commandant' },
    ];
    return (
      <div className="bg-amber-950/80 border-b-2 border-amber-500/60 px-4 py-2 flex items-center gap-3 flex-wrap">
        <span className="text-amber-400 text-sm font-black tracking-widest shrink-0">⚙ GM模式</span>
        <button
          onClick={() => { setAdminAuth(false); setAdminOperator(''); setView('admin'); }}
          className="px-3 py-1 rounded-xl text-sm font-black bg-rose-900/60 text-rose-300 hover:bg-rose-800/70 transition-all shrink-0"
        >
          登入大會中樞
        </button>
        <div className="flex gap-2 flex-wrap">
          {modes.map(m => (
            <button
              key={m.value}
              onClick={() => setGmViewMode(m.value)}
              className={`px-3 py-1 rounded-xl text-sm font-black transition-all ${
                gmViewMode === m.value
                  ? 'bg-amber-500 text-black'
                  : 'bg-slate-800 text-amber-400/70 hover:bg-slate-700'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const HomeView = () => (
    <div className="min-h-screen bg-slate-950 text-slate-200 pb-40 text-center animate-in fade-in">
      <Header userData={userData} onLogout={handleLogout} fontSize={fontSize} onFontSizeChange={setFontSize} questRoleNames={(() => { try { const q = userData?.QuestRole; if (!q) return []; const p = JSON.parse(q); return Array.isArray(p) ? p.map((id: string) => questRoleDefs.find(r => r.id === id)?.name).filter(Boolean) as string[] : [questRoleDefs.find(r => r.id === q)?.name].filter(Boolean) as string[]; } catch { return userData?.QuestRole ? [questRoleDefs.find(r => r.id === userData.QuestRole)?.name].filter(Boolean) as string[] : []; } })()} onUnbindLine={handleUnbindLine} squadNickname={teamSettings?.display_name ?? undefined} battalionNickname={battalionDisplayName || undefined} />
      <GmToolbar />

      {/* LINE 綁定提示 Banner */}
      {userData && !userData.LineUserId && !lineBannerDismissed && (
        <div className="flex items-center gap-3 px-4 py-3 bg-[#06C755]/10 border-b border-[#06C755]/20 text-sm">
          <span className="text-[#06C755] font-black shrink-0">LINE</span>
          <span className="flex-1 text-left text-slate-300 text-sm">尚未綁定 LINE 帳號，綁定後可直接以 LINE 登入。</span>
          <a
            href={`/api/auth/line?action=bind&uid=${encodeURIComponent(userData.UserID)}`}
            className="shrink-0 px-3 py-1 rounded-lg bg-[#06C755] text-white text-sm font-black active:scale-95 transition-all"
          >
            立即綁定
          </a>
          <button
            onClick={() => setLineBannerDismissed(true)}
            className="shrink-0 text-slate-600 hover:text-slate-400 text-lg leading-none"
          >
            ×
          </button>
        </div>
      )}

      <nav className="sticky top-0 z-20 bg-slate-950/90 backdrop-blur-md flex p-4 gap-2 border-b border-white/5 shadow-xl overflow-x-auto no-scrollbar">
        <button onClick={() => setActiveTab('daily')} aria-current={activeTab === 'daily' ? 'page' : undefined} className={`shrink-0 flex flex-col items-center gap-1 px-4 py-3 rounded-2xl text-sm font-black transition-all cursor-pointer ${activeTab === 'daily' ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25' : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-100'}`}><Flame size={16} />修行定課</button>
        <button onClick={handleOpenWeeklyTab} aria-current={activeTab === 'weekly' ? 'page' : undefined} className={`shrink-0 flex flex-col items-center gap-1 px-4 py-3 rounded-2xl text-sm font-black transition-all cursor-pointer ${activeTab === 'weekly' ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25' : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-100'}`}><Sparkles size={16} />任務中心</button>
        <button onClick={() => setActiveTab('special')} aria-current={activeTab === 'special' ? 'page' : undefined} className={`shrink-0 flex flex-col items-center gap-1 px-4 py-3 rounded-2xl text-sm font-black transition-all cursor-pointer ${activeTab === 'special' ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25' : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-100'}`}><Star size={16} />特殊任務</button>
        <button onClick={() => setActiveTab('maze')} aria-current={activeTab === 'maze' ? 'page' : undefined} className={`shrink-0 flex flex-col items-center gap-1 px-4 py-3 rounded-2xl text-sm font-black transition-all cursor-pointer ${activeTab === 'maze' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25' : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-100'}`}><Swords size={16} />迷宮</button>
        <button onClick={() => setActiveTab('shop')} aria-current={activeTab === 'shop' ? 'page' : undefined} className={`shrink-0 flex flex-col items-center gap-1 px-4 py-3 rounded-2xl text-sm font-black transition-all cursor-pointer ${activeTab === 'shop' ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25' : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-100'}`}><Store size={16} />藏寶閣</button>
        <button onClick={() => setActiveTab('rank')} aria-current={activeTab === 'rank' ? 'page' : undefined} className={`shrink-0 flex flex-col items-center gap-1 px-4 py-3 rounded-2xl text-sm font-black transition-all cursor-pointer ${activeTab === 'rank' ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25' : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-100'}`}><Trophy size={16} />修為榜</button>
        <button onClick={() => setActiveTab('stats')} aria-current={activeTab === 'stats' ? 'page' : undefined} className={`shrink-0 flex flex-col items-center gap-1 px-4 py-3 rounded-2xl text-sm font-black transition-all cursor-pointer ${activeTab === 'stats' ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25' : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-100'}`}><BarChart3 size={16} />六維屬性</button>
        <button onClick={() => setActiveTab('achievements')} aria-current={activeTab === 'achievements' ? 'page' : undefined} className={`shrink-0 flex flex-col items-center gap-1 px-4 py-3 rounded-2xl text-sm font-black transition-all cursor-pointer ${activeTab === 'achievements' ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25' : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-100'}`}><Medal size={16} />成就</button>
        <button onClick={() => setActiveTab('course')} aria-current={activeTab === 'course' ? 'page' : undefined} className={`shrink-0 flex flex-col items-center gap-1 px-4 py-3 rounded-2xl text-sm font-black transition-all cursor-pointer ${activeTab === 'course' ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25' : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-100'}`}><CalendarDays size={16} />課程</button>
        <button onClick={() => setActiveTab('peakTrial')} aria-current={activeTab === 'peakTrial' ? 'page' : undefined} className={`shrink-0 flex flex-col items-center gap-1 px-4 py-3 rounded-2xl text-sm font-black transition-all cursor-pointer ${activeTab === 'peakTrial' ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25' : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-100'}`}><Mountain size={16} />試煉</button>
        <button onClick={() => setActiveTab('history')} aria-current={activeTab === 'history' ? 'page' : undefined} className={`shrink-0 flex flex-col items-center gap-1 px-4 py-3 rounded-2xl text-sm font-black transition-all cursor-pointer ${activeTab === 'history' ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25' : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-100'}`}><ScrollText size={16} />明細</button>
        {showCaptainTab && (
          <button onClick={handleOpenCaptainTab} aria-current={activeTab === 'captain' ? 'page' : undefined} className={`shrink-0 flex flex-col items-center gap-1 px-4 py-3 rounded-2xl text-sm font-black transition-all cursor-pointer ${activeTab === 'captain' ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25' : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-100'}`}><Compass size={16} />指揮所</button>
        )}
        {showCommandantTab && (
          <button onClick={() => setActiveTab('commandant')} aria-current={activeTab === 'commandant' ? 'page' : undefined} className={`shrink-0 flex flex-col items-center gap-1 px-4 py-3 rounded-2xl text-sm font-black transition-all cursor-pointer ${activeTab === 'commandant' ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25' : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-100'}`}><Swords size={16} />指揮部</button>
        )}
      </nav>

      <main className="max-w-md mx-auto p-6 space-y-8">
        {activeTab === 'daily' && (
          <DailyQuestsTab
            weeklyQuestId={teamSettings?.mandatory_quest_id}
            logs={logs}
            logicalTodayStr={logicalTodayStr}
            userInventory={typeof userData?.Inventory === 'string' ? JSON.parse(userData.Inventory) : (userData?.Inventory || [])}
            teamInventory={typeof teamSettings?.inventory === 'string' ? JSON.parse(teamSettings.inventory) : (teamSettings?.inventory || [])}
            onCheckIn={handleCheckInAction}
            onUndo={setUndoTarget}
            formatCheckInTime={formatCheckInTime}
            userId={userData?.UserID}
            cardMottos={systemSettings.CardMottos ? (() => { try { return JSON.parse(systemSettings.CardMottos!); } catch { return undefined; } })() : undefined}
            cardBackImage={systemSettings.CardBackImage || undefined}
          />
        )}
        {activeTab === 'weekly' && (
          <WeeklyTopicTab
            systemSettings={systemSettings}
            logs={logs}
            currentWeeklyMonday={currentWeeklyMonday}
            isTopicDone={isTopicDone}
            temporaryQuests={[]}
            specialQuests={[]}
            userInventory={typeof userData?.Inventory === 'string' ? JSON.parse(userData.Inventory) : (userData?.Inventory || [])}
            teamInventory={typeof teamSettings?.inventory === 'string' ? JSON.parse(teamSettings.inventory) : (teamSettings?.inventory || [])}
            w4Applications={w4Applications}
            weeklyReview={weeklyReview}
            isLoadingReview={isLoadingReview}
            onCheckIn={handleCheckInAction}
            onUndo={setUndoTarget}
            onSubmitW4={handleSubmitW4}
          />
        )}
        {activeTab === 'special' && (
          <WeeklyTopicTab
            systemSettings={systemSettings}
            logs={logs}
            currentWeeklyMonday={currentWeeklyMonday}
            isTopicDone={false}
            temporaryQuests={temporaryQuests.filter(t => t.active && t.category !== 'special')}
            specialQuests={temporaryQuests.filter(t => t.active && t.category === 'special')}
            userInventory={typeof userData?.Inventory === 'string' ? JSON.parse(userData.Inventory) : (userData?.Inventory || [])}
            teamInventory={typeof teamSettings?.inventory === 'string' ? JSON.parse(teamSettings.inventory) : (teamSettings?.inventory || [])}
            w4Applications={[]}
            weeklyReview={null}
            isLoadingReview={false}
            onCheckIn={handleCheckInAction}
            onUndo={setUndoTarget}
            onSubmitW4={async () => {}}
            hideMainQuest
          />
        )}
        {activeTab === 'rank' && <RankTab leaderboard={leaderboard} currentUserId={userData?.UserID} questRoleDefs={questRoleDefs} />}
        {activeTab === 'stats' && userData && <StatsTab userData={userData} />}
        {activeTab === 'shop' && userData && (
          <ShopTab
            userData={userData}
            teamSettings={teamSettings}
            teamMemberCount={teamMemberCount}
            onPurchaseSuccess={handlePurchaseSuccess}
            onShowMessage={(msg, type) => setModalMessage({ text: msg, type })}
          />
        )}
        {activeTab === 'captain' && showCaptainTab && userData && (
          <CaptainTab
            captainUserId={userData.UserID}
            teamName={userData.LittleTeamLeagelName || '未編組'}
            teamDisplayName={teamSettings?.display_name ?? undefined}
            teamSettings={teamSettings}
            pendingW4Apps={pendingW4Apps}
            onDrawWeeklyQuest={handleDrawWeeklyQuest}
            onReviewW4={handleReviewW4BySquad}
            onGetAIBriefing={handleGetAIBriefing}
            aiBriefing={aiBriefing}
            isLoadingBriefing={isLoadingBriefing}
            squadMembersWithRoles={squadMembersWithRoles}
            onSetQuestRole={handleSetQuestRole}
            questRoleDefs={questRoleDefs}
            onDisplayNameSaved={(name) => setTeamSettings((prev: any) => ({ ...prev, display_name: name }))}
          />
        )}
        {activeTab === 'commandant' && showCommandantTab && userData && (
          <CommandantTab
            userData={userData}
            battalionDisplayName={battalionDisplayName}
            apps={squadApprovedW4Apps}
            squads={battalionSquads}
            trials={peakTrials.filter(t => t.battalion_name === userData.BigTeamLeagelName || t.created_by === userData.UserID)}
            onRefresh={async () => {
              const res = await getW4Applications({ status: 'squad_approved' });
              if (res.success) setSquadApprovedW4Apps(res.applications);
              loadBattalionSquads();
              listPeakTrials({ activeOnly: false }).then(r => { if (r.success) setPeakTrials(r.trials); });
            }}
            onShowMessage={(msg, type) => setModalMessage({ text: msg, type })}
            onDisplayNameSaved={(name) => setBattalionDisplayName(name)}
          />
        )}
        {activeTab === 'achievements' && userData && (
          <AchievementsTab achievements={userAchievements} userData={userData} />
        )}
        {activeTab === 'course' && userData && (
          <CourseTab courses={courses} volunteerPassword={systemSettings.VolunteerPassword ?? ''} userId={userData.UserID} userName={userData.Name} />
        )}
        {activeTab === 'peakTrial' && userData && (
          <PeakTrialTab
            trials={peakTrials}
            myRegistrations={myPeakTrialRegs}
            userId={userData.UserID}
            userName={userData.Name}
            squadName={userData.LittleTeamLeagelName}
            battalionName={userData.BigTeamLeagelName}
            battalionMemberCount={leaderboard.filter(m => m.BigTeamLeagelName === userData.BigTeamLeagelName).length || undefined}
            onRefresh={() => {
              listPeakTrials({ activeOnly: false }).then(r => { if (r.success) setPeakTrials(r.trials); });
              getMyPeakTrialRegistrations(userData.UserID).then(r => { if (r.success) setMyPeakTrialRegs(r.registrations); });
            }}
            onShowMessage={(msg, type) => setModalMessage({ text: msg, type })}
          />
        )}
        {activeTab === 'history' && userData && (
          <HistoryTab logs={logs} userData={userData} isCaptain={!!(userData.IsCaptain || userData.IsGM)} squadName={userData.LittleTeamLeagelName} />
        )}
        {activeTab === 'maze' && (
          <div className="w-full" style={{ height: 'calc(100vh - 200px)' }}>
            <MazeGameComponent />
          </div>
        )}
      </main>

      {/* Achievement Unlock Modal */}
      {achievementQueue.length > 0 && (() => {
        const def = achievementQueue[0];
        const style = RARITY_STYLE[def.rarity];
        return (
          <div className="fixed inset-0 z-[1100] flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-sm space-y-4 text-center">
              <p className="text-white font-black text-lg">✨ 成就解鎖！</p>
              <div className={`p-6 rounded-3xl border-2 ${style.border} ${style.bg} shadow-2xl shadow-[0_0_40px_rgba(0,0,0,0.5)]`}>
                <div className="flex justify-center mb-3"><AchievementIcon def={def} size="lg" /></div>
                <h3 className={`text-2xl font-black ${style.text}`}>{def.name}</h3>
                <p className={`text-sm font-bold uppercase tracking-widest mt-1 ${style.text} opacity-70`}>{style.label}</p>
                <p className="text-slate-300 text-sm mt-3 leading-relaxed">{def.description}</p>
              </div>
              <button
                onClick={() => setAchievementQueue(prev => prev.slice(1))}
                className="w-full py-4 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-2xl transition-all active:scale-95 shadow-lg"
              >
                領旨！
              </button>
            </div>
          </div>
        );
      })()}

      <footer className="fixed bottom-0 left-0 right-0 p-10 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent pointer-events-none z-30 flex justify-center text-center mx-auto" style={{ zoom: 100 / fontSize }}>
        <button
          disabled={(userData?.EnergyDice || 0) < ADVENTURE_COST}
          onClick={handleStartAdventure}
          className={`pointer-events-auto w-full max-w-md py-7 rounded-[2.5rem] font-black text-2xl shadow-xl flex items-center justify-center gap-4 transition-all mx-auto ${(userData?.EnergyDice || 0) >= ADVENTURE_COST ? 'bg-orange-600 text-white active:scale-95 shadow-orange-600/30' : 'bg-slate-800 text-slate-600 opacity-50'}`}
        >
          <Dice5 size={32} />啟動冒險 (🎲 {userData?.EnergyDice || 0})
        </button>
      </footer>
    </div>
  );

  return (
    <div className="text-center justify-center mx-auto w-full font-sans">
      {view === 'loading' && (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-10 text-center mx-auto">
          <Loader2 className="w-16 h-16 text-orange-500 animate-spin mb-6 mx-auto" />
          <p className="text-orange-500 text-xl font-black animate-pulse text-center mx-auto">正在共感法界能量...</p>
        </div>
      )}

      {view === 'login' && !settingsLoaded && (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-10 text-center mx-auto">
          <Loader2 className="w-16 h-16 text-orange-500 animate-spin mb-6 mx-auto" />
          <p className="text-orange-500 text-xl font-black animate-pulse text-center mx-auto">正在共感法界能量...</p>
        </div>
      )}

      {view === 'login' && settingsLoaded && (
        <LoginForm
          onLogin={handleLogin}
          onGoToRegister={() => setView('register')}
          onGoToAdmin={() => setViewWithUrl('admin')}
          isSyncing={isSyncing}
          registrationMode={systemSettings.RegistrationMode}
          siteName={systemSettings.SiteName}
          siteLogo={systemSettings.SiteLogo}
        />
      )}

      {view === 'register' && (
        <RegisterForm
          onRegister={handleRegisterInput}
          onGoToLogin={() => setView('login')}
          isSyncing={isSyncing}
        />
      )}

      {/* 首次登入補填五運問卷（後台匯入用戶） */}
      {showFortuneOverlay && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-slate-950/95 backdrop-blur-md animate-in fade-in zoom-in duration-300 overflow-y-auto">
          <div className="bg-slate-900 border-2 border-indigo-500/30 p-8 rounded-[2.5rem] shadow-2xl max-w-md w-full space-y-6 my-auto">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-black text-white">五運占星</h2>
              <p className="text-sm text-indigo-400 font-bold leading-relaxed">
                歡迎回來！系統偵測到您尚未完成天命占星。<br />請憑直覺作答，分數越低代表越困頓。
              </p>
            </div>
            <div className="space-y-5 bg-slate-800/50 p-5 rounded-3xl border border-white/5">
              {([
                { key: 'wealth', label: '金錢運', desc: '對物質、財務的安全感' },
                { key: 'relationship', label: '感情運', desc: '與伴侶、人際互動的和諧度' },
                { key: 'family', label: '家庭運', desc: '與原生家庭、親情的圓滿度' },
                { key: 'career', label: '事業運', desc: '工作成就、社會定位的滿意度' },
                { key: 'health', label: '身體運', desc: '健康狀況、精神活力的充沛度' },
              ] as const).map(f => (
                <div key={f.key} className="space-y-2">
                  <div className="flex justify-between items-end">
                    <label className="text-white font-black text-sm">{f.label}</label>
                    <span className="text-indigo-400 font-bold text-sm bg-indigo-950 px-2 py-0.5 rounded">{fortuneForm[f.key]} 分</span>
                  </div>
                  <p className="text-sm text-slate-500 font-bold">{f.desc}</p>
                  <input type="range" min="1" max="10" step="1" value={fortuneForm[f.key]}
                    onChange={e => setFortuneForm(prev => ({ ...prev, [f.key]: parseInt(e.target.value, 10) }))}
                    className="w-full accent-indigo-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer" />
                  <div className="flex justify-between text-sm text-slate-600 font-bold px-1">
                    <span>1 (匱乏)</span><span>10 (豐盛)</span>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={handleFortuneOverlaySubmit} disabled={isSyncing}
              className="w-full py-5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black text-lg shadow-lg hover:opacity-90 active:scale-95 transition-all disabled:opacity-50">
              {isSyncing ? '天命配對中...' : '提交占星結果'}
            </button>
          </div>
        </div>
      )}

      {/* Tie Break Modal Overlay */}
      {tieBreakData && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-slate-950/95 backdrop-blur-md animate-in fade-in zoom-in duration-300">
          <div className="bg-slate-900 border-2 border-indigo-500/30 p-8 rounded-[2.5rem] shadow-2xl max-w-sm w-full space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-black text-white">天命抉擇</h2>
              <p className="text-sm text-indigo-400 font-bold leading-relaxed">
                五運輪盤顯示，您在多個領域遇到同等強烈的考驗。<br />請選出您此次最渴望跨越的難關：
              </p>
            </div>
            <div className="space-y-3">
              {tieBreakData.evalRes.tieOptions.map((opt: string) => (
                <button
                  key={opt}
                  onClick={() => handleTieBreakSelect(opt)}
                  disabled={isSyncing}
                  className="w-full py-4 bg-slate-800 hover:bg-indigo-600 text-white font-black rounded-2xl transition-colors disabled:opacity-50"
                >
                  選擇化身為【{opt}】
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {view === 'admin' && (
        <AdminDashboard
          adminAuth={adminAuth}
          onAuth={handleAdminAuth}
          systemSettings={systemSettings}
          updateGlobalSetting={updateGlobalSetting}
          updateGlobalSettings={updateGlobalSettings}
          leaderboard={leaderboard}
          topicHistory={topicHistory}
          temporaryQuests={temporaryQuests}
          squadApprovedW4Apps={squadApprovedW4Apps}
          adminLogs={adminLogs}
          testimonies={testimonies}
          onAddTempQuest={handleAddTempQuest}
          onToggleTempQuest={handleToggleTempQuest}
          onDeleteTempQuest={handleDeleteTempQuest}
          onUpdateTempQuest={handleUpdateTempQuest}
          onTriggerSnapshot={handleTriggerSnapshot}
          onAutoDrawAllSquads={handleAutoDrawAllSquads}
          onImportRoster={handleImportRoster}
          onFinalReviewW4={handleFinalReviewW4}
          courses={courses}
          onUpsertCourse={handleUpsertCourse}
          onDeleteCourse={handleDeleteCourse}
          onUpdateMemberAssignment={handleUpdateMemberAssignment}
          onRefreshLeaderboard={async () => {
            const { data } = await supabase.from('CharacterStats').select('*').order('Exp', { ascending: false });
            if (data) setLeaderboard(data as CharacterStats[]);
          }}
          onDeleteAdminLog={handleDeleteAdminLog}
          onQuickLogin={handleQuickLogin}
          onClose={() => { setAdminAuth(false); setAdminOperator(''); setView(userData ? 'app' : 'login'); window.history.pushState({}, '', userData ? '/' : '/login'); }}
        />
      )}

      {view === 'app' && <HomeView />}

      {/* 開運大富翁入場彈框（不可關閉） */}
      {view === 'app' && userData && systemSettings.BoardGameEnabled === 'true' && !boardGameEntered && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-slate-950/95 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-slate-900 border-2 border-emerald-700/50 p-10 rounded-[2.5rem] shadow-2xl max-w-xs w-full text-center space-y-7">
            <div className="text-5xl">🎲</div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-emerald-400 tracking-wide">人生</h2>
              <h2 className="text-3xl font-black text-white tracking-wide">開運大富翁</h2>
            </div>
            <button
              onClick={async () => {
                const stats = await getBoardGameStats(userData.UserID);
                setBoardGameStats(stats);
                setBoardGameEntered(true);
              }}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-lg rounded-2xl transition-all active:scale-95 shadow-lg"
            >
              點擊進入
            </button>
          </div>
        </div>
      )}

      {/* 開運大富翁遊戲介面 */}
      {view === 'app' && userData && boardGameEntered && systemSettings.BoardGameEnabled === 'true' && (
        <BoardGameView
          userData={userData}
          cash={boardGameStats.cash}
          blessing={boardGameStats.blessing}
          systemSettings={systemSettings}
          onStatsChange={(cash, blessing) => setBoardGameStats({ cash, blessing })}
        />
      )}
      {view === 'map' && userData && (
        <div className="fixed inset-0 z-10 flex flex-col">
          {/* 冒險狀態列：詛咒/天賦效果 + 黃金骰子 */}
          <div className="shrink-0 flex items-center justify-between gap-2 px-4 py-2 bg-slate-950/90 backdrop-blur-sm border-b border-slate-800">
            <span className={`text-sm font-black shrink-0 ${roleTrait?.isCursed ? 'text-red-400' : 'text-emerald-400'}`}>
              {roleTrait?.isCursed ? `☠️ ${roleTrait.curseName}` : '✨ 天命覺醒'}
            </span>
            <p className="text-sm text-white/50 leading-tight truncate flex-1 text-center">
              {roleTrait?.isCursed ? roleTrait.curseEffect : roleTrait?.talent}
            </p>
            <span className="text-sm font-black text-amber-400 shrink-0">⭐ {userData.GoldenDice}</span>
          </div>
          <div className="flex-1 min-h-0 relative overflow-hidden">
          <WorldMap
          userData={userData}
          mapData={mapData}
          corridorL={corridorL}
          corridorW={corridorW}
          stepsRemaining={stepsRemaining}
          moveMultiplier={moveMultiplier}
          onUpdateMultiplier={setMoveMultiplier}
          isRolling={isRolling}
          onRollDice={handleRollDice}
          onMoveCharacter={handleMoveCharacter}
          onBack={() => setView('app')}
          initialQ={userData.CurrentQ}
          initialR={userData.CurrentR}
          roleTrait={roleTrait}
          todayCompletedQuestIds={todayCompletedQuestIds}
          onShowMessage={(msg, type) => setModalMessage({ text: msg, type })}
dbEntities={mapEntities}
          worldState={systemSettings.WorldState}
          onEntityTrigger={handleEntityTrigger}
          onUpdateUserData={(data) => {
            if ((data as any).removeEntityId) {
              setMapEntities(prev => prev.filter(e => e.id !== (data as any).removeEntityId));
            }
            setUserData(prev => prev ? { ...prev, ...data } : null);
          }}
          onUpdateSteps={setStepsRemaining}
        />
          </div>
        </div>
      )}

      {showGoldenDicePicker && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-6 bg-slate-950/95 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-yellow-500/30 p-8 rounded-[2.5rem] shadow-[0_0_50px_rgba(234,179,8,0.2)] max-w-sm w-full text-center space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-300 to-amber-600">🌟 萬能奇蹟骰</h2>
              <p className="text-sm text-yellow-600/80 font-bold leading-relaxed">
                指定您的下一步。慎重選擇落點。
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6].map(num => (
                <button
                  key={num}
                  onClick={() => handleExecuteGoldenDice(num)}
                  className="aspect-square flex items-center justify-center text-3xl font-black rounded-2xl bg-slate-800 border border-slate-700 hover:bg-yellow-500 hover:text-black hover:border-yellow-400 active:scale-95 transition-all text-slate-300"
                >
                  {num}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowGoldenDicePicker(false)}
              className="w-full py-4 text-slate-500 font-bold hover:text-slate-300 transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {undoTarget && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-6 bg-slate-950/95 backdrop-blur-xl animate-in fade-in duration-200 text-center mx-auto">
          <div className="bg-slate-900 border-2 border-slate-800 p-8 rounded-[2.5rem] shadow-2xl max-w-sm w-full text-center space-y-6 mx-auto">
            <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center bg-orange-500/20 text-orange-500 mx-auto text-center"><RotateCcw size={40} className="animate-spin-slow" /></div>
            <h3 className="text-2xl font-black text-white text-center mx-auto">發動時光回溯？</h3><p className="text-slate-400 text-sm font-bold text-center mx-auto">這將會扣除本次修得的 {undoTarget.reward} 修為。</p>
            <div className="flex gap-4 text-center mx-auto"><button onClick={() => setUndoTarget(null)} className="flex-1 py-4 bg-slate-800 text-slate-500 font-black rounded-2xl text-center shadow-lg transition-all active:scale-95">保持現狀</button><button onClick={() => handleUndoCheckInAction(undoTarget)} className="flex-1 py-4 bg-orange-600 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all text-center mx-auto">確認回溯</button></div>
          </div>
        </div>
      )}

      {isSyncing && (
        <div className="fixed inset-0 bg-slate-950/60 z-[1100] flex flex-col items-center justify-center text-center mx-auto">
          <Loader2 className="w-12 h-12 text-orange-500 animate-spin mb-4 mx-auto" />
          <p className="text-orange-500 font-black animate-pulse tracking-widest uppercase text-center mx-auto">與法界同步中...</p>
        </div>
      )}

      {modalMessage && <MessageBox message={modalMessage.text} type={modalMessage.type} image={modalMessage.image} onClose={() => setModalMessage(null)} />}
    </div>
  );
}