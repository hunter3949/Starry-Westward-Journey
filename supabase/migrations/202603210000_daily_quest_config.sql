-- DailyQuestConfig: DB-driven daily quest definitions
CREATE TABLE IF NOT EXISTS "DailyQuestConfig" (
    "id"         TEXT PRIMARY KEY,           -- e.g. q1, q2, q9, q10
    "title"      TEXT NOT NULL,              -- 顯示主標題 e.g. 打拳
    "sub"        TEXT,                       -- 副標題 e.g. 身體開發
    "desc"       TEXT,                       -- 完成說明
    "reward"     INTEGER NOT NULL DEFAULT 100,
    "coins"      INTEGER,                       -- NULL = 使用預設規則（exp * 0.1）
    "dice"       INTEGER NOT NULL DEFAULT 1,
    "icon"       TEXT,
    "limit"      INTEGER,                    -- NULL = unlimited
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active"  BOOLEAN NOT NULL DEFAULT TRUE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed with the current hardcoded values
INSERT INTO "DailyQuestConfig" ("id","title","sub","reward","dice","sort_order","is_active") VALUES
  ('q1',  '打拳',      '身體開發',  200, 1, 1,  TRUE),
  ('q2',  '感恩冥想',  '對治嗔心',  100, 1, 2,  TRUE),
  ('q3',  '當下之舞',  '對治疑心',  100, 1, 3,  TRUE),
  ('q4',  '嗯啞吽七次','覺醒痴念',  100, 1, 4,  TRUE),
  ('q5',  '五感恩',    '放下傲慢',  100, 1, 5,  TRUE),
  ('q6',  '海鮮素',    '節制貪慾',  100, 1, 6,  TRUE),
  ('q7',  '子時入睡',  '能量補給',  100, 1, 7,  TRUE),
  ('q8',  '高階定課1', '進階修行',  100, 1, 8,  TRUE),
  ('q9',  '高階定課2', '進階修行',  100, 1, 9,  TRUE)
ON CONFLICT ("id") DO NOTHING;
