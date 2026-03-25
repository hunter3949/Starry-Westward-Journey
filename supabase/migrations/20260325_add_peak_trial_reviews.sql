-- 巔峰試煉審核申請表
CREATE TABLE IF NOT EXISTS "PeakTrialReviews" (
    id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    trial_id           UUID        NOT NULL REFERENCES "PeakTrials"(id) ON DELETE CASCADE,
    trial_title        TEXT        NOT NULL,
    battalion_name     TEXT        NOT NULL,
    submitted_by       TEXT        NOT NULL,
    own_participants   INTEGER     NOT NULL DEFAULT 0,  -- 本隊參與人數
    cross_participants INTEGER     NOT NULL DEFAULT 0,  -- 跨出參與人數
    reward_per_person  INTEGER     NOT NULL DEFAULT 0,  -- 每人增加修為
    total_members      INTEGER     NOT NULL DEFAULT 0,  -- 本大隊總人數
    photo_data         TEXT,                            -- 大合照 base64
    status             TEXT        NOT NULL DEFAULT 'pending', -- pending / approved / rejected
    reviewed_by        TEXT,
    reviewed_at        TIMESTAMPTZ,
    review_notes       TEXT,
    created_at         TIMESTAMPTZ DEFAULT now(),
    UNIQUE(trial_id, battalion_name)
);

ALTER TABLE "PeakTrialReviews" DISABLE ROW LEVEL SECURITY;
