-- Add reward fields to Courses table
ALTER TABLE "Courses"
  ADD COLUMN IF NOT EXISTS "reward_exp" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "reward_coins" INTEGER DEFAULT 0;
