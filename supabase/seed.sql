-- ============================================================
-- 測試資料 Seed Script
-- 執行方式：貼入 Supabase Dashboard > SQL Editor > Run
-- ============================================================
-- 登入方式：姓名 + 手機末三碼
-- UserID 規則：10碼手機去掉開頭0 → 9碼
--   e.g. 0912340001 → 912340001 → 末三碼 001
-- ============================================================
-- 架構：3 大隊 × 3 小隊 = 9 小隊（小隊編號全域不重置）
--   第一大隊：第一小隊、第二小隊、第三小隊
--   第二大隊：第四小隊、第五小隊、第六小隊
--   第三大隊：第七小隊、第八小隊、第九小隊
-- 每個大隊：1 名大隊長（IsCommandant=true）
-- 每個小隊：1 名小隊長（IsCaptain=true）+ 6 名成員
-- 共 1(GM) + 3(大隊長) + 9(小隊長) + 54(成員) = 67 人
-- ============================================================

-- ============================================================
-- 0. Schema Migration（安全可重複執行）
-- CharacterStats: SquadName/TeamName → LittleTeamLeagelName/BigTeamLeagelName
-- CharacterStats: 新增 LittleTeamNickName / BigTeamNickName / QuestRole
-- Rosters:        squad_name/team_name → big_team_name/little_team_name
-- ============================================================
DO $$
BEGIN
  -- CharacterStats: 舊欄位重命名
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'CharacterStats' AND column_name = 'SquadName'
  ) THEN
    ALTER TABLE public."CharacterStats" RENAME COLUMN "SquadName" TO "LittleTeamLeagelName";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'CharacterStats' AND column_name = 'TeamName'
  ) THEN
    ALTER TABLE public."CharacterStats" RENAME COLUMN "TeamName" TO "BigTeamLeagelName";
  END IF;

  -- CharacterStats: 新增欄位（若不存在）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'CharacterStats' AND column_name = 'LittleTeamNickName'
  ) THEN
    ALTER TABLE public."CharacterStats" ADD COLUMN "LittleTeamNickName" TEXT DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'CharacterStats' AND column_name = 'BigTeamNickName'
  ) THEN
    ALTER TABLE public."CharacterStats" ADD COLUMN "BigTeamNickName" TEXT DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'CharacterStats' AND column_name = 'QuestRole'
  ) THEN
    ALTER TABLE public."CharacterStats" ADD COLUMN "QuestRole" TEXT DEFAULT NULL;
  END IF;

  -- SystemSettings: 新增欄位（若不存在）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'SystemSettings' AND column_name = 'DefinedBattalions'
  ) THEN
    ALTER TABLE public."SystemSettings" ADD COLUMN "DefinedBattalions" TEXT DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'SystemSettings' AND column_name = 'DefinedSquads'
  ) THEN
    ALTER TABLE public."SystemSettings" ADD COLUMN "DefinedSquads" TEXT DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'SystemSettings' AND column_name = 'SiteName'
  ) THEN
    ALTER TABLE public."SystemSettings" ADD COLUMN "SiteName" TEXT DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'SystemSettings' AND column_name = 'SiteLogo'
  ) THEN
    ALTER TABLE public."SystemSettings" ADD COLUMN "SiteLogo" TEXT DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'SystemSettings' AND column_name = 'CardMottos'
  ) THEN
    ALTER TABLE public."SystemSettings" ADD COLUMN "CardMottos" TEXT DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'SystemSettings' AND column_name = 'CardBackImage'
  ) THEN
    ALTER TABLE public."SystemSettings" ADD COLUMN "CardBackImage" TEXT DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'SystemSettings' AND column_name = 'MainQuestSchedule'
  ) THEN
    ALTER TABLE public."SystemSettings" ADD COLUMN "MainQuestSchedule" TEXT DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'SystemSettings' AND column_name = 'MainQuestAppliedId'
  ) THEN
    ALTER TABLE public."SystemSettings" ADD COLUMN "MainQuestAppliedId" TEXT DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'SystemSettings' AND column_name = 'TopicQuestReward'
  ) THEN
    ALTER TABLE public."SystemSettings" ADD COLUMN "TopicQuestReward" TEXT DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'SystemSettings' AND column_name = 'TopicQuestCoins'
  ) THEN
    ALTER TABLE public."SystemSettings" ADD COLUMN "TopicQuestCoins" TEXT DEFAULT NULL;
  END IF;

  -- Rosters: 舊欄位逐步重命名至標準欄位名稱
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Rosters' AND column_name = 'squad_name'
  ) THEN
    ALTER TABLE public."Rosters" RENAME COLUMN "squad_name" TO "BigTeamLeagelName";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Rosters' AND column_name = 'team_name'
  ) THEN
    ALTER TABLE public."Rosters" RENAME COLUMN "team_name" TO "LittleTeamLeagelName";
  END IF;

  -- 中繼名稱也一起處理（若從 big_team_name/little_team_name 過渡）
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Rosters' AND column_name = 'big_team_name'
  ) THEN
    ALTER TABLE public."Rosters" RENAME COLUMN "big_team_name" TO "BigTeamLeagelName";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Rosters' AND column_name = 'little_team_name'
  ) THEN
    ALTER TABLE public."Rosters" RENAME COLUMN "little_team_name" TO "LittleTeamLeagelName";
  END IF;

  -- TeamSettings: 主鍵欄位 team_name → LittleTeamLeagelName
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'TeamSettings' AND column_name = 'team_name'
  ) THEN
    ALTER TABLE public."TeamSettings" RENAME COLUMN "team_name" TO "LittleTeamLeagelName";
  END IF;
END $$;

-- 清空舊資料（依外鍵順序）
TRUNCATE public."DailyLogs", public."MandatoryQuestHistory", public."W4Applications",
         public."AdminActivityLog", public."MapEntities",
         public."CharacterStats", public."TeamSettings",
         public."SystemSettings", public."Rosters",
         public."temporaryquests", public."TopicHistory" CASCADE;

