import { Pool, Client } from 'pg';

// 連線池：重用已建立的連線，避免每次 700ms 的冷啟動
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 5,               // 最多 5 條連線
    idleTimeoutMillis: 30000,  // 閒置 30 秒後釋放
    connectionTimeoutMillis: 10000,
});

/**
 * 從連線池取得一條連線。
 * 用完後呼叫 client.release()（不是 client.end()）。
 */
export async function connectDb() {
    const client = await pool.connect();
    // 包裝 end() 為 release()，相容現有程式碼
    const originalEnd = client.release.bind(client);
    (client as any).end = () => originalEnd();
    return client as any as Client;
}
