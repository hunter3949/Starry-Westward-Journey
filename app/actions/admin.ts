'use server';

import { connectDb } from '@/lib/db';
import { createClient } from '@supabase/supabase-js';

const _supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const _supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// ── 通用管理操作 Log ──────────────────────────────────────
export async function logAdminAction(
    action: string,
    actor: string,
    targetId?: string,
    targetName?: string,
    details?: Record<string, any>,
    result: 'success' | 'error' = 'success'
) {
    try {
        const supabase = createClient(_supabaseUrl, _supabaseKey);
        await supabase.from('AdminActivityLog').insert({
            action, actor, target_id: targetId, target_name: targetName, details, result,
        });
    } catch (_) { /* log failure should never break the main flow */ }
}

export async function triggerWeeklySnapshot() {
    
    const client = await connectDb();
    try {
        await client.query('BEGIN');

        // 1. Calculate past 7 days boundary
        const today = new Date();
        const past7Date = new Date();
        past7Date.setDate(today.getDate() - 7);
        const past7ISO = past7Date.toISOString();

        // 2. Find active users (who have logged anything in the last 7 days)
        const activeUsersRes = await client.query(`
            SELECT DISTINCT "UserID" FROM "DailyLogs"
            WHERE "Timestamp" >= $1
        `, [past7ISO]);

        const activeUsersCount = activeUsersRes.rowCount || 0;

        if (activeUsersCount === 0) {
            await client.query('COMMIT');
            return { success: true, worldState: 'normal', rate: 0, message: "過去 7 天無活躍使用者，環境保持平衡。" };
        }

        // 3. Count total daily quests (q1~q7) completed by these active users in last 7 days
        const logsRes = await client.query(`
            SELECT COUNT(*) as count FROM "DailyLogs"
            WHERE "Timestamp" >= $1 AND "QuestID" LIKE 'q%'
        `, [past7ISO]);

        const totalQuests = parseInt(logsRes.rows[0].count, 10);

        // 4. Calculate Rate (Max 3 quests/day per active user * 7 days = 21 max per user)
        const maxPossible = activeUsersCount * 21;
        const rate = totalQuests / maxPossible;

        // 5. Determine new World State
        let worldState = 'normal';
        let stateMsg = "【世俗】眾生修行平平，三界維持恐怖平衡。";
        if (rate > 0.8) {
            worldState = 'good';
            stateMsg = "【共好】全服精進達標！靈氣復甦，天降祥瑞與寶箱。";
        } else if (rate < 0.5) {
            worldState = 'bad';
            stateMsg = "【共業】全服懈怠！妖氣沖天，西北混沌區「世界王」結界鬆動。";
        }

        // 6. Update SystemSettings
        await client.query(`
            INSERT INTO "SystemSettings" ("SettingName", "Value") 
            VALUES ('WorldState', $1)
            ON CONFLICT ("SettingName") DO UPDATE SET "Value" = EXCLUDED."Value"
        `, [worldState]);

        await client.query(`
            INSERT INTO "SystemSettings" ("SettingName", "Value") 
            VALUES ('WorldStateMsg', $1)
            ON CONFLICT ("SettingName") DO UPDATE SET "Value" = EXCLUDED."Value"
        `, [stateMsg]);

        // 7. Clear old global entities
        await client.query(`DELETE FROM "MapEntities" WHERE type NOT IN ('monster', 'chest', 'portal')`);

        // 8. Generate new procedural entities based on worldState
        const chanceChest = worldState === 'good' ? 0.05 : worldState === 'bad' ? 0.01 : 0.02;
        const chanceMonster = worldState === 'good' ? 0.01 : worldState === 'bad' ? 0.08 : 0.02;

        // Global caps to prevent flooding
        const MAX_MONSTERS = worldState === 'bad' ? 60 : worldState === 'normal' ? 30 : 12;
        const MAX_CHESTS   = worldState === 'good' ? 40 : worldState === 'normal' ? 25 : 10;
        let monsterCount = 0;
        let chestCount = 0;

        // Zone direction lookup (same order as ZONES in constants.tsx)
        // pride=N, doubt=NE, anger=SE, greed=S, delusion=SW, chaos=NW
        const getZoneId = (q: number, r: number): string => {
            const s = -q - r;
            if (r < 0 && s > 0 && Math.abs(q) <= Math.abs(r)) return 'pride';
            if (q > 0 && r < 0) return 'doubt';
            if (q > 0 && s < 0) return 'anger';
            if (r > 0 && s < 0 && Math.abs(q) <= Math.abs(r)) return 'greed';
            if (q < 0 && r > 0) return 'delusion';
            if (q < 0 && s > 0) return 'chaos';
            return 'center';
        };

        // We simulate a grid area of radius ~15 to scatter entities
        const R = 15;
        for (let q = -R; q <= R; q++) {
            for (let r = Math.max(-R, -q - R); r <= Math.min(R, -q + R); r++) {
                if (q === 0 && r === 0) continue; // Safe hub
                if (monsterCount >= MAX_MONSTERS && chestCount >= MAX_CHESTS) break;

                const rand = Math.random();
                if (rand < chanceChest && chestCount < MAX_CHESTS) {
                    await client.query(`
                        INSERT INTO "MapEntities" (q, r, type, name, icon)
                        VALUES ($1, $2, 'treasure', '神秘寶箱', '🎁')
                    `, [q, r]);
                    chestCount++;
                } else if (rand < chanceChest + chanceMonster && monsterCount < MAX_MONSTERS) {
                    // Level scales with axial distance from center (Lv1 near hub, Lv20 at edges)
                    const dist = (Math.abs(q) + Math.abs(r) + Math.abs(-q - r)) / 2;
                    const level = Math.min(20, Math.max(1, Math.ceil(dist * 1.3)));
                    const isElite = level >= 10 && Math.random() < 0.25;
                    const hp = isElite ? Math.round((50 + level * 15) * 1.5) : 50 + level * 15;
                    const zoneId = getZoneId(q, r);
                    const zoneMonsterNames: Record<string, string> = {
                        pride: '慢心魔', doubt: '疑心魔', anger: '嗔心魔',
                        greed: '貪心魔', delusion: '痴心魔', chaos: '亂心魔',
                    };
                    const baseName = zoneMonsterNames[zoneId] ?? '野生妖獸';
                    const monsterName = isElite ? `精英${baseName}` : baseName;
                    const monsterIcon = isElite ? '👹' : '🐉';
                    const monsterData = isElite ? { level, hp, zone: zoneId, type: 'elite' } : { level, hp, zone: zoneId };
                    await client.query(`
                        INSERT INTO "MapEntities" (q, r, type, name, icon, data)
                        VALUES ($1, $2, 'monster', $3, $4, $5)
                    `, [q, r, monsterName, monsterIcon, JSON.stringify(monsterData)]);
                    monsterCount++;
                }
            }
            if (monsterCount >= MAX_MONSTERS && chestCount >= MAX_CHESTS) break;
        }

        await client.query('COMMIT');
        await logAdminAction('weekly_snapshot', 'admin', undefined, undefined, { worldState, rate: Math.round(rate * 100) + '%' });
        return { success: true, worldState, rate, message: stateMsg };

    } catch (error: any) {
        await client.query('ROLLBACK');
        await logAdminAction('weekly_snapshot', 'admin', undefined, undefined, { error: error.message }, 'error');
        return { success: false, error: error.message };
    } finally {
        await client.end();
    }
}

