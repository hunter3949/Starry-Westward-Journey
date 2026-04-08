import React from 'react';

export interface CharacterStats {
  UserID: string;
  Name: string;
  Role: string;
  Level: number;
  Exp: number;
  Coins: number; // Added as per instruction
  EnergyDice: number;
  Spirit: number;
  Physique: number;
  Charisma: number;
  Savvy: number;
  Luck: number;
  Potential: number;
  Streak: number;
  LastCheckIn: string | null;
  TotalFines: number;
  FinePaid: number;  // 已繳款累計（餘額 = TotalFines - FinePaid）
  CurrentQ: number;
  CurrentR: number;
  Email?: string;
  LittleTeamLeagelName?: string;  // 小隊系統法定名稱
  BigTeamLeagelName?: string;     // 大隊系統法定名稱
  LittleTeamNickName?: string;    // 小隊暱稱（由小隊長自行設定）
  BigTeamNickName?: string;       // 大隊暱稱（由大隊長自行設定）
  IsCaptain?: boolean;
  Inventory: string[]; // Changed from optional to required as per instruction
  InitialFortunes?: Record<string, number>;
  DDA_Difficulty?: string;
  GameGold?: number;
  GameInventory?: Array<{ id: string; count: number }>;
  HP?: number;
  MaxHP?: number;
  Facing?: number; // 0-5 direction
  GoldenDice?: number;
  Birthday?: string; // ISO date string YYYY-MM-DD
  IsCommandant?: boolean; // 大隊長
  IsGM?: boolean;         // GM 遊戲管理員
  LineUserId?: string;
  QuestRole?: string;    // 任務角色 JSON 陣列（如 ["先鋒","守護"]）
  IsBlessed?: boolean;   // d7 祝福狀態（梵天庇護，經驗 ×2）
  DemonDropBoostSeasonal?: number; // 心魔殘骸累積掉落加成（每次 +0.05）
}

export interface Roster {
  email: string;
  name?: string;
  birthday?: string;
  BigTeamLeagelName?: string;    // 大隊法定名稱
  LittleTeamLeagelName?: string; // 小隊法定名稱
  is_captain?: boolean;          // 小隊長
  is_commandant?: boolean;       // 大隊長
}

export interface TeamSettings {
  LittleTeamLeagelName: string;
  team_coins: number;
  mandatory_quest_id?: string;       // 本週抽出的推薦定課 QuestID
  mandatory_quest_week?: string;     // 本次抽籤週一日期（YYYY-MM-DD）
  quest_draw_history?: string[];     // 已抽過的 QuestID 陣列
  inventory?: any;
  d7_activated_at?: string;          // d7 渾天至寶珠啟動時間（ISO string），null = 未啟用
}

export interface DailyLog {
  id?: string;
  Timestamp: string;
  UserID: string;
  QuestID: string;
  QuestTitle: string;
  RewardPoints: number;
}

export interface Quest {
  id: string;
  title: string;
  sub?: string;   // 任務名稱（特殊仙緣任務的短名稱，如「跟父母三道菜」）
  desc?: string;  // 任務說明（完成標準說明，如「面對面或是視訊」）
  reward: number;
  coins?: number; // 金幣獎勵（未設定時自動以 reward × 10% 計算）
  dice?: number;
  icon?: string;
  limit?: number;
}

export interface TemporaryQuest extends Quest {
  active: boolean;
  created_at?: string;
}

export interface BonusQuestRule {
  id: string;
  label: string;          // 顯示名稱
  keywords: string[];     // 任一關鍵字命中即觸發
  bonusType: 'energy_dice' | 'golden_dice';
  bonusAmount: number;
  active: boolean;
}

export interface MainQuestEntry {
  id: string;
  topicTitle?: string;  // 主標題 → TopicQuestTitle
  title: string;        // 任務名稱（顯示於 UI 的簡短名稱）
  description?: string; // 任務說明（詳細描述）
  reward: number;
  coins: number;
  startDate: string; // YYYY-MM-DD
}

export interface SystemSettings {
  TopicQuestTitle: string;
  TopicQuestReward?: string;    // 主線任務修為（預設 1000）
  TopicQuestCoins?: string;     // 主線任務金幣（預設 100）
  MainQuestSchedule?: string;      // JSON: MainQuestEntry[]
  MainQuestAppliedId?: string;     // 最後自動套用的排程 ID
  TopicQuestDescription?: string;  // 主線任務說明
  WorldState?: string;
  WorldStateMsg?: string;
  RegistrationMode?: 'open' | 'roster'; // 'open' = 自由註冊；'roster' = 名單驗證
  VolunteerPassword?: string;
  DefinedSquads?: string; // JSON: {teamId: string, squadId: string}[]
  DefinedBattalions?: string; // JSON: string[]
  SiteName?: string;
  SiteLogo?: string; // base64 data URL
  CardMottos?: string; // JSON: string[]
  CardBackImage?: string; // base64 data URL
  BonusQuestConfig?: string; // JSON: BonusQuestRule[]
  BoardGameEnabled?: string;              // 'true' | 'false'
  BoardGameBuyRate?: string;              // 買匯：1 福報 = N 現金（福報→現金）
  BoardGameSellRate?: string;             // 賣匯：N 現金 = 1 福報（現金→福報）
  BoardGameSellEnabled?: string;          // 'true' | 'false'：是否允許賣匯
  BoardGameRateUpdatedAt?: string;        // ISO timestamp，每次更新匯率時寫入以觸發前台通知
  BoardGameZeroEnabled?: string;          // 'true' | 'false'：人生歸零按鍵
  BoardGameZeroCashMultiplier?: string;   // 現金 × N
  BoardGameZeroBlessingMultiplier?: string; // 福報 × N
}

