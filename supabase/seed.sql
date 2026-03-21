-- ============================================================
-- 測試資料 Seed Script
-- 執行方式：貼入 Supabase Dashboard > SQL Editor > Run
-- ============================================================
-- 登入方式：姓名 + 手機末三碼
-- UserID 規則：10碼手機去掉開頭0 → 9碼，e.g. 0912340001 → 912340001
-- ============================================================

-- 清空舊資料（依外鍵順序）
TRUNCATE public."DailyLogs", public."MandatoryQuestHistory", public."W4Applications",
         public."AdminActivityLog", public."MapEntities",
         public."CharacterStats", public."TeamSettings",
         public."SystemSettings", public."Rosters",
         public."temporaryquests", public."TopicHistory" CASCADE;

-- ============================================================
-- 1. SystemSettings
-- ============================================================
INSERT INTO public."SystemSettings" ("SettingName", "TopicQuestTitle", "WorldState", "WorldStateMsg", "RegistrationMode", "VolunteerPassword")
VALUES ('global', '本週主題：慈悲心', 'normal', '世界平靜，適合修行。', 'open', 'volunteer123');

-- ============================================================
-- 2. TeamSettings（兩個隊伍）
-- ============================================================
INSERT INTO public."TeamSettings" ("team_name", "team_coins", "mandatory_quest_id", "mandatory_quest_week", "quest_draw_history", "inventory")
VALUES
  ('龍騎隊', 3200, 'w2', '2026-W12', '["w1","w2"]'::jsonb, '["a3"]'::jsonb),
  ('鳳翔隊', 2800, 'w1', '2026-W12', '["w1"]'::jsonb, '[]'::jsonb);

-- ============================================================
-- 3. CharacterStats（玩家）
-- UserID = 手機號去掉開頭0（9碼）
-- 登入：姓名 + 末三碼
-- ============================================================

-- 指揮官  手機:0912340001 → UserID:912340001 → 末三碼:001
INSERT INTO public."CharacterStats"
  ("UserID","Name","Role","Level","Exp","Coins","EnergyDice","Spirit","Physique","Charisma","Savvy","Luck","Potential",
   "Streak","TotalFines","FinePaid","CurrentQ","CurrentR","Email","SquadName","TeamName",
   "IsCaptain","GameGold","HP","MaxHP","Facing","GoldenDice","IsCommandant","IsGM","DDA_Difficulty")
VALUES
  ('912340001','大統領','指揮官',10,9500,5000,8,80,75,90,70,85,60,
   15,0,0,0,0,'commandant@bigsmile.com','指揮部','龍騎隊',
   false,800,100,100,0,3,true,true,'medium');

-- 龍騎隊 小隊長
-- 林志明 手機:0912340002 → UserID:912340002 → 末三碼:002
-- 陳美玲 手機:0912340003 → UserID:912340003 → 末三碼:003
INSERT INTO public."CharacterStats"
  ("UserID","Name","Role","Level","Exp","Coins","EnergyDice","Spirit","Physique","Charisma","Savvy","Luck","Potential",
   "Streak","TotalFines","FinePaid","CurrentQ","CurrentR","Email","SquadName","TeamName",
   "IsCaptain","GameGold","HP","MaxHP","Facing","GoldenDice","IsCommandant","IsGM","DDA_Difficulty")
VALUES
  ('912340002','林志明','孫悟空',7,6200,2100,5,65,60,70,55,72,40,
   12,200,200,2,1,'dragon1@test.com','天龍小隊','龍騎隊',
   true,350,100,100,0,1,false,false,'hard'),

  ('912340003','陳美玲','唐三藏',6,5400,1800,4,60,55,65,50,68,35,
   9,100,100,-1,2,'dragon2@test.com','地龍小隊','龍騎隊',
   true,280,100,100,0,0,false,false,'medium');

