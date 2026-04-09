-- ⚠️ 封測前清除所有玩家資料（不可逆）
-- 執行日期：2026-04-09
-- 保留：系統設定、名冊、課程定義、任務設定、法寶設定、成就設定、等級設定、地圖資料

-- 1. 有外鍵依賴的表先清
TRUNCATE TABLE "TransactionLog" CASCADE;
TRUNCATE TABLE "DailyLogs" CASCADE;
TRUNCATE TABLE "Achievements" CASCADE;
TRUNCATE TABLE "W4Applications" CASCADE;
TRUNCATE TABLE "CourseRegistrations" CASCADE;
TRUNCATE TABLE "CourseAttendance" CASCADE;
TRUNCATE TABLE "FinePayments" CASCADE;
TRUNCATE TABLE "SquadFineSubmissions" CASCADE;
TRUNCATE TABLE "BoardGameStats" CASCADE;
TRUNCATE TABLE "BoardGameTransactions" CASCADE;
TRUNCATE TABLE "PeakTrialRegistrations" CASCADE;
TRUNCATE TABLE "PeakTrialReviews" CASCADE;
TRUNCATE TABLE "AdminActivityLog" CASCADE;
TRUNCATE TABLE "MandatoryQuestHistory" CASCADE;

-- 2. 小隊設定歸零（保留隊伍結構，清空金幣和庫存）
UPDATE "TeamSettings" SET
    team_coins = 0,
    inventory = '[]'::jsonb,
    mandatory_quest_id = NULL,
    mandatory_quest_week = NULL,
    quest_draw_history = NULL;

-- 3. 最後清除玩家帳號
TRUNCATE TABLE "CharacterStats" CASCADE;
