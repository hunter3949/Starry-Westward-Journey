-- Rename columns to unified naming convention (matching CharacterStats field names)
-- Rosters: squad_name/big_team_name → BigTeamLeagelName
--          team_name/little_team_name → LittleTeamLeagelName
-- TeamSettings: team_name → LittleTeamLeagelName

DO $$
BEGIN
  -- Rosters: handle all intermediate names
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Rosters' AND column_name = 'squad_name') THEN
    ALTER TABLE public."Rosters" RENAME COLUMN "squad_name" TO "BigTeamLeagelName";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Rosters' AND column_name = 'team_name') THEN
    ALTER TABLE public."Rosters" RENAME COLUMN "team_name" TO "LittleTeamLeagelName";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Rosters' AND column_name = 'big_team_name') THEN
    ALTER TABLE public."Rosters" RENAME COLUMN "big_team_name" TO "BigTeamLeagelName";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Rosters' AND column_name = 'little_team_name') THEN
    ALTER TABLE public."Rosters" RENAME COLUMN "little_team_name" TO "LittleTeamLeagelName";
  END IF;

  -- TeamSettings: rename primary key column
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'TeamSettings' AND column_name = 'team_name') THEN
    ALTER TABLE public."TeamSettings" RENAME COLUMN "team_name" TO "LittleTeamLeagelName";
  END IF;
END $$;
