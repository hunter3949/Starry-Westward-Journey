-- 等級門檻設定表
CREATE TABLE IF NOT EXISTS "LevelConfig" (
    "level"      INTEGER PRIMARY KEY,    -- 等級 1-99
    "exp_required" INTEGER NOT NULL,     -- 升到此等級所需的累計經驗（從上一級起算）
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 用預設公式 (level × 5 + 480) 種子 1-99 級
INSERT INTO "LevelConfig" ("level", "exp_required")
SELECT g, g * 5 + 480
FROM generate_series(1, 99) AS g
ON CONFLICT ("level") DO NOTHING;

-- RLS
ALTER TABLE "LevelConfig" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_lc" ON "LevelConfig";
CREATE POLICY "anon_select_lc" ON "LevelConfig" FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "anon_update_lc" ON "LevelConfig";
CREATE POLICY "anon_update_lc" ON "LevelConfig" FOR UPDATE TO anon USING (true) WITH CHECK (true);
