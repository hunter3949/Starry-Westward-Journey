-- 巔峰試煉活動表
CREATE TABLE IF NOT EXISTS PeakTrials (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    title        TEXT        NOT NULL,
    description  TEXT,
    date         DATE        NOT NULL,
    time         TEXT,
    location     TEXT,
    max_participants INTEGER,
    battalion_name   TEXT,
    created_by       TEXT        NOT NULL,  -- 大隊長 UserID 或 admin
    is_active        BOOLEAN     DEFAULT true,
    created_at       TIMESTAMPTZ DEFAULT now()
);

-- 巔峰試煉報名表
CREATE TABLE IF NOT EXISTS PeakTrialRegistrations (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    trial_id       UUID        NOT NULL REFERENCES PeakTrials(id) ON DELETE CASCADE,
    user_id        TEXT        NOT NULL,
    user_name      TEXT        NOT NULL,
    squad_name     TEXT,
    battalion_name TEXT,
    registered_at  TIMESTAMPTZ DEFAULT now(),
    attended       BOOLEAN     DEFAULT false,
    attended_at    TIMESTAMPTZ,
    UNIQUE(trial_id, user_id)
);
