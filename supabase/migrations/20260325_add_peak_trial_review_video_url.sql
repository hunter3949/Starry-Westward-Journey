-- 巔峰試煉審核：新增影片連結欄位
ALTER TABLE "PeakTrialReviews" ADD COLUMN IF NOT EXISTS video_url TEXT;