-- ============================================================
-- 1. SystemSettings
-- ============================================================
INSERT INTO public."SystemSettings" (
  "SettingName", "TopicQuestTitle", "WorldState", "WorldStateMsg",
  "RegistrationMode", "VolunteerPassword",
  "DefinedBattalions", "DefinedSquads",
  "SiteName"
)
VALUES (
  'global',
  '本週主題：慈悲心',
  'normal',
  '世界平靜，適合修行。',
  'roster',
  'volunteer123',
  '["第一大隊","第二大隊","第三大隊"]',
  '[{"teamId":"第一大隊","squadId":"第一小隊"},{"teamId":"第一大隊","squadId":"第二小隊"},{"teamId":"第一大隊","squadId":"第三小隊"},{"teamId":"第二大隊","squadId":"第四小隊"},{"teamId":"第二大隊","squadId":"第五小隊"},{"teamId":"第二大隊","squadId":"第六小隊"},{"teamId":"第三大隊","squadId":"第七小隊"},{"teamId":"第三大隊","squadId":"第八小隊"},{"teamId":"第三大隊","squadId":"第九小隊"}]',
  '大無限開運西遊'
);

-- ============================================================
-- 2. TeamSettings（9 個小隊）
-- ============================================================
INSERT INTO public."TeamSettings" ("LittleTeamLeagelName", "team_coins", "mandatory_quest_id", "mandatory_quest_week", "quest_draw_history", "inventory")
VALUES
  ('第一小隊', 1200, 'w1', '2026-W12', '["w1"]'::jsonb,           '[]'::jsonb),
  ('第二小隊', 1500, 'w2', '2026-W12', '["w1","w2"]'::jsonb,      '["a3"]'::jsonb),
  ('第三小隊',  900, 'w1', '2026-W12', '["w1"]'::jsonb,           '[]'::jsonb),
  ('第四小隊', 1800, 'w3', '2026-W12', '["w1","w2","w3"]'::jsonb, '["a3"]'::jsonb),
  ('第五小隊', 1100, 'w1', '2026-W12', '["w1"]'::jsonb,           '[]'::jsonb),
  ('第六小隊', 2000, 'w2', '2026-W12', '["w1","w2"]'::jsonb,      '["a3","a4"]'::jsonb),
  ('第七小隊',  800, 'w1', '2026-W12', '["w1"]'::jsonb,           '[]'::jsonb),
  ('第八小隊', 1300, 'w2', '2026-W12', '["w1","w2"]'::jsonb,      '[]'::jsonb),
  ('第九小隊', 1600, 'w1', '2026-W12', '["w1"]'::jsonb,           '["a3"]'::jsonb);

-- ============================================================
-- 3. CharacterStats
-- ============================================================

-- ── GM ───────────────────────────────────────────────────────
-- 林大統  手機:0912340001 → UserID:912340001 → 末三碼:001
INSERT INTO public."CharacterStats"
  ("UserID","Name","Role","Level","Exp","Coins","EnergyDice","Spirit","Physique","Charisma","Savvy","Luck","Potential",
   "Streak","TotalFines","FinePaid","CurrentQ","CurrentR","Email","LittleTeamLeagelName","BigTeamLeagelName",
   "IsCaptain","GameGold","HP","MaxHP","Facing","GoldenDice","IsCommandant","IsGM","DDA_Difficulty","QuestRole")
VALUES
  ('912340001','林大統','指揮官',15,15000,8000,10,90,85,95,80,90,70,
   20,0,0,0,0,'gm@bigsmile.com','指揮部','指揮部',
   false,1000,100,100,0,5,true,true,'medium',NULL);

-- ── 大隊長（IsCommandant=true）────────────────────────────────
-- 大隊長無固定小隊（LittleTeamLeagelName=NULL），管轄整個大隊
-- 陳志豪(002) 第一大隊  黃建明(003) 第二大隊  李永誠(004) 第三大隊
INSERT INTO public."CharacterStats"
  ("UserID","Name","Role","Level","Exp","Coins","EnergyDice","Spirit","Physique","Charisma","Savvy","Luck","Potential",
   "Streak","TotalFines","FinePaid","CurrentQ","CurrentR","Email","LittleTeamLeagelName","BigTeamLeagelName",
   "IsCaptain","GameGold","HP","MaxHP","Facing","GoldenDice","IsCommandant","IsGM","DDA_Difficulty","QuestRole")
VALUES
  ('912340002','陳志豪','孫悟空',10,9800,4500,8,80,75,85,70,82,58,
   18,0,0,1,0,'cmd1@bigsmile.com',NULL,'第一大隊',
   false,750,100,100,0,3,true,false,'hard','["大隊長"]'),

  ('912340003','黃建明','孫悟空',9,8600,4000,7,76,72,80,65,78,52,
   16,0,0,0,1,'cmd2@bigsmile.com',NULL,'第二大隊',
   false,680,100,100,0,2,true,false,'hard','["大隊長"]'),

  ('912340004','李永誠','孫悟空',10,9200,4200,8,78,74,82,68,80,55,
   17,0,0,-1,0,'cmd3@bigsmile.com',NULL,'第三大隊',
   false,720,100,100,0,3,true,false,'hard','["大隊長"]');

-- ── 第一大隊 小隊長（IsCaptain=true）─────────────────────────
-- 王美玲(005)第一小隊  張文彥(006)第二小隊  吳佳蓉(007)第三小隊
INSERT INTO public."CharacterStats"
  ("UserID","Name","Role","Level","Exp","Coins","EnergyDice","Spirit","Physique","Charisma","Savvy","Luck","Potential",
   "Streak","TotalFines","FinePaid","CurrentQ","CurrentR","Email","LittleTeamLeagelName","BigTeamLeagelName",
   "IsCaptain","GameGold","HP","MaxHP","Facing","GoldenDice","IsCommandant","IsGM","DDA_Difficulty","QuestRole")