export async function checkWeeklyW3Compliance(startMondayISO?: string, endMondayISO?: string) {

    const client = await connectDb();
    try {
        // 計算雙週範圍：預設為「前兩週週一」至「本週週一」（共 14 天）
        let weekStart: Date;
        let weekEnd: Date;

        if (startMondayISO && endMondayISO) {
            weekStart = new Date(startMondayISO);
            // endMondayISO 是第二週的週一，加 7 天得週日結束
            weekEnd = new Date(endMondayISO);
            weekEnd.setDate(weekEnd.getDate() + 7);
        } else {
            // 預設：往回推 14 天（兩週前週一 → 本週週一）
            const today = new Date();
            const day = today.getDay() || 7;
            const thisMonday = new Date(today);
            thisMonday.setDate(today.getDate() - (day - 1));
            thisMonday.setHours(0, 0, 0, 0);
            weekStart = new Date(thisMonday);
            weekStart.setDate(thisMonday.getDate() - 14);
            weekEnd = new Date(thisMonday);
        }

        // period_label 類似 "2026-03-03~2026-03-10"（兩週起訖週一）
        const isoW1 = weekStart.toISOString().slice(0, 10);
        const w2Start = new Date(weekStart);
        w2Start.setDate(w2Start.getDate() + 7);
        const isoW2 = w2Start.toISOString().slice(0, 10);
        const periodLabel = `${isoW1}~${isoW2}`;

        // Get all users
        const usersRes = await client.query<{ UserID: string; Name: string; TotalFines: number }>(
            `SELECT "UserID", "Name", "TotalFines" FROM "CharacterStats"`
        );

        // Get all w3 logs in that bi-weekly range
        const logsRes = await client.query<{ UserID: string }>(
            `SELECT "UserID" FROM "DailyLogs"
             WHERE "QuestID" LIKE 'w3%'
               AND "Timestamp" >= $1 AND "Timestamp" < $2`,
            [weekStart.toISOString(), weekEnd.toISOString()]
        );

        const completedUserIds = new Set(logsRes.rows.map(r => r.UserID));

        const violators: { userId: string; name: string }[] = [];

        await client.query('BEGIN');
        for (const user of usersRes.rows) {
            if (!completedUserIds.has(user.UserID)) {
                violators.push({ userId: user.UserID, name: user.Name });
                await client.query(
                    `UPDATE "CharacterStats" SET "TotalFines" = "TotalFines" + 200 WHERE "UserID" = $1`,
                    [user.UserID]
                );
            }
        }
        await client.query('COMMIT');

        await logAdminAction('w3_compliance', 'admin', undefined, periodLabel, {
            totalUsers: usersRes.rowCount || 0,
            violatorCount: violators.length,
            violators: violators.map(v => v.name),
            periodLabel,
        });
        return {
            success: true,
            periodLabel,
            totalUsers: usersRes.rowCount || 0,
            violatorCount: violators.length,
            violators,
        };
    } catch (error: any) {
        await client.query('ROLLBACK');
        await logAdminAction('w3_compliance', 'admin', undefined, undefined, { error: error.message }, 'error');
        return { success: false, error: error.message };
    } finally {
        await client.end();
    }
}