-- 龍騎隊 一般成員
-- 王小明:004  張雅婷:005  李建國:006  吳淑芬:007
INSERT INTO public."CharacterStats"
  ("UserID","Name","Role","Level","Exp","Coins","EnergyDice","Spirit","Physique","Charisma","Savvy","Luck","Potential",
   "Streak","TotalFines","FinePaid","CurrentQ","CurrentR","Email","SquadName","TeamName",
   "IsCaptain","GameGold","HP","MaxHP","Facing","GoldenDice","IsCommandant","IsGM","DDA_Difficulty")
VALUES
  ('912340004','王小明','豬八戒',4,3200,950,3,45,50,40,38,55,25,
   7,300,200,1,0,'d1@test.com','天龍小隊','龍騎隊',
   false,120,100,100,0,0,false,false,'easy'),

  ('912340005','張雅婷','沙悟淨',5,4100,1200,4,55,48,52,44,60,30,
   10,0,0,3,1,'d2@test.com','天龍小隊','龍騎隊',
   false,200,100,100,0,0,false,false,'medium'),

  ('912340006','李建國','白龍馬',3,2100,700,2,40,42,38,35,48,20,
   5,500,300,0,2,'d3@test.com','地龍小隊','龍騎隊',
   false,80,85,100,0,0,false,false,'easy'),

  ('912340007','吳淑芬','孫悟空',6,5000,1650,5,58,54,62,48,65,32,
   11,100,100,-2,1,'d4@test.com','地龍小隊','龍騎隊',
   false,300,100,100,0,1,false,false,'hard');

-- 鳳翔隊 小隊長
-- 黃俊傑 手機:0912340008 → UserID:912340008 → 末三碼:008
INSERT INTO public."CharacterStats"
  ("UserID","Name","Role","Level","Exp","Coins","EnergyDice","Spirit","Physique","Charisma","Savvy","Luck","Potential",
   "Streak","TotalFines","FinePaid","CurrentQ","CurrentR","Email","SquadName","TeamName",
   "IsCaptain","GameGold","HP","MaxHP","Facing","GoldenDice","IsCommandant","IsGM","DDA_Difficulty")
VALUES
  ('912340008','黃俊傑','孫悟空',8,7100,2600,6,70,65,75,60,78,45,
   14,0,0,0,-2,'phoenix1@test.com','赤鳳小隊','鳳翔隊',
   true,420,100,100,0,2,false,false,'hard');

-- 鳳翔隊 一般成員
-- 劉曉燕:009  蔡志遠:010  許雅如:011
INSERT INTO public."CharacterStats"
  ("UserID","Name","Role","Level","Exp","Coins","EnergyDice","Spirit","Physique","Charisma","Savvy","Luck","Potential",
   "Streak","TotalFines","FinePaid","CurrentQ","CurrentR","Email","SquadName","TeamName",
   "IsCaptain","GameGold","HP","MaxHP","Facing","GoldenDice","IsCommandant","IsGM","DDA_Difficulty")
VALUES
  ('912340009','劉曉燕','白龍馬',4,3500,980,3,48,44,50,40,52,22,
   8,200,200,1,-1,'p1@test.com','赤鳳小隊','鳳翔隊',
   false,140,100,100,0,0,false,false,'medium'),

  ('912340010','蔡志遠','豬八戒',5,4300,1300,4,52,50,54,46,62,28,
   9,100,0,2,-2,'p2@test.com','赤鳳小隊','鳳翔隊',
   false,210,90,100,0,0,false,false,'medium'),

  ('912340011','許雅如','唐三藏',3,1800,600,2,38,40,36,32,45,18,
   4,400,400,0,-1,'p3@test.com','赤鳳小隊','鳳翔隊',
   false,60,100,100,0,0,false,false,'easy');