VALUES
  ('912340005','王美玲','豬八戒',7,6500,2200,5,64,60,68,52,72,40,
   12,100,100,2,0,'cap1@test.com','第一小隊','第一大隊',
   true,420,100,100,0,1,false,false,'medium','["小隊長"]'),

  ('912340006','張文彥','沙悟淨',7,6400,2200,5,66,62,70,54,73,42,
   12,0,0,-2,1,'cap2@test.com','第二小隊','第一大隊',
   true,420,100,100,0,1,false,false,'medium','["小隊長","叮叮隊長"]'),

  ('912340007','吳佳蓉','白龍馬',6,5800,2000,5,60,65,64,52,68,40,
   10,200,200,1,2,'cap3@test.com','第三小隊','第一大隊',
   true,360,100,100,0,1,false,false,'easy','["小隊長"]');

-- ── 第二大隊 小隊長（IsCaptain=true）─────────────────────────
-- 劉志強(008)第四小隊  蔡欣怡(009)第五小隊  許明達(010)第六小隊
INSERT INTO public."CharacterStats"
  ("UserID","Name","Role","Level","Exp","Coins","EnergyDice","Spirit","Physique","Charisma","Savvy","Luck","Potential",
   "Streak","TotalFines","FinePaid","CurrentQ","CurrentR","Email","LittleTeamLeagelName","BigTeamLeagelName",
   "IsCaptain","GameGold","HP","MaxHP","Facing","GoldenDice","IsCommandant","IsGM","DDA_Difficulty","QuestRole")
VALUES
  ('912340008','劉志強','唐三藏',8,7200,2800,6,70,68,74,60,76,46,
   14,0,0,3,-1,'cap4@test.com','第四小隊','第二大隊',
   true,500,100,100,0,2,false,false,'hard','["小隊長"]'),

  ('912340009','蔡欣怡','孫悟空',6,5600,2000,5,64,60,68,52,71,39,
   11,100,100,0,-2,'cap5@test.com','第五小隊','第二大隊',
   true,390,100,100,0,1,false,false,'medium','["小隊長"]'),

  ('912340010','許明達','豬八戒',7,6800,2400,6,68,64,72,58,74,44,
   13,0,0,-1,-2,'cap6@test.com','第六小隊','第二大隊',
   true,460,100,100,0,2,false,false,'medium','["小隊長","副隊長"]');

-- ── 第三大隊 小隊長（IsCaptain=true）─────────────────────────
-- 鄭淑芬(011)第七小隊  謝宗翰(012)第八小隊  江麗雲(013)第九小隊
INSERT INTO public."CharacterStats"
  ("UserID","Name","Role","Level","Exp","Coins","EnergyDice","Spirit","Physique","Charisma","Savvy","Luck","Potential",
   "Streak","TotalFines","FinePaid","CurrentQ","CurrentR","Email","LittleTeamLeagelName","BigTeamLeagelName",
   "IsCaptain","GameGold","HP","MaxHP","Facing","GoldenDice","IsCommandant","IsGM","DDA_Difficulty","QuestRole")
VALUES
  ('912340011','鄭淑芬','沙悟淨',7,6600,2300,5,66,62,70,56,73,43,
   12,100,0,2,2,'cap7@test.com','第七小隊','第三大隊',
   true,440,100,100,0,1,false,false,'medium','["小隊長"]'),

  ('912340012','謝宗翰','白龍馬',6,5700,1950,5,62,60,66,50,70,38,
   10,200,200,-2,-1,'cap8@test.com','第八小隊','第三大隊',
   true,370,100,100,0,1,false,false,'easy','["小隊長"]'),

  ('912340013','江麗雲','唐三藏',8,7500,2900,6,72,68,76,62,77,48,
   15,0,0,1,-3,'cap9@test.com','第九小隊','第三大隊',
   true,520,100,100,0,2,false,false,'hard','["小隊長","先鋒"]');

-- ── 第一小隊 成員（014–019）──────────────────────────────────
INSERT INTO public."CharacterStats"
  ("UserID","Name","Role","Level","Exp","Coins","EnergyDice","Spirit","Physique","Charisma","Savvy","Luck","Potential",
   "Streak","TotalFines","FinePaid","CurrentQ","CurrentR","Email","LittleTeamLeagelName","BigTeamLeagelName",
   "IsCaptain","GameGold","HP","MaxHP","Facing","GoldenDice","IsCommandant","IsGM","DDA_Difficulty")
VALUES
  ('912340014','林佑霖','孫悟空',3,2400,720,2,42,44,40,36,50,22,
   5,0,0,1,1,'m1a@test.com','第一小隊','第一大隊',false,90,100,100,0,0,false,false,'easy'),
  ('912340015','陳雅惠','豬八戒',4,3300,1000,3,48,46,52,40,55,26,
   7,200,200,2,1,'m1b@test.com','第一小隊','第一大隊',false,140,100,100,0,0,false,false,'medium'),
  ('912340016','黃志明','沙悟淨',3,2200,660,2,40,42,38,34,48,20,
   4,0,0,-1,0,'m1c@test.com','第一小隊','第一大隊',false,80,100,100,0,0,false,false,'easy'),
  ('912340017','劉雅琪','白龍馬',5,4100,1240,4,54,50,56,44,61,30,
   9,100,0,0,-1,'m1d@test.com','第一小隊','第一大隊',false,195,100,100,0,0,false,false,'medium'),
  ('912340018','吳承翰','唐三藏',2,1500,450,1,36,38,34,30,44,18,
   3,300,300,1,-1,'m1e@test.com','第一小隊','第一大隊',false,50,100,100,0,0,false,false,'easy'),
  ('912340019','蔡佳玲','孫悟空',4,3600,1080,3,46,44,48,38,54,24,
   7,0,0,2,0,'m1f@test.com','第一小隊','第一大隊',false,145,100,100,0,0,false,false,'medium');

