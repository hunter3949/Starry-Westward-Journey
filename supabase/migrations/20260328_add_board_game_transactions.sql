-- 開運大富翁：現金/福報異動明細
CREATE TABLE IF NOT EXISTS "BoardGameTransactions" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,          -- 'buy_exchange' | 'sell_exchange' | 'life_reset' | 'admin_adjust'
    cash_delta INTEGER NOT NULL DEFAULT 0,
    blessing_delta INTEGER NOT NULL DEFAULT 0,
    cash_after INTEGER NOT NULL DEFAULT 0,
    blessing_after INTEGER NOT NULL DEFAULT 0,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bgtx_user_id ON "BoardGameTransactions"(user_id, created_at DESC);
ALTER TABLE "BoardGameTransactions" DISABLE ROW LEVEL SECURITY;
