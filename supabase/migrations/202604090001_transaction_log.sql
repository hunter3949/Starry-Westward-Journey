-- 通用修為/金幣異動紀錄表
CREATE TABLE IF NOT EXISTS "TransactionLog" (
    "id"         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "user_id"    TEXT NOT NULL,
    "type"       TEXT NOT NULL,          -- quest_checkin, artifact_purchase, coin_transfer, course_reward, peak_trial_reward, bonus_settle, skill_reward
    "label"      TEXT NOT NULL,          -- 顯示用標題（如「購買如意金箍棒」「課後課報到」）
    "exp_delta"  INTEGER NOT NULL DEFAULT 0,   -- 正=獲得，負=扣除
    "coins_delta" INTEGER NOT NULL DEFAULT 0,
    "detail"     JSONB,                  -- 額外資訊（如 quest_id, artifact_id 等）
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_txlog_user_id ON "TransactionLog" (user_id);
CREATE INDEX IF NOT EXISTS idx_txlog_created_at ON "TransactionLog" (created_at DESC);

-- RLS
ALTER TABLE "TransactionLog" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_txlog" ON "TransactionLog";
CREATE POLICY "anon_select_txlog" ON "TransactionLog" FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "anon_insert_txlog" ON "TransactionLog";
CREATE POLICY "anon_insert_txlog" ON "TransactionLog" FOR INSERT TO anon WITH CHECK (true);
