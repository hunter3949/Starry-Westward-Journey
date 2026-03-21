-- Convert SystemSettings from wide-table to key-value format.
-- The original init schema had individual columns on a single 'global' row.
-- The golden_dice functions and page.tsx already expect a Value column + one row per key.
-- This migration adds the Value column and migrates existing wide-table data.

-- 1. Add Value column (idempotent)
ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "Value" TEXT;

-- 2. Migrate wide-table data from the 'global' row into individual key-value rows.
--    Each INSERT only runs if data actually exists in the source column.
INSERT INTO "SystemSettings" ("SettingName", "Value")
SELECT 'TopicQuestTitle', "TopicQuestTitle"
FROM "SystemSettings"
WHERE "SettingName" = 'global' AND "TopicQuestTitle" IS NOT NULL
ON CONFLICT ("SettingName") DO UPDATE SET "Value" = EXCLUDED."Value";

INSERT INTO "SystemSettings" ("SettingName", "Value")
SELECT 'WorldState', "WorldState"
FROM "SystemSettings"
WHERE "SettingName" = 'global' AND "WorldState" IS NOT NULL
ON CONFLICT ("SettingName") DO UPDATE SET "Value" = EXCLUDED."Value";

INSERT INTO "SystemSettings" ("SettingName", "Value")
SELECT 'WorldStateMsg', "WorldStateMsg"
FROM "SystemSettings"
WHERE "SettingName" = 'global' AND "WorldStateMsg" IS NOT NULL
ON CONFLICT ("SettingName") DO UPDATE SET "Value" = EXCLUDED."Value";

INSERT INTO "SystemSettings" ("SettingName", "Value")
SELECT 'RegistrationMode', "RegistrationMode"
FROM "SystemSettings"
WHERE "SettingName" = 'global' AND "RegistrationMode" IS NOT NULL
ON CONFLICT ("SettingName") DO UPDATE SET "Value" = EXCLUDED."Value";

INSERT INTO "SystemSettings" ("SettingName", "Value")
SELECT 'VolunteerPassword', "VolunteerPassword"
FROM "SystemSettings"
WHERE "SettingName" = 'global' AND "VolunteerPassword" IS NOT NULL
ON CONFLICT ("SettingName") DO UPDATE SET "Value" = EXCLUDED."Value";

-- 3. Seed default VolunteerPassword if none exists yet
INSERT INTO "SystemSettings" ("SettingName", "Value")
VALUES ('VolunteerPassword', '000000')
ON CONFLICT ("SettingName") DO NOTHING;

-- 4. Remove the now-redundant 'global' wide-table row
DELETE FROM "SystemSettings" WHERE "SettingName" = 'global';
