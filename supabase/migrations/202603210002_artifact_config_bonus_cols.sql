-- Add structured bonus columns to ArtifactConfig
ALTER TABLE "ArtifactConfig"
  ADD COLUMN IF NOT EXISTS "exp_multiplier_personal" NUMERIC,   -- e.g. 1.2 → 個人經驗 ×1.2
  ADD COLUMN IF NOT EXISTS "exp_multiplier_team"     NUMERIC,   -- e.g. 1.5 → 全隊經驗 ×1.5
  ADD COLUMN IF NOT EXISTS "exp_bonus_personal"      INTEGER,   -- e.g. 150 → 個人修為 +150
  ADD COLUMN IF NOT EXISTS "exp_bonus_team"          INTEGER;   -- e.g. 200 → 全隊修為 +200

-- Back-fill known values for a1–a6
UPDATE "ArtifactConfig" SET "exp_multiplier_personal" = 1.2  WHERE "id" = 'a1';
UPDATE "ArtifactConfig" SET "exp_bonus_personal"      = 150  WHERE "id" = 'a2';
UPDATE "ArtifactConfig" SET "exp_multiplier_team"     = 1.5  WHERE "id" = 'a3';
UPDATE "ArtifactConfig" SET "exp_multiplier_personal" = 1.5  WHERE "id" = 'a4';
UPDATE "ArtifactConfig" SET "exp_multiplier_personal" = 1.2  WHERE "id" = 'a5';
-- a6 has no numeric multiplier (unlocks 親證圓夢計劃 UI only)