-- ── 第二小隊 成員（020–025）──────────────────────────────────
INSERT INTO public."CharacterStats"
  ("UserID","Name","Role","Level","Exp","Coins","EnergyDice","Spirit","Physique","Charisma","Savvy","Luck","Potential",
   "Streak","TotalFines","FinePaid","CurrentQ","CurrentR","Email","LittleTeamLeagelName","BigTeamLeagelName",
   "IsCaptain","GameGold","HP","MaxHP","Facing","GoldenDice","IsCommandant","IsGM","DDA_Difficulty")
VALUES
  ('912340020','張建豪','豬八戒',5,4100,1250,4,54,50,56,44,61,30,
   9,100,0,-1,1,'m2a@test.com','第二小隊','第一大隊',false,200,90,100,0,0,false,false,'medium'),
  ('912340021','黃淑貞','沙悟淨',3,2100,650,2,40,42,38,34,48,20,
   4,300,300,0,2,'m2b@test.com','第二小隊','第一大隊',false,70,100,100,0,0,false,false,'easy'),
  ('912340022','李俊宏','白龍馬',4,3400,1020,3,48,50,46,40,56,26,
   8,0,0,1,2,'m2c@test.com','第二小隊','第一大隊',false,135,100,100,0,0,false,false,'medium'),
  ('912340023','林美華','唐三藏',3,2600,780,2,42,40,44,36,50,22,
   5,0,0,-1,1,'m2d@test.com','第二小隊','第一大隊',false,95,100,100,0,0,false,false,'easy'),
  ('912340024','陳冠宇','孫悟空',5,4500,1350,4,56,52,58,46,63,32,
   10,0,0,2,-1,'m2e@test.com','第二小隊','第一大隊',false,220,100,100,0,0,false,false,'medium'),
  ('912340025','黃秀英','豬八戒',2,1800,540,1,38,36,40,32,46,18,
   3,200,100,0,1,'m2f@test.com','第二小隊','第一大隊',false,60,100,100,0,0,false,false,'easy');

-- ── 第三小隊 成員（026–031）──────────────────────────────────
INSERT INTO public."CharacterStats"
  ("UserID","Name","Role","Level","Exp","Coins","EnergyDice","Spirit","Physique","Charisma","Savvy","Luck","Potential",
   "Streak","TotalFines","FinePaid","CurrentQ","CurrentR","Email","LittleTeamLeagelName","BigTeamLeagelName",
   "IsCaptain","GameGold","HP","MaxHP","Facing","GoldenDice","IsCommandant","IsGM","DDA_Difficulty")
VALUES
  ('912340026','吳家豪','沙悟淨',4,3500,1050,3,46,50,44,38,54,24,
   7,0,0,2,-1,'m3a@test.com','第三小隊','第一大隊',false,110,100,100,0,0,false,false,'easy'),
  ('912340027','李美君','白龍馬',5,4400,1320,4,56,52,58,46,63,32,
   10,100,100,3,0,'m3b@test.com','第三小隊','第一大隊',false,215,100,100,0,0,false,false,'medium'),
  ('912340028','許志豪','唐三藏',3,2300,700,2,42,44,40,36,50,22,
   5,0,0,1,-2,'m3c@test.com','第三小隊','第一大隊',false,85,100,100,0,0,false,false,'easy'),
  ('912340029','吳淑娟','孫悟空',4,3700,1110,3,48,46,50,40,56,26,
   7,200,200,-1,0,'m3d@test.com','第三小隊','第一大隊',false,150,100,100,0,0,false,false,'medium'),
  ('912340030','蔡建宏','豬八戒',2,1600,480,1,36,38,34,30,44,16,
   3,100,100,0,-1,'m3e@test.com','第三小隊','第一大隊',false,55,100,100,0,0,false,false,'easy'),
  ('912340031','劉佳慧','沙悟淨',5,4200,1260,4,54,50,56,44,61,30,
   9,0,0,2,1,'m3f@test.com','第三小隊','第一大隊',false,205,100,100,0,0,false,false,'medium');

-- ── 第四小隊 成員（032–037）──────────────────────────────────
INSERT INTO public."CharacterStats"
  ("UserID","Name","Role","Level","Exp","Coins","EnergyDice","Spirit","Physique","Charisma","Savvy","Luck","Potential",
   "Streak","TotalFines","FinePaid","CurrentQ","CurrentR","Email","LittleTeamLeagelName","BigTeamLeagelName",
   "IsCaptain","GameGold","HP","MaxHP","Facing","GoldenDice","IsCommandant","IsGM","DDA_Difficulty")
VALUES
  ('912340032','周志明','白龍馬',3,2200,680,2,44,48,42,36,52,22,
   5,200,100,1,-1,'m4a@test.com','第四小隊','第二大隊',false,80,100,100,0,0,false,false,'easy'),
  ('912340033','蘇欣妤','唐三藏',5,4200,1260,4,54,52,56,44,62,30,
   9,0,0,2,-2,'m4b@test.com','第四小隊','第二大隊',false,205,100,100,0,0,false,false,'medium'),
  ('912340034','謝育明','孫悟空',4,3600,1080,3,48,46,50,40,56,26,
   8,100,100,0,-1,'m4c@test.com','第四小隊','第二大隊',false,145,100,100,0,0,false,false,'medium'),
  ('912340035','陳雅慧','豬八戒',3,2500,750,2,42,40,44,36,50,20,
   5,0,0,-1,-2,'m4d@test.com','第四小隊','第二大隊',false,90,100,100,0,0,false,false,'easy'),
  ('912340036','黃志偉','沙悟淨',5,4300,1290,4,54,52,56,44,62,30,
   9,0,0,1,-3,'m4e@test.com','第四小隊','第二大隊',false,210,100,100,0,0,false,false,'medium'),
  ('912340037','李美珍','白龍馬',2,1700,510,1,38,40,36,32,46,18,
   3,300,200,-1,0,'m4f@test.com','第四小隊','第二大隊',false,58,100,100,0,0,false,false,'easy');

