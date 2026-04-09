-- Add category to distinguish 臨時任務 vs 特殊任務
ALTER TABLE "temporaryquests"
  ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'temp';
-- temp = 臨時加分任務, special = 特殊任務
