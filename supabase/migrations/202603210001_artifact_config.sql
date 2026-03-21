-- ArtifactConfig: DB-driven artifact definitions for 天庭藏寶閣
CREATE TABLE IF NOT EXISTS "ArtifactConfig" (
    "id"              TEXT PRIMARY KEY,      -- a1, a2, a3, ...
    "name"            TEXT NOT NULL,
    "description"     TEXT NOT NULL DEFAULT '',
    "effect"          TEXT NOT NULL DEFAULT '',
    "price"           INTEGER NOT NULL DEFAULT 0,
    "is_team_binding" BOOLEAN NOT NULL DEFAULT FALSE,
    "limit"           INTEGER NOT NULL DEFAULT 1,
    "exclusive_with"  TEXT,                 -- 互斥法寶 ID
    "is_active"       BOOLEAN NOT NULL DEFAULT TRUE,
    "sort_order"      INTEGER NOT NULL DEFAULT 0,
    "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed with hardcoded ARTIFACTS_CONFIG values
INSERT INTO "ArtifactConfig"
  ("id","name","description","effect","price","is_team_binding","limit","exclusive_with","is_active","sort_order")
VALUES
  ('a1','如意金箍棒','齊天大聖孫悟空的至寶，變化萬千，每人限定一把。','個人總經驗獲取 ×1.2 倍',1200,FALSE,1,NULL,TRUE,1),
  ('a2','照妖鏡','「照見」——日出前的清醒自照，破曉打拳的修行哲學。','破曉打拳額外 +150 修為（不可回溯）',250,FALSE,1,NULL,TRUE,2),
  ('a3','七彩袈裟','唐三藏的聖物，象徵精進修行的榮耀。','全隊打拳經驗 ×1.5 倍',550,TRUE,99,NULL,TRUE,3),
  ('a4','幌金繩','金角大王的法寶，能縛住一切貪著。','參加體系活動個人經驗 ×1.5 倍',700,TRUE,99,NULL,TRUE,4),
  ('a5','金剛杖','六十歲以上修煉者專屬道具，無法與如意金箍棒疊加。','個人總經驗 ×1.2 倍（60歲以上長輩免費贈；不可與如意金箍棒疊加）',0,FALSE,1,'a1',TRUE,5),
  ('a6','定風珠','「靜心」——定風珠能令人心定氣閒，如如不動，對治浮躁。','親證圓夢計劃每次完成 +300 修為（每週上限 3 次）',650,FALSE,1,NULL,TRUE,6)
ON CONFLICT ("id") DO NOTHING;