-- ── 第五小隊 成員（038–043）──────────────────────────────────
INSERT INTO public."CharacterStats"
  ("UserID","Name","Role","Level","Exp","Coins","EnergyDice","Spirit","Physique","Charisma","Savvy","Luck","Potential",
   "Streak","TotalFines","FinePaid","CurrentQ","CurrentR","Email","LittleTeamLeagelName","BigTeamLeagelName",
   "IsCaptain","GameGold","HP","MaxHP","Facing","GoldenDice","IsCommandant","IsGM","DDA_Difficulty")
VALUES
  ('912340038','曾建國','唐三藏',4,3100,940,3,46,50,44,38,54,24,
   7,100,100,-1,-1,'m5a@test.com','第五小隊','第二大隊',false,120,100,100,0,0,false,false,'easy'),
  ('912340039','楊雅婷','孫悟空',3,2500,750,2,42,40,44,36,50,20,
   5,0,0,0,-3,'m5b@test.com','第五小隊','第二大隊',false,85,100,100,0,0,false,false,'easy'),
  ('912340040','劉宗翰','豬八戒',5,4000,1200,4,52,50,54,42,60,28,
   8,200,200,1,0,'m5c@test.com','第五小隊','第二大隊',false,185,90,100,0,0,false,false,'medium'),
  ('912340041','張淑芬','沙悟淨',3,2700,810,2,42,44,40,36,50,22,
   5,0,0,-2,-1,'m5d@test.com','第五小隊','第二大隊',false,98,100,100,0,0,false,false,'easy'),
  ('912340042','王建宏','白龍馬',5,4600,1380,4,58,54,60,48,65,34,
   10,0,0,2,0,'m5e@test.com','第五小隊','第二大隊',false,235,100,100,0,0,false,false,'medium'),
  ('912340043','林佳慧','唐三藏',2,1900,570,1,38,36,40,32,46,18,
   3,0,0,0,1,'m5f@test.com','第五小隊','第二大隊',false,65,100,100,0,0,false,false,'easy');

-- ── 第六小隊 成員（044–049）──────────────────────────────────
INSERT INTO public."CharacterStats"
  ("UserID","Name","Role","Level","Exp","Coins","EnergyDice","Spirit","Physique","Charisma","Savvy","Luck","Potential",
   "Streak","TotalFines","FinePaid","CurrentQ","CurrentR","Email","LittleTeamLeagelName","BigTeamLeagelName",
   "IsCaptain","GameGold","HP","MaxHP","Facing","GoldenDice","IsCommandant","IsGM","DDA_Difficulty")
VALUES
  ('912340044','許佳慧','孫悟空',5,4500,1350,4,58,54,60,48,65,34,
   10,0,0,-2,-2,'m6a@test.com','第六小隊','第二大隊',false,230,100,100,0,0,false,false,'medium'),
  ('912340045','謝文宏','豬八戒',4,3400,1020,3,48,50,46,40,56,26,
   8,300,200,-1,-3,'m6b@test.com','第六小隊','第二大隊',false,130,85,100,0,0,false,false,'easy'),
  ('912340046','許志明','沙悟淨',3,2300,700,2,42,44,40,36,50,22,
   5,0,0,0,-2,'m6c@test.com','第六小隊','第二大隊',false,85,100,100,0,0,false,false,'easy'),
  ('912340047','吳淑珍','白龍馬',5,4700,1410,4,58,56,60,48,65,32,
   10,100,100,-2,-3,'m6d@test.com','第六小隊','第二大隊',false,240,100,100,0,0,false,false,'medium'),
  ('912340048','蔡建志','唐三藏',4,3200,960,3,46,48,44,38,54,24,
   7,0,0,-1,-2,'m6e@test.com','第六小隊','第二大隊',false,125,100,100,0,0,false,false,'medium'),
  ('912340049','謝美華','孫悟空',2,2000,600,2,38,36,40,32,46,18,
   4,0,0,0,-1,'m6f@test.com','第六小隊','第二大隊',false,70,100,100,0,0,false,false,'easy');

-- ── 第七小隊 成員（050–055）──────────────────────────────────
INSERT INTO public."CharacterStats"
  ("UserID","Name","Role","Level","Exp","Coins","EnergyDice","Spirit","Physique","Charisma","Savvy","Luck","Potential",
   "Streak","TotalFines","FinePaid","CurrentQ","CurrentR","Email","LittleTeamLeagelName","BigTeamLeagelName",
   "IsCaptain","GameGold","HP","MaxHP","Facing","GoldenDice","IsCommandant","IsGM","DDA_Difficulty")
VALUES
  ('912340050','鄭宗翰','豬八戒',3,2300,700,2,42,44,40,36,50,22,
   5,100,100,1,3,'m7a@test.com','第七小隊','第三大隊',false,90,100,100,0,0,false,false,'easy'),
  ('912340051','林雅玲','沙悟淨',5,4300,1290,4,56,52,58,46,63,32,
   9,0,0,2,3,'m7b@test.com','第七小隊','第三大隊',false,215,100,100,0,0,false,false,'medium'),
  ('912340052','林志宏','白龍馬',4,3500,1050,3,48,52,46,40,56,26,
   8,0,0,0,2,'m7c@test.com','第七小隊','第三大隊',false,140,100,100,0,0,false,false,'medium'),
  ('912340053','陳淑惠','唐三藏',3,2400,720,2,42,40,44,36,50,22,
   5,200,200,1,2,'m7d@test.com','第七小隊','第三大隊',false,88,100,100,0,0,false,false,'easy'),
  ('912340054','黃佳慧','孫悟空',5,4800,1440,4,60,56,62,50,67,34,
   10,0,0,3,2,'m7e@test.com','第七小隊','第三大隊',false,245,100,100,0,0,false,false,'medium'),
  ('912340055','李建宇','豬八戒',2,1600,480,1,36,38,34,30,44,16,
   3,0,0,0,3,'m7f@test.com','第七小隊','第三大隊',false,55,100,100,0,0,false,false,'easy');