const ZH_NUMS = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
    '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十'];

/**
 * 測試用：將現有玩家隨機分配到大隊 / 小隊，並自動設定隊長與 TeamSettings。
 * 每支小隊 SQUAD_SIZE 人，每個大隊 SQUADS_PER_BATTALION 支小隊。
 * 可重複執行（覆蓋舊值）。
 */
export async function autoAssignSquadsForTesting(
    squadSize = 4,
    squadsPerBattalion = 3
) {
    
    const client = await connectDb();
    try {
        await client.query('BEGIN');

        // 1. 取得所有玩家並隨機排列
        const { rows: allUsers } = await client.query<{ UserID: string; Name: string }>(
            `SELECT "UserID", "Name" FROM "CharacterStats" ORDER BY "UserID"`
        );
        if (allUsers.length === 0) {
            await client.query('ROLLBACK');
            return { success: false, error: '資料庫中尚無玩家' };
        }

        // Fisher-Yates shuffle
        for (let i = allUsers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allUsers[i], allUsers[j]] = [allUsers[j], allUsers[i]];
        }

        // 2. 分組
        const squads: { battalionName: string; squadName: string; members: typeof allUsers }[] = [];
        for (let i = 0; i < allUsers.length; i += squadSize) {
            const squadIdx = squads.length;
            const battalionIdx = Math.floor(squadIdx / squadsPerBattalion);
            const squadInBattalion = (squadIdx % squadsPerBattalion) + 1;
            const battalionName = `第${ZH_NUMS[battalionIdx] ?? battalionIdx + 1}大隊`;
            const squadName = `${battalionName}-小隊${ZH_NUMS[squadInBattalion - 1] ?? squadInBattalion}`;
            squads.push({ battalionName, squadName, members: allUsers.slice(i, i + squadSize) });
        }

        // 3. 更新 CharacterStats + upsert TeamSettings
        for (const squad of squads) {
            for (let mi = 0; mi < squad.members.length; mi++) {
                const user = squad.members[mi];
                const isCaptain = mi === 0;
                await client.query(
                    `UPDATE "CharacterStats"
                     SET "SquadName" = $1, "TeamName" = $2, "IsCaptain" = $3
                     WHERE "UserID" = $4`,
                    [squad.battalionName, squad.squadName, isCaptain, user.UserID]
                );
            }
            await client.query(
                `INSERT INTO "TeamSettings" (team_name, team_coins)
                 VALUES ($1, 0)
                 ON CONFLICT (team_name) DO NOTHING`,
                [squad.squadName]
            );
        }

        await client.query('COMMIT');

        await logAdminAction('auto_assign_squads', 'admin', undefined, undefined, {
            totalPlayers: allUsers.length,
            squadCount: squads.length,
            battalionCount: Math.ceil(squads.length / squadsPerBattalion),
        });
        return {
            success: true,
            totalPlayers: allUsers.length,
            squadCount: squads.length,
            battalionCount: Math.ceil(squads.length / squadsPerBattalion),
            summary: squads.map(s => ({
                squad: s.squadName,
                members: s.members.map((m, i) => `${m.Name}${i === 0 ? '（隊長）' : ''}`)
            })),
        };
    } catch (error: any) {
        await client.query('ROLLBACK');
        await logAdminAction('auto_assign_squads', 'admin', undefined, undefined, { error: error.message }, 'error');
        return { success: false, error: error.message };
    } finally {
        await client.end();
    }
}

