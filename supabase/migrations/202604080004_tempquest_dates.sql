-- Add start/end date range to temporary quests
ALTER TABLE "temporaryquests"
  ADD COLUMN IF NOT EXISTS "start_date" TEXT,  -- YYYY-MM-DD, NULL = immediate
  ADD COLUMN IF NOT EXISTS "end_date" TEXT;    -- YYYY-MM-DD, NULL = no end