-- ── 第八小隊 成員（056–061）──────────────────────────────────
INSERT INTO public."CharacterStats"
  ("UserID","Name","Role","Level","Exp","Coins","EnergyDice","Spirit","Physique","Charisma","Savvy","Luck","Potential",
   "Streak","TotalFines","FinePaid","CurrentQ","CurrentR","Email","LittleTeamLeagelName","BigTeamLeagelName",
   "IsCaptain","GameGold","HP","MaxHP","Facing","GoldenDice","IsCommandant","IsGM","DDA_Difficulty")
VALUES
  ('912340056','王建志','沙悟淨',4,3600,1080,3,48,52,46,40,56,26,
   7,200,200,-3,0,'m8a@test.com','第八小隊','第三大隊',false,145,100,100,0,0,false,false,'easy'),
  ('912340057','陳秀英','白龍馬',5,4600,1380,4,58,54,62,48,66,34,
   10,0,0,-2,0,'m8b@test.com','第八小隊','第三大隊',false,240,100,100,0,0,false,false,'medium'),
  ('912340058','張志豪','唐三藏',3,2500,750,2,42,40,44,36,50,20,
   5,0,0,-3,-1,'m8c@test.com','第八小隊','第三大隊',false,90,100,100,0,0,false,false,'easy'),
  ('912340059','劉美珍','孫悟空',5,4400,1320,4,56,52,58,46,63,32,
   9,100,100,-2,-1,'m8d@test.com','第八小隊','第三大隊',false,220,100,100,0,0,false,false,'medium'),
  ('912340060','陳育明','豬八戒',4,3300,990,3,46,48,44,38,54,24,
   8,0,0,-1,0,'m8e@test.com','第八小隊','第三大隊',false,130,100,100,0,0,false,false,'medium'),
  ('912340061','黃淑娟','沙悟淨',2,1800,540,1,38,36,40,32,46,18,
   3,300,300,-2,1,'m8f@test.com','第八小隊','第三大隊',false,62,100,100,0,0,false,false,'easy');

-- ── 第九小隊 成員（062–067）──────────────────────────────────
INSERT INTO public."CharacterStats"
  ("UserID","Name","Role","Level","Exp","Coins","EnergyDice","Spirit","Physique","Charisma","Savvy","Luck","Potential",
   "Streak","TotalFines","FinePaid","CurrentQ","CurrentR","Email","LittleTeamLeagelName","BigTeamLeagelName",
   "IsCaptain","GameGold","HP","MaxHP","Facing","GoldenDice","IsCommandant","IsGM","DDA_Difficulty")
VALUES
  ('912340062','趙俊偉','白龍馬',4,3800,1140,3,50,48,52,42,58,28,
   8,0,0,0,-3,'m9a@test.com','第九小隊','第三大隊',false,155,100,100,0,0,false,false,'easy'),
  ('912340063','李淑芬','唐三藏',5,4700,1410,4,58,56,60,48,65,32,
   10,100,100,1,-2,'m9b@test.com','第九小隊','第三大隊',false,240,100,100,0,0,false,false,'medium'),
  ('912340064','鄭志偉','孫悟空',3,2600,780,2,44,42,46,38,52,22,
   5,0,0,0,-2,'m9c@test.com','第九小隊','第三大隊',false,95,100,100,0,0,false,false,'easy'),
  ('912340065','林佳玲','豬八戒',5,4900,1470,4,60,56,62,50,67,34,
   10,0,0,2,-1,'m9d@test.com','第九小隊','第三大隊',false,250,100,100,0,0,false,false,'medium'),
  ('912340066','許建宏','沙悟淨',4,3200,960,3,46,50,44,38,54,24,
   7,200,100,1,-3,'m9e@test.com','第九小隊','第三大隊',false,125,100,100,0,0,false,false,'medium'),
  ('912340067','吳雅慧','白龍馬',2,1700,510,1,38,40,36,32,46,18,
   3,0,0,-1,-2,'m9f@test.com','第九小隊','第三大隊',false,58,100,100,0,0,false,false,'easy');