export async function importRostersData(csvContent: string) {
    
    const client = await connectDb();

    try {
        await client.query('BEGIN');

        const rows = csvContent.split('\n');
        let count = 0;

        for (const row of rows) {
            const cols = row.split(',').map(c => c.trim());
            // Expecting: email, name, birthday, squad_name(大隊), team_name(小隊), is_captain, is_commandant
            const email = cols[0]?.toLowerCase();
            if (!email || !email.includes('@')) continue;

            const name = cols[1] || null;
            const birthday = cols[2] && /^\d{4}-\d{2}-\d{2}$/.test(cols[2]) ? cols[2] : null;
            const squad_name = cols[3] || null;
            const team_name = cols[4] || null;
            const is_captain = String(cols[5]).toLowerCase() === 'true';
            const is_commandant = String(cols[6]).toLowerCase() === 'true';

            await client.query(`
                INSERT INTO "Rosters" (email, name, birthday, squad_name, team_name, is_captain, is_commandant)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (email)
                DO UPDATE SET
                    name = EXCLUDED.name,
                    birthday = EXCLUDED.birthday,
                    squad_name = EXCLUDED.squad_name,
                    team_name = EXCLUDED.team_name,
                    is_captain = EXCLUDED.is_captain,
                    is_commandant = EXCLUDED.is_commandant
            `, [email, name, birthday, squad_name, team_name, is_captain, is_commandant]);

            // If they already created a CharacterStat, automatically sync all fields
            await client.query(`
                UPDATE "CharacterStats"
                SET "SquadName" = $2, "TeamName" = $3, "IsCaptain" = $4, "IsCommandant" = $5,
                    "Birthday" = COALESCE($6, "Birthday")
                WHERE "Email" = $1
            `, [email, squad_name, team_name, is_captain, is_commandant, birthday]);

            count++;
        }

        await client.query('COMMIT');
        await logAdminAction('roster_import', 'admin', undefined, undefined, { count });
        return { success: true, count };
    } catch (error: any) {
        await client.query('ROLLBACK');
        await logAdminAction('roster_import', 'admin', undefined, undefined, { error: error.message }, 'error');
        return { success: false, error: error.message };
    } finally {
        await client.end();
    }
}

// ── 手動新增人員 ────────────────────────────────────────
export async function adminCreateMember(data: {
    name: string;
    phone: string;
    email?: string;
    role: string;
    teamName?: string;
    squadName?: string;
    isCaptain?: boolean;
    isCommandant?: boolean;
}): Promise<{ success: boolean; userId?: string; error?: string }> {
    const supabase = createClient(_supabaseUrl, _supabaseKey);
    const userId = data.phone.replace(/\D/g, '');
    if (!userId) return { success: false, error: '手機號碼格式錯誤' };
    const { data: existing } = await supabase.from('CharacterStats').select('UserID').eq('UserID', userId).single();
    if (existing) return { success: false, error: `UserID「${userId}」已存在` };
    const newChar = {
        UserID: userId,
        Name: data.name.trim(),
        Role: data.role,
        Level: 1, Exp: 0, Coins: 0, GameGold: 0,
        Inventory: [], EnergyDice: 3, GoldenDice: 0,
        Savvy: 10, Luck: 10, Charisma: 10, Spirit: 10, Physique: 10, Potential: 10,
        Streak: 0, LastCheckIn: null, TotalFines: 0, FinePaid: 0,
        CurrentQ: 0, CurrentR: 0, HP: null, MaxHP: null,
        Email: data.email?.trim()?.toLowerCase() || null,
        TeamName: data.teamName?.trim() || null,
        SquadName: data.isCommandant ? null : (data.squadName?.trim() || null),
        IsCaptain: !!data.isCaptain,
        IsCommandant: !!data.isCommandant,
    };
    const { error } = await supabase.from('CharacterStats').insert([newChar]);
    if (error) return { success: false, error: error.message };
    return { success: true, userId };
}

