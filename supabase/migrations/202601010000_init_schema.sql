CREATE TABLE IF NOT EXISTS public."CharacterStats" (
    "UserID" TEXT PRIMARY KEY,
    "Name" TEXT NOT NULL,
    "Role" TEXT NOT NULL,
    "Level" INTEGER DEFAULT 1,
    "Exp" INTEGER DEFAULT 0,
    "Coins" INTEGER DEFAULT 0,
    "EnergyDice" INTEGER DEFAULT 0,
    "Spirit" INTEGER DEFAULT 0,
    "Physique" INTEGER DEFAULT 0,
    "Charisma" INTEGER DEFAULT 0,
    "Savvy" INTEGER DEFAULT 0,
    "Luck" INTEGER DEFAULT 0,
    "Potential" INTEGER DEFAULT 0,
    "Streak" INTEGER DEFAULT 0,
    "LastCheckIn" TIMESTAMP WITH TIME ZONE,
    "TotalFines" INTEGER DEFAULT 0,
    "FinePaid" INTEGER DEFAULT 0,
    "CurrentQ" INTEGER DEFAULT 0,
    "CurrentR" INTEGER DEFAULT 0,
    "Email" TEXT,
    "SquadName" TEXT,
    "TeamName" TEXT,
    "IsCaptain" BOOLEAN DEFAULT false,
    "Inventory" JSONB DEFAULT '[]'::jsonb,
    "InitialFortunes" JSONB,
    "DDA_Difficulty" TEXT,
    "GameGold" INTEGER DEFAULT 0,
    "GameInventory" JSONB DEFAULT '[]'::jsonb,
    "HP" INTEGER DEFAULT 100,
    "MaxHP" INTEGER DEFAULT 100,
    "Facing" INTEGER DEFAULT 0,
    "GoldenDice" INTEGER DEFAULT 0,
    "Birthday" DATE,
    "IsCommandant" BOOLEAN DEFAULT false,
    "IsGM" BOOLEAN DEFAULT false,
    "LineUserId" TEXT
);

CREATE TABLE IF NOT EXISTS public."DailyLogs" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "Timestamp" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    "UserID" TEXT NOT NULL REFERENCES public."CharacterStats"("UserID") ON DELETE CASCADE,
    "QuestID" TEXT NOT NULL,
    "QuestTitle" TEXT NOT NULL,
    "RewardPoints" INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS public."TeamSettings" (
    "team_name" TEXT PRIMARY KEY,
    "team_coins" INTEGER DEFAULT 0,
    "mandatory_quest_id" TEXT,
    "mandatory_quest_week" TEXT,
    "quest_draw_history" JSONB,
    "inventory" JSONB
);

CREATE TABLE IF NOT EXISTS public."SystemSettings" (
    "SettingName" TEXT PRIMARY KEY,
    "TopicQuestTitle" TEXT,
    "WorldState" TEXT,
    "WorldStateMsg" TEXT,
    "RegistrationMode" TEXT,
    "VolunteerPassword" TEXT
);

CREATE TABLE IF NOT EXISTS public."temporaryquests" (
    "id" TEXT PRIMARY KEY,
    "title" TEXT NOT NULL,
    "sub" TEXT,
    "desc" TEXT,
    "reward" INTEGER NOT NULL,
    "dice" INTEGER,
    "icon" TEXT,
    "limit" INTEGER,
    "active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public."MandatoryQuestHistory" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "team_name" TEXT NOT NULL,
    "quest_id" TEXT NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public."Rosters" (
    "email" TEXT PRIMARY KEY,
    "name" TEXT,
    "birthday" TEXT,
    "squad_name" TEXT,
    "team_name" TEXT,
    "is_captain" BOOLEAN DEFAULT false,
    "is_commandant" BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS public."W4Applications" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL REFERENCES public."CharacterStats"("UserID") ON DELETE CASCADE,
    "user_name" TEXT NOT NULL,
    "squad_name" TEXT,
    "battalion_name" TEXT,
    "interview_target" TEXT NOT NULL,
    "interview_date" DATE NOT NULL,
    "description" TEXT,
    "quest_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "squad_review_by" TEXT,
    "squad_review_at" TIMESTAMP WITH TIME ZONE,
    "squad_review_notes" TEXT,
    "final_review_by" TEXT,
    "final_review_at" TIMESTAMP WITH TIME ZONE,
    "final_review_notes" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public."TopicHistory" (
    "id" SERIAL PRIMARY KEY,
    "TopicTitle" TEXT NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public."AdminActivityLog" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "action" TEXT NOT NULL,
    "actor" TEXT,
    "target_id" TEXT,
    "target_name" TEXT,
    "details" JSONB,
    "result" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