export interface BoardGameStats {
  user_id: string;
  cash: number;
  blessing: number;
  updated_at?: string;
}

export interface W4Application {
  id: string;
  user_id: string;
  user_name: string;
  squad_name?: string;
  battalion_name?: string;
  interview_target: string;
  interview_date: string;
  description?: string;
  quest_id: string;
  status: 'pending' | 'squad_approved' | 'battalion_approved' | 'approved' | 'rejected';
  squad_review_by?: string;
  squad_review_at?: string;
  squad_review_notes?: string;
  final_review_by?: string;
  final_review_at?: string;
  final_review_notes?: string;
  created_at?: string;
}

export interface AdminLog {
  id: string;
  action: string;
  actor?: string;
  target_id?: string;
  target_name?: string;
  details?: Record<string, any>;
  result?: string;
  created_at: string;
}

export interface Testimony {
  id: string;
  line_group_id: string | null;
  line_user_id: string;
  display_name: string | null;
  parsed_name: string | null;
  parsed_date: string | null;
  parsed_category: string | null;
  content: string;
  raw_message: string;
  created_at: string;
}

export interface TopicHistory {
  id: number;
  TopicTitle: string;
  created_at: string;
}

export interface TerrainInfo {
  id: string;
  name: string;
  url: string;
  scale: number;
  vOffset: number;
  color: string;
  effect: string;
}

export interface ZoneInfo {
  id: string;
  name: string;
  char?: string;
  color: string;
  textColor: string;
  icon: React.ReactNode;
}

export interface HexPos {
  q: number;
  r: number;
  x: number;
  y: number;
}

export interface WeeklyReview {
  summary: string;
  quote: string;
  trend: 'up' | 'down' | 'stable';
  weeklyRate: number;
}

export interface CaptainBriefing {
  teamSummary: string;
  topPerformer: string;
  needsSupport: string[];
  suggestion: string;
  teamMorale: 'high' | 'medium' | 'low';
}

export interface HexData extends HexPos {
  type: 'center' | 'corridor' | 'subzone';
  terrainId?: string;
  color: string;
  key: string;
  zoneId?: string;
  subIdx?: number;
  ring?: 'crisp' | 'performance' | 'culled';
}

export interface FinePaymentRecord {
  id: string;
  user_id: string;
  user_name: string;
  squad_name: string;
  amount: number;
  period_label: string;
  paid_to_captain_at: string | null;   // 隊員上繳小隊長日期
  submitted_to_org_at: string | null;  // 小隊長上繳大會日期（DB 保留，UI 不顯示）
  recorded_by: string;
  created_at: string;
}

export interface SquadFineSubmission {
  id: string;
  squad_name: string;
  amount: number;
  submitted_at: string;  // YYYY-MM-DD
  recorded_by: string;
  notes: string | null;
  created_at: string;
}

export interface AchievementRecord {
  achievement_id: string;
  unlocked_at: string;
}

export interface CourseRegistration {
  id: string;
  user_id: string;
  course_key: string;
  registered_at: string;
}

export interface Course {
  id: string;
  name: string;
  date: string;
  date_display: string;
  time: string;
  location: string;
  address?: string;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
}

export interface PeakTrial {
  id: string;
  title: string;
  description?: string;
  date: string;         // YYYY-MM-DD
  time?: string;
  location?: string;
  max_participants?: number;
  battalion_name?: string;
  created_by: string;   // 建立者 UserID 或 'admin'
  is_active: boolean;
  created_at: string;
  registration_count?: number; // 由 listPeakTrials 計算帶入
}

export interface PeakTrialReview {
  id: string;
  trial_id: string;
  trial_title: string;
  battalion_name: string;
  submitted_by: string;
  own_participants: number;
  cross_participants: number;
  reward_per_person: number;
  total_members: number;
  photo_data?: string;
  video_url?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  created_at: string;
}

export interface PeakTrialRegistration {
  id: string;
  trial_id: string;
  user_id: string;
  user_name: string;
  squad_name?: string;
  battalion_name?: string;
  registered_at: string;
  attended: boolean;
  attended_at?: string;
}