// ── 大小隊分組管理 ────────────────────────────────────────
export async function updateMemberAssignment(
    userId: string,
    teamName: string,
    squadName: string,
    isCaptain: boolean,
    isCommandant: boolean,
    isGM?: boolean,
): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient(_supabaseUrl, _supabaseKey);
    const updateData: Record<string, unknown> = { TeamName: teamName || null, SquadName: squadName || null, IsCaptain: isCaptain, IsCommandant: isCommandant };
    if (isGM !== undefined) updateData.IsGM = isGM;
    const { error } = await supabase
        .from('CharacterStats')
        .update(updateData)
        .eq('UserID', userId);
    if (error) return { success: false, error: error.message };
    return { success: true };
}

// ── 玩家設定生日 ────────────────────────────────────────
export async function saveBirthday(userId: string, birthday: string) {
    // Validate format YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthday)) return { success: false, error: '日期格式錯誤，請使用 YYYY-MM-DD' };
    const supabase = createClient(_supabaseUrl, _supabaseKey);
    const { error } = await supabase
        .from('CharacterStats')
        .update({ Birthday: birthday })
        .eq('UserID', userId);
    if (error) return { success: false, error: error.message };
    return { success: true };
}

// ── 大小隊自訂隊名 ────────────────────────────────────────
export async function getGroupDisplayNames(): Promise<{
    squads: { team_name: string; display_name: string | null }[];
    battalions: { battalion_name: string; display_name: string | null }[];
}> {
    const supabase = createClient(_supabaseUrl, _supabaseKey);
    const [{ data: squads }, { data: battalions }] = await Promise.all([
        supabase.from('TeamSettings').select('team_name, display_name'),
        supabase.from('BattalionSettings').select('battalion_name, display_name'),
    ]);
    return {
        squads: (squads ?? []) as { team_name: string; display_name: string | null }[],
        battalions: (battalions ?? []) as { battalion_name: string; display_name: string | null }[],
    };
}

export async function setSquadDisplayName(squadName: string, displayName: string): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient(_supabaseUrl, _supabaseKey);
    const { error } = await supabase
        .from('TeamSettings')
        .upsert({ team_name: squadName, display_name: displayName.trim() || null }, { onConflict: 'team_name' });
    if (error) return { success: false, error: error.message };
    return { success: true };
}

export async function setBattalionDisplayName(battalionName: string, displayName: string): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient(_supabaseUrl, _supabaseKey);
    const { error } = await supabase
        .from('BattalionSettings')
        .upsert({ battalion_name: battalionName, display_name: displayName.trim() || null }, { onConflict: 'battalion_name' });
    if (error) return { success: false, error: error.message };
    return { success: true };
}

// ── 修行定課管理 ──────────────────────────────────────────────────────────────

export interface DailyQuestConfigRow {
    id: string;
    title: string;
    sub: string | null;
    desc: string | null;
    reward: number;
    coins: number | null; // null = 使用預設規則（exp * 0.1）
    dice: number;
    icon: string | null;
    limit: number | null;
    sort_order: number;
    is_active: boolean;
    created_at: string;
}

export async function listDailyQuestConfig(): Promise<DailyQuestConfigRow[]> {
    const supabase = createClient(_supabaseUrl, _supabaseKey);
    const { data, error } = await supabase
        .from('DailyQuestConfig')
        .select('*')
        .order('sort_order', { ascending: true });
    if (error || !data) return [];
    return data as DailyQuestConfigRow[];
}