-- ============================================================
-- 4. Rosters（名冊）
-- ============================================================
INSERT INTO public."Rosters" ("email","name","squad_name","team_name","is_captain","is_commandant")
VALUES
  ('commandant@bigsmile.com','大統領','指揮部','龍騎隊',false,true),
  ('dragon1@test.com','林志明','天龍小隊','龍騎隊',true,false),
  ('dragon2@test.com','陳美玲','地龍小隊','龍騎隊',true,false),
  ('d1@test.com','王小明','天龍小隊','龍騎隊',false,false),
  ('d2@test.com','張雅婷','天龍小隊','龍騎隊',false,false),
  ('d3@test.com','李建國','地龍小隊','龍騎隊',false,false),
  ('d4@test.com','吳淑芬','地龍小隊','龍騎隊',false,false),
  ('phoenix1@test.com','黃俊傑','赤鳳小隊','鳳翔隊',true,false),
  ('p1@test.com','劉曉燕','赤鳳小隊','鳳翔隊',false,false),
  ('p2@test.com','蔡志遠','赤鳳小隊','鳳翔隊',false,false),
  ('p3@test.com','許雅如','赤鳳小隊','鳳翔隊',false,false);

-- ============================================================
-- 5. DailyLogs（近期打卡紀錄）
-- ============================================================
INSERT INTO public."DailyLogs" ("UserID","QuestID","QuestTitle","RewardPoints","Timestamp")
VALUES
  ('912340005','q1','早起打拳',100, NOW() - INTERVAL '1 day'),
  ('912340005','q2','靜坐冥想',80,  NOW() - INTERVAL '1 day'),
  ('912340005','q1','早起打拳',100, NOW() - INTERVAL '2 days'),
  ('912340002','q1','早起打拳',120, NOW() - INTERVAL '1 day'),
  ('912340002','q3','閱讀經典',90,  NOW() - INTERVAL '1 day'),
  ('912340002','q1','早起打拳',120, NOW() - INTERVAL '2 days'),
  ('912340002','q2','靜坐冥想',96,  NOW() - INTERVAL '2 days'),
  ('912340009','q1','早起打拳',100, NOW() - INTERVAL '1 day'),
  ('912340010','q2','靜坐冥想',80,  NOW() - INTERVAL '1 day'),
  ('912340007','q1','早起打拳',120, NOW() - INTERVAL '1 day'),
  ('912340007','q1','早起打拳',120, NOW() - INTERVAL '2 days'),
  ('912340007','q1','早起打拳',120, NOW() - INTERVAL '3 days');

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
  (2, 0,'monster','慢心魔 Lv3','👾','{"level":3,"zone":"pride","isElite":false}'::jsonb,NULL,true),
  (0, 2,'monster','疑心魔 Lv2','👾','{"level":2,"zone":"doubt","isElite":false}'::jsonb,NULL,true),
  (-2,2,'monster','精英嗔心魔 Lv8','💀','{"level":8,"zone":"anger","isElite":true}'::jsonb,NULL,true),
  (1,-3,'monster','貪心魔 Lv4','👾','{"level":4,"zone":"greed","isElite":false}'::jsonb,NULL,true),
  (1, 1,'chest','神秘寶箱','📦','{"rarity":"common"}'::jsonb,NULL,true),
  (-1,2,'chest','稀有寶箱','🎁','{"rarity":"rare"}'::jsonb,NULL,true),
  (0, 0,'npc','本心草原守護者','🧙','{"shopItems":["i1","i2","i3"]}'::jsonb,NULL,true);

-- ============================================================
-- 8. TopicHistory
-- ============================================================
INSERT INTO public."TopicHistory" ("TopicTitle","created_at")
VALUES
  ('第一週：認識自心', NOW() - INTERVAL '14 days'),
  ('第二週：放下執著', NOW() - INTERVAL '7 days'),
  ('本週主題：慈悲心', NOW());

-- 完成！
SELECT '✅ 測試資料建立完成！共 11 位玩家、2 個隊伍、7 個地圖實體。' AS result;
