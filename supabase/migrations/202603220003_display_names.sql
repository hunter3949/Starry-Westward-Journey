-- 小隊自訂隊名（存在 TeamSettings.display_name）
ALTER TABLE "TeamSettings" ADD COLUMN IF NOT EXISTS display_name TEXT;

-- 大隊自訂隊名（新建 BattalionSettings 表）
CREATE TABLE IF NOT EXISTS "BattalionSettings" (
  battalion_name TEXT PRIMARY KEY,
  display_name   TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
