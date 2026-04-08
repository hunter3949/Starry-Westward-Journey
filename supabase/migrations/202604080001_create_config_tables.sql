-- ============================================================
-- 一次性建立巨笑版獨有的 3 張設定表 + 補欄位
-- ============================================================

-- 1. DailyQuestConfig
CREATE TABLE IF NOT EXISTS "DailyQuestConfig" (
    "id"         TEXT PRIMARY KEY,
    "title"      TEXT NOT NULL,
    "sub"        TEXT,
    "desc"       TEXT,
    "reward"     INTEGER NOT NULL DEFAULT 100,
    "coins"      INTEGER,
    "dice"       INTEGER NOT NULL DEFAULT 1,
    "icon"       TEXT,
    "limit"      INTEGER,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active"  BOOLEAN NOT NULL DEFAULT TRUE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

-- 2. ArtifactConfig
CREATE TABLE IF NOT EXISTS "ArtifactConfig" (
    "id"              TEXT PRIMARY KEY,
    "name"            TEXT NOT NULL,
    "description"     TEXT NOT NULL DEFAULT '',
    "effect"          TEXT NOT NULL DEFAULT '',
    "price"           INTEGER NOT NULL DEFAULT 0,
    "is_team_binding" BOOLEAN NOT NULL DEFAULT FALSE,
    "limit"           INTEGER NOT NULL DEFAULT 1,
    "exclusive_with"  TEXT,
    "is_active"       BOOLEAN NOT NULL DEFAULT TRUE,
    "sort_order"      INTEGER NOT NULL DEFAULT 0,
    "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

-- 2b. ArtifactConfig 加成欄位
ALTER TABLE "ArtifactConfig"
  ADD COLUMN IF NOT EXISTS "exp_multiplier_personal" NUMERIC,
  ADD COLUMN IF NOT EXISTS "exp_multiplier_team"     NUMERIC,
  ADD COLUMN IF NOT EXISTS "exp_bonus_personal"      INTEGER,
  ADD COLUMN IF NOT EXISTS "exp_bonus_team"          INTEGER;

UPDATE "ArtifactConfig" SET "exp_multiplier_personal" = 1.2  WHERE "id" = 'a1';
UPDATE "ArtifactConfig" SET "exp_bonus_personal"      = 150  WHERE "id" = 'a2';
UPDATE "ArtifactConfig" SET "exp_multiplier_team"     = 1.5  WHERE "id" = 'a3';
UPDATE "ArtifactConfig" SET "exp_multiplier_personal" = 1.5  WHERE "id" = 'a4';
UPDATE "ArtifactConfig" SET "exp_multiplier_personal" = 1.2  WHERE "id" = 'a5';

-- 2c. ArtifactConfig icon 欄位
ALTER TABLE "ArtifactConfig"
  ADD COLUMN IF NOT EXISTS "icon" TEXT;

-- 3. AchievementConfig
CREATE TABLE IF NOT EXISTS "AchievementConfig" (
    "id"             TEXT PRIMARY KEY,
    "name"           TEXT NOT NULL,
    "rarity"         TEXT NOT NULL DEFAULT 'common',
    "icon"           TEXT NOT NULL DEFAULT '🏅',
    "hint"           TEXT NOT NULL DEFAULT '',
    "description"    TEXT NOT NULL DEFAULT '',
    "role_exclusive" TEXT,
    "is_active"      BOOLEAN NOT NULL DEFAULT TRUE,
    "sort_order"     INTEGER NOT NULL DEFAULT 0,
    "created_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO "AchievementConfig"
  ("id","name","rarity","icon","hint","description","role_exclusive","is_active","sort_order")
VALUES
  ('first_step',        '千里之行',   'common',    '👣', '萬事起於足下…',               '完成了人生第一個定課',                                           NULL, TRUE, 1),
  ('full_day',          '圓滿一日',   'common',    '🌕', '今日已盡，無悔矣',              '在同一邏輯日完成 3 個定課',                                      NULL, TRUE, 2),
  ('streak_3',          '三日不輟',   'common',    '🔥', '三天，是個開始…',               '連續 3 天完成打拳定課',                                          NULL, TRUE, 3),
  ('dawn_boxer',        '破曉修士',   'common',    '🌅', '清晨的微光有你的身影',           '累計破曉打拳 5 次',                                              NULL, TRUE, 4),
  ('veg_pioneer',       '蓮台素客',   'common',    '🥬', '一飲一啄，皆有定數…',            '累計海鮮素 20 次',                                               NULL, TRUE, 5),
  ('early_sleeper',     '夜歸明月',   'common',    '🌙', '子時前已入夢…',                 '累計子時入睡 20 次',                                             NULL, TRUE, 6),
  ('weekly_caller',     '小天使之約', 'common',    '📞', '緣分自有定時…',                 '累計小天使通話 5 次',                                            NULL, TRUE, 7),
  ('comeback',          '回頭是岸',   'rare',      '🔄', '路雖繞，終能歸…',               '某項定課超過 7 天未做，今日重新完成',                              NULL, TRUE, 8),
  ('streak_7',          '七日精進',   'rare',      '⚡', '七，是完整的數字…',             '連續 7 天完成打拳定課',                                          NULL, TRUE, 9),
  ('full_week',         '圓滿五日',   'rare',      '🗓️', '無一日荒廢…',                  '連續 5 天各完成至少 1 個定課',                                   NULL, TRUE, 10),
  ('dawn_devotee',      '寅時武者',   'rare',      '🌄', '天還未亮，你已…',               '累計破曉打拳 20 次',                                             NULL, TRUE, 11),
  ('meditation_master', '定慧之境',   'rare',      '🧘', '心靜方能見本性…',               '累計感恩冥想 30 次',                                             NULL, TRUE, 12),
  ('dance_devotee',     '當下之身',   'rare',      '💃', '舞動即是修行…',                 '累計當下之舞 30 次',                                             NULL, TRUE, 13),
  ('role_cure_10',      '破執之路',   'rare',      '💊', '心魔有名，方能破解…',            '累計完成解毒定課 10 次',                                         NULL, TRUE, 14),
  ('w4_giver',          '傳愛使者',   'rare',      '💌', '愛是唯一不減的資源…',            '累計傳愛任務 10 次',                                             NULL, TRUE, 15),
  ('topic_devotee',     '主題探索者', 'rare',      '🔍', '每個主題都是一扇門…',            '累計主題親證 5 次',                                              NULL, TRUE, 16),
  ('yuanmeng',          '圓夢行者',   'rare',      '🌟', '夢想不是用想的…',               '累計親證圓夢 3 次',                                              NULL, TRUE, 17),
  ('all_daily',         '七藝初探',   'rare',      '🎯', '七種修行，缺一不可…',            '每項日課各完成過一次',                                           NULL, TRUE, 18),
  ('temp_master',       '隨機應變',   'rare',      '🎲', '世事難料，但你準備好了…',        '累計完成臨時任務 5 次',                                          NULL, TRUE, 19),
  ('marathon',          '百日征途',   'epic',      '🏃', '修行路上，計步者長',             '累計完成 100 個定課',                                            NULL, TRUE, 20),
  ('mastery_q1',        '打拳宗師',   'epic',      '🥊', '拳不離手，曲不離口…',            '累計打拳 50 次',                                                 NULL, TRUE, 21),
  ('phoenix',           '浴火重生',   'epic',      '🦅', '塵封已久的修行，重新燃起…',      '某項定課超過 14 天未做，今日重新完成',                            NULL, TRUE, 22),
  ('streak_30',         '月之恆心',   'epic',      '🌕', '月滿則虧，但在滿之前…',          '連續 30 天完成打拳定課',                                         NULL, TRUE, 23),
  ('role_cure_50',      '執念消融',   'epic',      '🌊', '重複，是最深的修行…',            '累計完成解毒定課 50 次',                                         NULL, TRUE, 24),
  ('five_hundred',      '五百修為',   'epic',      '💎', '路遙知馬力…',                   '累計完成 500 個定課',                                            NULL, TRUE, 25),
  ('dawn_legend',       '破曉傳說',   'epic',      '🌠', '日日破曉，心不曾眠…',            '累計破曉打拳 50 次',                                             NULL, TRUE, 26),
  ('full_month',        '月圓無缺',   'epic',      '📅', '一月之中，滴水不漏…',            '連續 20 天各完成至少 1 個定課',                                  NULL, TRUE, 27),
  ('prodigal',          '置之死地',   'legendary', '♾️', '有些事，你以為永遠不會再做了…',  '某項定課超過 30 天未做，今日重新完成',                           NULL, TRUE, 28),
  ('omnipractice',      '無所不修',   'legendary', '🌈', '修行無邊，卻有人走遍…',          '完成過所有類型定課（q1-q7、w1-w4、t、bd_yuanmeng）',             NULL, TRUE, 29),
  ('eternal_dawn',      '永恆破曉',   'legendary', '☀️', '傳說中有人，每日破曉…',          '連續 7 天完成破曉打拳',                                          NULL, TRUE, 30),
  ('team_punch',        '同心齊拳',   'rare',      '🤜', '獨行者快，眾行者遠…',            '與隊友在同一天都完成了打拳定課',                                 NULL, TRUE, 31),
  ('team_perfect',      '眾志成城',   'epic',      '🏆', '你的小隊創造了奇蹟…',            '小隊全員在同一天都有打卡記錄',                                   NULL, TRUE, 32),
  ('team_streak',       '共修三日',   'epic',      '🤝', '同行三天，心更近了…',            '與任一隊友連續 3 天同日完成打拳',                                NULL, TRUE, 33),
  ('wukong_dawn',       '齊天武聖',   'epic',      '🐒', '某位鬥戰勝佛的傳人…',            '身為孫悟空，累計破曉打拳 30 次',                                 '孫悟空', TRUE, 34),
  ('wukong_spirit',     '火眼金睛',   'rare',      '👁️', '神識洞明，萬象皆透…',           '神識屬性達到 20 點',                                             '孫悟空', TRUE, 35),
  ('bajie_veg',         '齋戒持身',   'epic',      '🐷', '老豬也有清靜之日…',             '身為豬八戒，累計海鮮素 30 次',                                   '豬八戒', TRUE, 36),
  ('bajie_physique',    '根骨渾厚',   'rare',      '💪', '力大無窮，從此而來…',            '根骨屬性達到 20 點',                                             '豬八戒', TRUE, 37),
  ('wujing_chant',      '悟淨持念',   'epic',      '🏺', '水中沙，心中定…',               '身為沙悟淨，累計嗯啊吽七次 30 次',                              '沙悟淨', TRUE, 38),
  ('wujing_savvy',      '慧根深種',   'rare',      '🌿', '悟性如流水，無形無礙…',          '悟性屬性達到 20 點',                                             '沙悟淨', TRUE, 39),
  ('horse_gratitude',   '五感圓融',   'epic',      '🐴', '馬行千里，感恩相隨…',            '身為白龍馬，累計五感恩 30 次',                                   '白龍馬', TRUE, 40),
  ('horse_charisma',    '魅力非凡',   'rare',      '✨', '行者之魅，眾人傾心…',            '魅力屬性達到 20 點',                                             '白龍馬', TRUE, 41),
  ('monk_dance',        '疑心盡消',   'epic',      '🧧', '師父的心，終於放下…',            '身為唐三藏，累計當下之舞 30 次',                                 '唐三藏', TRUE, 42),
  ('monk_streak',       '取經之心',   'legendary', '📿', '十萬八千里，一步未停…',          '連續 14 天有完成任意定課',                                       '唐三藏', TRUE, 43)
ON CONFLICT ("id") DO NOTHING;