export async function upsertDailyQuestConfig(
    row: Omit<DailyQuestConfigRow, 'created_at'>
): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient(_supabaseUrl, _supabaseKey);
    const { error } = await supabase
        .from('DailyQuestConfig')
        .upsert(row, { onConflict: 'id' });
    if (error) return { success: false, error: error.message };
    return { success: true };
}

export async function deleteDailyQuestConfig(id: string): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient(_supabaseUrl, _supabaseKey);
    const { error } = await supabase.from('DailyQuestConfig').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
}

// ── 天庭藏寶閣法寶管理 ────────────────────────────────────────────────────────

export interface ArtifactConfigRow {
    id: string;
    name: string;
    description: string;
    effect: string;
    icon: string | null;
    price: number;
    is_team_binding: boolean;
    limit: number;
    exclusive_with: string | null;
    exp_multiplier_personal: number | null;
    exp_multiplier_team: number | null;
    exp_bonus_personal: number | null;
    exp_bonus_team: number | null;
    is_active: boolean;
    sort_order: number;
    created_at: string;
}

export async function listArtifactConfig(): Promise<ArtifactConfigRow[]> {
    const supabase = createClient(_supabaseUrl, _supabaseKey);
    const { data, error } = await supabase
        .from('ArtifactConfig')
        .select('*')
        .order('sort_order', { ascending: true });
    if (error || !data) return [];
    return data as ArtifactConfigRow[];
}

export async function upsertArtifactConfig(
    row: Omit<ArtifactConfigRow, 'created_at'>
): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient(_supabaseUrl, _supabaseKey);
    const { error } = await supabase
        .from('ArtifactConfig')
        .upsert(row, { onConflict: 'id' });
    if (error) return { success: false, error: error.message };
    return { success: true };
}

export async function deleteArtifactConfig(id: string): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient(_supabaseUrl, _supabaseKey);
    const { error } = await supabase.from('ArtifactConfig').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
}