-- ============================================================
-- 4. Rosters（名冊）
-- ============================================================
INSERT INTO public."Rosters" ("email","name","BigTeamLeagelName","LittleTeamLeagelName","is_captain","is_commandant")
VALUES
  -- GM
  ('gm@bigsmile.com',   '林大統', '指揮部',   '指揮部',   false, true),
  -- 大隊長（無小隊）
  ('cmd1@bigsmile.com', '陳志豪', '第一大隊', NULL,       false, true),
  ('cmd2@bigsmile.com', '黃建明', '第二大隊', NULL,       false, true),
  ('cmd3@bigsmile.com', '李永誠', '第三大隊', NULL,       false, true),
  -- 第一大隊 小隊長
  ('cap1@test.com', '王美玲', '第一大隊', '第一小隊', true, false),
  ('cap2@test.com', '張文彥', '第一大隊', '第二小隊', true, false),
  ('cap3@test.com', '吳佳蓉', '第一大隊', '第三小隊', true, false),
  -- 第二大隊 小隊長
  ('cap4@test.com', '劉志強', '第二大隊', '第四小隊', true, false),
  ('cap5@test.com', '蔡欣怡', '第二大隊', '第五小隊', true, false),
  ('cap6@test.com', '許明達', '第二大隊', '第六小隊', true, false),
  -- 第三大隊 小隊長
  ('cap7@test.com', '鄭淑芬', '第三大隊', '第七小隊', true, false),
  ('cap8@test.com', '謝宗翰', '第三大隊', '第八小隊', true, false),
  ('cap9@test.com', '江麗雲', '第三大隊', '第九小隊', true, false),
  -- 第一小隊
  ('m1a@test.com','林佑霖','第一大隊','第一小隊',false,false),
  ('m1b@test.com','陳雅惠','第一大隊','第一小隊',false,false),
  ('m1c@test.com','黃志明','第一大隊','第一小隊',false,false),
  ('m1d@test.com','劉雅琪','第一大隊','第一小隊',false,false),
  ('m1e@test.com','吳承翰','第一大隊','第一小隊',false,false),
  ('m1f@test.com','蔡佳玲','第一大隊','第一小隊',false,false),
  -- 第二小隊
  ('m2a@test.com','張建豪','第一大隊','第二小隊',false,false),
  ('m2b@test.com','黃淑貞','第一大隊','第二小隊',false,false),
  ('m2c@test.com','李俊宏','第一大隊','第二小隊',false,false),
  ('m2d@test.com','林美華','第一大隊','第二小隊',false,false),
  ('m2e@test.com','陳冠宇','第一大隊','第二小隊',false,false),
  ('m2f@test.com','黃秀英','第一大隊','第二小隊',false,false),
  -- 第三小隊
  ('m3a@test.com','吳家豪','第一大隊','第三小隊',false,false),
  ('m3b@test.com','李美君','第一大隊','第三小隊',false,false),
  ('m3c@test.com','許志豪','第一大隊','第三小隊',false,false),
  ('m3d@test.com','吳淑娟','第一大隊','第三小隊',false,false),
  ('m3e@test.com','蔡建宏','第一大隊','第三小隊',false,false),
  ('m3f@test.com','劉佳慧','第一大隊','第三小隊',false,false),
  -- 第四小隊
  ('m4a@test.com','周志明','第二大隊','第四小隊',false,false),
  ('m4b@test.com','蘇欣妤','第二大隊','第四小隊',false,false),
  ('m4c@test.com','謝育明','第二大隊','第四小隊',false,false),
  ('m4d@test.com','陳雅慧','第二大隊','第四小隊',false,false),
  ('m4e@test.com','黃志偉','第二大隊','第四小隊',false,false),
  ('m4f@test.com','李美珍','第二大隊','第四小隊',false,false),
  -- 第五小隊
  ('m5a@test.com','曾建國','第二大隊','第五小隊',false,false),
  ('m5b@test.com','楊雅婷','第二大隊','第五小隊',false,false),
  ('m5c@test.com','劉宗翰','第二大隊','第五小隊',false,false),
  ('m5d@test.com','張淑芬','第二大隊','第五小隊',false,false),
  ('m5e@test.com','王建宏','第二大隊','第五小隊',false,false),
  ('m5f@test.com','林佳慧','第二大隊','第五小隊',false,false),
  -- 第六小隊
  ('m6a@test.com','許佳慧','第二大隊','第六小隊',false,false),
  ('m6b@test.com','謝文宏','第二大隊','第六小隊',false,false),
  ('m6c@test.com','許志明','第二大隊','第六小隊',false,false),
  ('m6d@test.com','吳淑珍','第二大隊','第六小隊',false,false),
  ('m6e@test.com','蔡建志','第二大隊','第六小隊',false,false),
  ('m6f@test.com','謝美華','第二大隊','第六小隊',false,false),
  -- 第七小隊
  ('m7a@test.com','鄭宗翰','第三大隊','第七小隊',false,false),
  ('m7b@test.com','林雅玲','第三大隊','第七小隊',false,false),
  ('m7c@test.com','林志宏','第三大隊','第七小隊',false,false),
  ('m7d@test.com','陳淑惠','第三大隊','第七小隊',false,false),
  ('m7e@test.com','黃佳慧','第三大隊','第七小隊',false,false),
  ('m7f@test.com','李建宇','第三大隊','第七小隊',false,false),
  -- 第八小隊
  ('m8a@test.com','王建志','第三大隊','第八小隊',false,false),
  ('m8b@test.com','陳秀英','第三大隊','第八小隊',false,false),
  ('m8c@test.com','張志豪','第三大隊','第八小隊',false,false),
  ('m8d@test.com','劉美珍','第三大隊','第八小隊',false,false),
  ('m8e@test.com','陳育明','第三大隊','第八小隊',false,false),
  ('m8f@test.com','黃淑娟','第三大隊','第八小隊',false,false),
  -- 第九小隊
  ('m9a@test.com','趙俊偉','第三大隊','第九小隊',false,false),
  ('m9b@test.com','李淑芬','第三大隊','第九小隊',false,false),
  ('m9c@test.com','鄭志偉','第三大隊','第九小隊',false,false),
  ('m9d@test.com','林佳玲','第三大隊','第九小隊',false,false),
  ('m9e@test.com','許建宏','第三大隊','第九小隊',false,false),
  ('m9f@test.com','吳雅慧','第三大隊','第九小隊',false,false);

