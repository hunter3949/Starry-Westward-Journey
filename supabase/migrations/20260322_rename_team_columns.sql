-- Rename system team name columns for clarity
ALTER TABLE "CharacterStats" RENAME COLUMN "SquadName" TO "LittleTeamLeagelName";
ALTER TABLE "CharacterStats" RENAME COLUMN "TeamName" TO "BigTeamLeagelName";

-- Add nickname columns (set by captains, separate from system names)
ALTER TABLE "CharacterStats" ADD COLUMN IF NOT EXISTS "LittleTeamNickName" TEXT DEFAULT NULL;
ALTER TABLE "CharacterStats" ADD COLUMN IF NOT EXISTS "BigTeamNickName" TEXT DEFAULT NULL;
