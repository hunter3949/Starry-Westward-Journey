-- Rename Rosters table columns to match correct semantics:
-- squad_name (大隊) → big_team_name
-- team_name  (小隊) → little_team_name
ALTER TABLE "Rosters" RENAME COLUMN squad_name TO big_team_name;
ALTER TABLE "Rosters" RENAME COLUMN team_name TO little_team_name;