-- ============================================================
-- 5. DailyLogs（近期打卡紀錄）
-- 測試活躍/陣亡分布：
--   活躍（近2日有回報）: 005 006 008 011 019 027 044 051 057 062
--   普通（3日內）:       007 009 014 020 032 038 050 056 064
--   陣亡（超過3日無動靜）: 010 015 021 026 033 039 045 052 058 063
-- ============================================================
INSERT INTO public."DailyLogs" ("UserID","QuestID","QuestTitle","RewardPoints","Timestamp")
VALUES
  -- 活躍成員（1日內）
  ('912340005','q1','早起打拳',100,       NOW() - INTERVAL '10 hours'),
  ('912340005','q2','靜坐冥想',80,        NOW() - INTERVAL '10 hours'),
  ('912340006','q1','早起打拳',100,       NOW() - INTERVAL '18 hours'),
  ('912340008','q1','早起打拳',100,       NOW() - INTERVAL '12 hours'),
  ('912340008','q3','閱讀經典',90,        NOW() - INTERVAL '12 hours'),
  ('912340011','q1','早起打拳',100,       NOW() - INTERVAL '20 hours'),
  ('912340019','q1','早起打拳',100,       NOW() - INTERVAL '15 hours'),
  ('912340027','q2','靜坐冥想',80,        NOW() - INTERVAL '8 hours'),
  ('912340044','q1','早起打拳',100,       NOW() - INTERVAL '22 hours'),
  ('912340051','q1','早起打拳',100,       NOW() - INTERVAL '14 hours'),
  ('912340057','q3','閱讀經典',90,        NOW() - INTERVAL '6 hours'),
  ('912340062','q1','早起打拳',100,       NOW() - INTERVAL '16 hours'),
  -- 近2日內
  ('912340002','q1','早起打拳',100,       NOW() - INTERVAL '30 hours'),
  ('912340003','q2','靜坐冥想',80,        NOW() - INTERVAL '36 hours'),
  ('912340013','q1','早起打拳',100,       NOW() - INTERVAL '28 hours'),
  ('912340031','q1','早起打拳',100,       NOW() - INTERVAL '40 hours'),
  ('912340047','q2','靜坐冥想',80,        NOW() - INTERVAL '45 hours'),
  -- 普通（2~3日前）
  ('912340007','q1','早起打拳',100,       NOW() - INTERVAL '55 hours'),
  ('912340009','q2','靜坐冥想',80,        NOW() - INTERVAL '60 hours'),
  ('912340014','q1','早起打拳',100,       NOW() - INTERVAL '50 hours'),
  ('912340020','q3','閱讀經典',90,        NOW() - INTERVAL '58 hours'),
  ('912340032','q1','早起打拳',100,       NOW() - INTERVAL '65 hours'),
  ('912340038','q2','靜坐冥想',80,        NOW() - INTERVAL '68 hours'),
  ('912340050','q1','早起打拳',100,       NOW() - INTERVAL '70 hours'),
  ('912340056','q3','閱讀經典',90,        NOW() - INTERVAL '72 hours'),
  ('912340064','q1','早起打拳',100,       NOW() - INTERVAL '71 hours'),
  -- 陣亡（超過3日無回報的人完全沒有記錄，或記錄很久以前）
  -- 以下幾位有舊紀錄（超過4日）來測試陣亡過濾
  ('912340015','q1','早起打拳',100,       NOW() - INTERVAL '5 days'),
  ('912340021','q2','靜坐冥想',80,        NOW() - INTERVAL '6 days'),
  ('912340026','q1','早起打拳',100,       NOW() - INTERVAL '4 days'),
  ('912340033','q3','閱讀經典',90,        NOW() - INTERVAL '7 days'),
  ('912340039','q1','早起打拳',100,       NOW() - INTERVAL '5 days'),
  ('912340045','q2','靜坐冥想',80,        NOW() - INTERVAL '8 days'),
  ('912340052','q1','早起打拳',100,       NOW() - INTERVAL '4 days'),
  ('912340058','q3','閱讀經典',90,        NOW() - INTERVAL '6 days'),
  ('912340063','q1','早起打拳',100,       NOW() - INTERVAL '5 days');
  -- 其餘成員（016 017 018 022-025 028-030 034-037 040-043 046 048 049 053-055 059-061 065-067）
  -- 完全無紀錄 → 也算陣亡

-- ============================================================
-- 6. temporaryquests（臨時任務）
-- ============================================================
INSERT INTO public."temporaryquests" ("id","title","sub","desc","reward","dice","icon","limit","active")
VALUES
  ('temp_test_001','課後心得分享','本週主題延伸','寫下本週課程最深的體悟，分享給小隊夥伴。',150,1,'📝',NULL,true),
  ('temp_test_002','感恩行動','傳遞正能量','今日對三位家人或朋友表達感謝。',120,0,'🙏',1,true);

-- ============================================================
-- 7. MapEntities（地圖實體）
-- ============================================================
INSERT INTO public."MapEntities" ("q","r","type","name","icon","data","owner_id","is_active")
VALUES
  ( 2, 0,'monster','慢心魔 Lv3',    '👾','{"level":3,"zone":"pride","isElite":false}'::jsonb, NULL,true),
  ( 0, 2,'monster','疑心魔 Lv2',    '👾','{"level":2,"zone":"doubt","isElite":false}'::jsonb, NULL,true),
  (-2, 2,'monster','精英嗔心魔 Lv8','💀','{"level":8,"zone":"anger","isElite":true}'::jsonb,  NULL,true),
  ( 1,-3,'monster','貪心魔 Lv4',    '👾','{"level":4,"zone":"greed","isElite":false}'::jsonb, NULL,true),
  ( 1, 1,'chest', '神秘寶箱',       '📦','{"rarity":"common"}'::jsonb,                        NULL,true),
  (-1, 2,'chest', '稀有寶箱',       '🎁','{"rarity":"rare"}'::jsonb,                          NULL,true),
  ( 0, 0,'npc',   '本心草原守護者', '🧙','{"shopItems":["i1","i2","i3"]}'::jsonb,              NULL,true);

-- ============================================================
-- 8. TopicHistory
-- ============================================================
INSERT INTO public."TopicHistory" ("TopicTitle","created_at")
VALUES
  ('第一週：認識自心', NOW() - INTERVAL '14 days'),
  ('第二週：放下執著', NOW() - INTERVAL '7 days'),
  ('本週主題：慈悲心', NOW());

-- 完成！
SELECT '✅ 測試資料建立完成！共 67 位玩家（1 GM + 3 大隊長 + 9 小隊長 + 54 成員）、3 大隊、9 小隊。' AS result;