export async function uploadQuestIcon(formData: FormData): Promise<{ success: boolean; url?: string; error?: string }> {
    const supabase = createClient(_supabaseUrl, _supabaseKey);
    const file = formData.get('file') as File | null;
    if (!file) return { success: false, error: '無效檔案' };

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png';
    const fileName = `quest-icons/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();

    const { error } = await supabase.storage
        .from('public')
        .upload(fileName, arrayBuffer, { contentType: file.type, upsert: true });

    if (error) return { success: false, error: error.message };

    const { data } = supabase.storage.from('public').getPublicUrl(fileName);
    return { success: true, url: data.publicUrl };
}

// ── 成就殿堂管理 ──────────────────────────────────────────────────────────────

export interface AchievementConfigRow {
    id: string;
    name: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    icon: string;
    hint: string;
    description: string;
    role_exclusive: string | null;
    is_active: boolean;
    sort_order: number;
    created_at: string;
}

export async function listAchievementConfig(): Promise<AchievementConfigRow[]> {
    const supabase = createClient(_supabaseUrl, _supabaseKey);
    const { data, error } = await supabase
        .from('AchievementConfig')
        .select('*')
        .order('sort_order', { ascending: true });
    if (error || !data) return [];
    return data as AchievementConfigRow[];
}

export async function upsertAchievementConfig(
    row: Omit<AchievementConfigRow, 'created_at'>
): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient(_supabaseUrl, _supabaseKey);
    const { error } = await supabase
        .from('AchievementConfig')
        .upsert(row, { onConflict: 'id' });
    if (error) return { success: false, error: error.message };
    return { success: true };
}

export async function deleteAchievementConfig(id: string): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient(_supabaseUrl, _supabaseKey);
    const { error } = await supabase.from('AchievementConfig').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
}

// ── 圖片庫（Supabase Storage）─────────────────────────────────────────────────

export interface StorageFileItem {
    name: string;
    fullPath: string;   // e.g. "gallery/hero.png"
    publicUrl: string;
    size: number;       // bytes
    createdAt: string;
}

const GALLERY_BUCKET = 'public';

/** List files under a given folder prefix (empty = root). */
export async function listStorageFiles(folder: string = 'gallery'): Promise<StorageFileItem[]> {
    const supabase = createClient(_supabaseUrl, _supabaseKey);
    const { data, error } = await supabase.storage
        .from(GALLERY_BUCKET)
        .list(folder, { limit: 200, sortBy: { column: 'created_at', order: 'desc' } });
    if (error || !data) return [];

    return data
        .filter(f => f.name !== '.emptyFolderPlaceholder' && f.id)   // skip placeholder & folders
        .map(f => {
            const fullPath = folder ? `${folder}/${f.name}` : f.name;
            const { data: urlData } = supabase.storage.from(GALLERY_BUCKET).getPublicUrl(fullPath);
            return {
                name: f.name,
                fullPath,
                publicUrl: urlData.publicUrl,
                size: f.metadata?.size ?? 0,
                createdAt: f.created_at ?? '',
            };
        });
}

/** List all top-level folders in the bucket. */
export async function listStorageFolders(): Promise<string[]> {
    const supabase = createClient(_supabaseUrl, _supabaseKey);
    const { data } = await supabase.storage.from(GALLERY_BUCKET).list('', { limit: 100 });
    if (!data) return [];
    // Folders have no id / metadata; files have an id
    const folders = data.filter(f => !f.id && f.name !== '.emptyFolderPlaceholder').map(f => f.name);
    return folders;
}

/** Upload one file to Supabase Storage. FormData must contain 'file' and 'folder'. */
export async function uploadStorageFile(
    formData: FormData
): Promise<{ success: boolean; item?: StorageFileItem; error?: string }> {
    const supabase = createClient(_supabaseUrl, _supabaseKey);
    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string | null) ?? 'gallery';
    if (!file) return { success: false, error: '無效檔案' };

    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const fullPath = `${folder}/${Date.now()}-${safeName}`;
    const buf = await file.arrayBuffer();

    const { error } = await supabase.storage
        .from(GALLERY_BUCKET)
        .upload(fullPath, buf, { contentType: file.type, upsert: false });
    if (error) return { success: false, error: error.message };

    const { data: urlData } = supabase.storage.from(GALLERY_BUCKET).getPublicUrl(fullPath);
    return {
        success: true,
        item: { name: file.name, fullPath, publicUrl: urlData.publicUrl, size: file.size, createdAt: new Date().toISOString() },
    };
}

/** Delete a file by its full path (e.g. "gallery/foo.png"). */
export async function deleteStorageFile(
    fullPath: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient(_supabaseUrl, _supabaseKey);
    const { error } = await supabase.storage.from(GALLERY_BUCKET).remove([fullPath]);
    if (error) return { success: false, error: error.message };
    return { success: true };
}

// ── 任務角色管理 ──────────────────────────────────────────
export interface QuestRole {
    id: string;
    name: string;
    duties: string[];
}

export async function getQuestRoles(): Promise<QuestRole[]> {
    const supabase = createClient(_supabaseUrl, _supabaseKey);
    const { data } = await supabase.from('SystemSettings').select('Value').eq('SettingName', 'QuestRoles').single();
    if (!data?.Value) return [];
    try { return JSON.parse(data.Value) as QuestRole[]; } catch { return []; }
}

export async function saveQuestRoles(roles: QuestRole[]): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient(_supabaseUrl, _supabaseKey);
    const { error } = await supabase.from('SystemSettings').upsert(
        { SettingName: 'QuestRoles', Value: JSON.stringify(roles) },
        { onConflict: 'SettingName' }
    );
    if (error) return { success: false, error: error.message };
    return { success: true };
}

// ── LINE 取消綁定 ─────────────────────────────────────────────────
// ── 志工密碼輪換 ────────────────────────────────────────
export async function rotateVolunteerPassword(): Promise<{ success: boolean; newPassword?: string; error?: string }> {
    const newPassword = String(Math.floor(100000 + Math.random() * 900000));
    const supabase = createClient(_supabaseUrl, _supabaseKey);
    const { error } = await supabase
        .from('SystemSettings')
        .upsert({ SettingName: 'VolunteerPassword', Value: newPassword }, { onConflict: 'SettingName' });
    if (error) return { success: false, error: error.message };
    return { success: true, newPassword };
}

export async function unbindLine(userId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient(_supabaseUrl, _supabaseKey);
    const { error } = await supabase
        .from('CharacterStats')
        .update({ LineUserId: null })
        .eq('UserID', userId);
    if (error) return { success: false, error: error.message };
    return { success: true };
}
