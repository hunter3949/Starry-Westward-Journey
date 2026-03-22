-- Add coins override column to temporaryquests
-- When NULL, coins = floor(reward * 0.1) as before
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'temporaryquests' AND column_name = 'coins'
  ) THEN
    ALTER TABLE public."temporaryquests" ADD COLUMN "coins" INTEGER;
  END IF;
END $$;
