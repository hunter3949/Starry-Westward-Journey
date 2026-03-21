'use server';

import { connectDb } from '@/lib/db';
import { logAdminAction } from './admin';

// QuestRole 儲存為 JSON 陣列字串，如 '["role1","role2"]' 或舊格式單一字串
function parseRoles(questRole: string | null): string[] {
    if (!questRole) return [];
    try {
        const parsed = JSON.parse(questRole);
        return Array.isArray(parsed) ? parsed : [questRole];
    } catch {
        return [questRole];
    }
}

// ── 1. 查詢小隊所有成員罰款狀態 ─────────────────────────────────
// 回傳每位成員：累計罰款、已繳、餘額
export async function getSquadFineStatus(captainUserId: string) {
    const client = await connectDb();
    try {
        // 先確認是小隊長，取得 LittleTeamLeagelName（小隊）
        const captainRes = await client.query<{ LittleTeamLeagelName: string; IsCaptain: boolean }>(
            `SELECT "LittleTeamLeagelName", "IsCaptain" FROM "CharacterStats" WHERE "UserID" = $1`,
            [captainUserId]
        );
        if (!captainRes.rows[0]?.IsCaptain) {
            return { success: false, error: '僅限小隊長使用此功能' };
        }
        const squadName = captainRes.rows[0].LittleTeamLeagelName;

        const membersRes = await client.query<{
            UserID: string;
            Name: string;
            TotalFines: number;
            FinePaid: number;
        }>(
            `SELECT "UserID", "Name", "TotalFines", COALESCE("FinePaid", 0) AS "FinePaid"
             FROM "CharacterStats"
             WHERE "LittleTeamLeagelName" = $1
             ORDER BY "Name"`,
            [squadName]
        );

        const members = membersRes.rows.map(m => ({
            userId: m.UserID,
            name: m.Name,
            totalFines: m.TotalFines,
            finePaid: m.FinePaid,
            balance: Math.max(0, m.TotalFines - m.FinePaid),
        }));

        return { success: true, squadName, members };
    } catch (error: any) {
        return { success: false, error: error.message };
    } finally {
        await client.end();
    }
}

// ── 取得小隊成員（含任務角色）────────────────────────────────────
export async function getSquadMembersWithRoles(captainUserId: string): Promise<{
    success: boolean; members?: { userId: string; name: string; questRoles: string[] }[]; error?: string;
}> {
    const client = await connectDb();
    try {
        const captainRes = await client.query<{ LittleTeamLeagelName: string; IsCaptain: boolean; IsGM: boolean }>(
            `SELECT "LittleTeamLeagelName", "IsCaptain", "IsGM" FROM "CharacterStats" WHERE "UserID" = $1`,
            [captainUserId]
        );
        const captain = captainRes.rows[0];
        if (!captain?.IsCaptain && !captain?.IsGM) return { success: false, error: '僅限小隊長' };
        const squadName = captain.LittleTeamLeagelName;
        if (!squadName) return { success: false, error: '無小隊資料' };

        const membersRes = await client.query<{ UserID: string; Name: string; QuestRole: string | null }>(
            `SELECT "UserID", "Name", "QuestRole" FROM "CharacterStats" WHERE "LittleTeamLeagelName" = $1 ORDER BY "Name"`,
            [squadName]
        );
        return {
            success: true,
            members: membersRes.rows.map(r => ({ userId: r.UserID, name: r.Name, questRoles: parseRoles(r.QuestRole) })),
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    } finally {
        await client.end();
    }
}

// ── 設定隊員任務角色（assign=指派, unassign=移除）────────────────
// 每位成員最多持有 2 個角色；assign 時會自動移除舊持有者的相同角色
export async function setMemberQuestRole(
    captainUserId: string,
    targetUserId: string,
    roleId: string,
    action: 'assign' | 'unassign',
): Promise<{ success: boolean; error?: string }> {
    const client = await connectDb();
    try {
        await client.query('BEGIN');
        const captainRes = await client.query<{ LittleTeamLeagelName: string; IsCaptain: boolean; IsGM: boolean }>(
            `SELECT "LittleTeamLeagelName", "IsCaptain", "IsGM" FROM "CharacterStats" WHERE "UserID" = $1`,
            [captainUserId]
        );
        const captain = captainRes.rows[0];
        if (!captain?.IsCaptain && !captain?.IsGM) {
            await client.query('ROLLBACK');
            return { success: false, error: '僅限小隊長' };
        }
        const squadName = captain.LittleTeamLeagelName;

        if (action === 'unassign') {
            const tgtRes = await client.query<{ QuestRole: string | null }>(
                `SELECT "QuestRole" FROM "CharacterStats" WHERE "UserID" = $1`, [targetUserId]
            );
            const newRoles = parseRoles(tgtRes.rows[0]?.QuestRole).filter(r => r !== roleId);
            await client.query(
                `UPDATE "CharacterStats" SET "QuestRole" = $1 WHERE "UserID" = $2`,
                [newRoles.length ? JSON.stringify(newRoles) : null, targetUserId]
            );
            await client.query('COMMIT');
            return { success: true };
        }

        // assign: 先移除舊持有者的此角色
        const allMembersRes = await client.query<{ UserID: string; QuestRole: string | null }>(
            `SELECT "UserID", "QuestRole" FROM "CharacterStats" WHERE "LittleTeamLeagelName" = $1`, [squadName]
        );
        for (const m of allMembersRes.rows) {
            if (m.UserID !== targetUserId && parseRoles(m.QuestRole).includes(roleId)) {
                const cleaned = parseRoles(m.QuestRole).filter(r => r !== roleId);
                await client.query(
                    `UPDATE "CharacterStats" SET "QuestRole" = $1 WHERE "UserID" = $2`,
                    [cleaned.length ? JSON.stringify(cleaned) : null, m.UserID]
                );
            }
        }

        // 確認目標成員在同一小隊且角色數 < 2
        const targetRes = await client.query<{ LittleTeamLeagelName: string; QuestRole: string | null }>(
            `SELECT "LittleTeamLeagelName", "QuestRole" FROM "CharacterStats" WHERE "UserID" = $1`, [targetUserId]
        );
        const target = targetRes.rows[0];
        if (target?.LittleTeamLeagelName !== squadName) {
            await client.query('ROLLBACK');
            return { success: false, error: '目標成員不在本小隊' };
        }
        const existingRoles = parseRoles(target?.QuestRole).filter(r => r !== roleId);
        if (existingRoles.length >= 2) {
            await client.query('ROLLBACK');
            return { success: false, error: '此成員已持有 2 個角色，請先移除一個' };
        }

        const newRoles = [...existingRoles, roleId];
        await client.query(
            `UPDATE "CharacterStats" SET "QuestRole" = $1 WHERE "UserID" = $2`,
            [JSON.stringify(newRoles), targetUserId]
        );
        await client.query('COMMIT');
        return { success: true };
    } catch (error: any) {
        await client.query('ROLLBACK');
        return { success: false, error: error.message };
    } finally {
        await client.end();
    }
}

// ── 2. 記錄隊員繳款 ──────────────────────────────────────────────
// amount: 此次繳款金額（NT$）
// periodLabel: 結算週期標籤，例如 "2026-W19~W20"
// paidToCaptainAt: 隊員交款給小隊長的日期（選填，YYYY-MM-DD）
export async function recordFinePayment(
    captainUserId: string,
    targetUserId: string,
    amount: number,
    periodLabel: string,
    paidToCaptainAt?: string,
) {
    if (amount <= 0) return { success: false, error: '金額必須大於 0' };

    const client = await connectDb();
    try {
        await client.query('BEGIN');

        // 權限確認：captainUserId 是同小隊長
        const captainRes = await client.query<{ LittleTeamLeagelName: string; IsCaptain: boolean }>(
            `SELECT "LittleTeamLeagelName", "IsCaptain" FROM "CharacterStats" WHERE "UserID" = $1`,
            [captainUserId]
        );
        if (!captainRes.rows[0]?.IsCaptain) {
            await client.query('ROLLBACK');
            return { success: false, error: '僅限小隊長使用此功能' };
        }
        const squadName = captainRes.rows[0].LittleTeamLeagelName;

        // 確認目標隊員在同小隊
        const targetRes = await client.query<{ Name: string; TotalFines: number; FinePaid: number; LittleTeamLeagelName: string }>(
            `SELECT "Name", "TotalFines", COALESCE("FinePaid", 0) AS "FinePaid", "LittleTeamLeagelName"
             FROM "CharacterStats" WHERE "UserID" = $1`,
            [targetUserId]
        );
        const target = targetRes.rows[0];
        if (!target || target.LittleTeamLeagelName !== squadName) {
            await client.query('ROLLBACK');
            return { success: false, error: '目標隊員不在同一小隊' };
        }

        // 不能超過餘額
        const balance = Math.max(0, target.TotalFines - target.FinePaid);
        if (amount > balance) {
            await client.query('ROLLBACK');
            return { success: false, error: `繳款金額 NT$${amount} 超過餘額 NT$${balance}` };
        }

        // 更新 FinePaid
        await client.query(
            `UPDATE "CharacterStats" SET "FinePaid" = COALESCE("FinePaid", 0) + $1 WHERE "UserID" = $2`,
            [amount, targetUserId]
        );

        // 寫入 FinePayments 紀錄
        const insertRes = await client.query<{ id: string }>(
            `INSERT INTO "FinePayments"
               (user_id, user_name, squad_name, amount, period_label, paid_to_captain_at, recorded_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id`,
            [
                targetUserId,
                target.Name,
                squadName,
                amount,
                periodLabel,
                paidToCaptainAt || null,
                captainUserId,
            ]
        );

        await client.query('COMMIT');
        await logAdminAction('fine_payment', captainUserId, targetUserId, target.Name, {
            amount, periodLabel, paidToCaptainAt,
        });

        return { success: true, paymentId: insertRes.rows[0].id };
    } catch (error: any) {
        await client.query('ROLLBACK');
        return { success: false, error: error.message };
    } finally {
        await client.end();
    }
}

// ── 3. 更新「隊員交款給小隊長」日期 ──────────────────────────────
export async function setPaidToCaptainDate(
    captainUserId: string,
    paymentId: string,
    date: string,  // YYYY-MM-DD
) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { success: false, error: '日期格式錯誤，請使用 YYYY-MM-DD' };

    const client = await connectDb();
    try {
        // 確認是小隊長且此筆 payment 屬於同小隊
        const captainRes = await client.query<{ LittleTeamLeagelName: string; IsCaptain: boolean }>(
            `SELECT "LittleTeamLeagelName", "IsCaptain" FROM "CharacterStats" WHERE "UserID" = $1`,
            [captainUserId]
        );
        if (!captainRes.rows[0]?.IsCaptain) return { success: false, error: '僅限小隊長使用' };

        const { rowCount } = await client.query(
            `UPDATE "FinePayments"
             SET paid_to_captain_at = $1
             WHERE id = $2 AND squad_name = $3`,
            [date, paymentId, captainRes.rows[0].LittleTeamLeagelName]
        );
        if (!rowCount) return { success: false, error: '找不到該繳款紀錄或不屬於本小隊' };

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    } finally {
        await client.end();
    }
}

// ── 4. 更新「小隊長上繳大會」日期 ────────────────────────────────
export async function setSubmittedToOrgDate(
    captainUserId: string,
    paymentId: string,
    date: string,  // YYYY-MM-DD
) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { success: false, error: '日期格式錯誤，請使用 YYYY-MM-DD' };

    const client = await connectDb();
    try {
        const captainRes = await client.query<{ LittleTeamLeagelName: string; IsCaptain: boolean }>(
            `SELECT "LittleTeamLeagelName", "IsCaptain" FROM "CharacterStats" WHERE "UserID" = $1`,
            [captainUserId]
        );
        if (!captainRes.rows[0]?.IsCaptain) return { success: false, error: '僅限小隊長使用' };

        const { rowCount } = await client.query(
            `UPDATE "FinePayments"
             SET submitted_to_org_at = $1
             WHERE id = $2 AND squad_name = $3`,
            [date, paymentId, captainRes.rows[0].LittleTeamLeagelName]
        );
        if (!rowCount) return { success: false, error: '找不到該繳款紀錄或不屬於本小隊' };

        await logAdminAction('fine_submitted_to_org', captainUserId, paymentId, undefined, { date });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    } finally {
        await client.end();
    }
}

// ── 5. 小隊長觸發上週 w3 違規結算 ────────────────────────────────
// mondayISO: 指定週的週一日期（YYYY-MM-DD），省略時預設為上週週一
export async function checkSquadW3Compliance(
    captainUserId: string,
    mondayISO?: string,
) {
    const client = await connectDb();
    try {
        // 驗證小隊長身份
        const captainRes = await client.query<{ LittleTeamLeagelName: string; IsCaptain: boolean }>(
            `SELECT "LittleTeamLeagelName", "IsCaptain" FROM "CharacterStats" WHERE "UserID" = $1`,
            [captainUserId]
        );
        if (!captainRes.rows[0]?.IsCaptain) {
            return { success: false, error: '僅限小隊長使用此功能' };
        }
        const teamName = captainRes.rows[0].LittleTeamLeagelName;

        // 計算上週範圍（台灣時間，週一00:00 ~ 週一00:00）
        let weekStart: Date;
        if (mondayISO) {
            weekStart = new Date(mondayISO + 'T00:00:00+08:00');
        } else {
            const nowTW = new Date(Date.now() + 8 * 3600 * 1000);
            const day = nowTW.getUTCDay() || 7;
            const thisMonday = new Date(nowTW);
            thisMonday.setUTCDate(nowTW.getUTCDate() - (day - 1));
            thisMonday.setUTCHours(0, 0, 0, 0);
            weekStart = new Date(thisMonday);
            weekStart.setUTCDate(thisMonday.getUTCDate() - 7);
        }
        const weekEnd = new Date(weekStart);
        weekEnd.setUTCDate(weekStart.getUTCDate() + 7);
        const periodLabel = weekStart.toISOString().slice(0, 10);

        // 冪等保護：同一小隊同一週期只能結算一次
        const existingLog = await client.query(
            `SELECT id FROM "AdminActivityLog"
             WHERE action = 'w3_compliance' AND target_name = $1
             LIMIT 1`,
            [`${periodLabel}|${teamName}`]
        );
        if (existingLog.rowCount && existingLog.rowCount > 0) {
            return { success: true, alreadyRun: true, periodLabel };
        }

        // 查小隊所有成員
        const membersRes = await client.query<{ UserID: string; Name: string }>(
            `SELECT "UserID", "Name" FROM "CharacterStats" WHERE "LittleTeamLeagelName" = $1`,
            [teamName]
        );

        // 查該週內本小隊成員有無 w3 記錄
        const logsRes = await client.query<{ UserID: string }>(
            `SELECT DISTINCT "UserID" FROM "DailyLogs"
             WHERE "QuestID" LIKE 'w3%'
               AND "Timestamp" >= $1 AND "Timestamp" < $2
               AND "UserID" = ANY($3)`,
            [weekStart.toISOString(), weekEnd.toISOString(), membersRes.rows.map(m => m.UserID)]
        );
        const completedIds = new Set(logsRes.rows.map(r => r.UserID));

        const violators: { userId: string; name: string }[] = [];
        await client.query('BEGIN');
        for (const m of membersRes.rows) {
            if (!completedIds.has(m.UserID)) {
                violators.push({ userId: m.UserID, name: m.Name });
                await client.query(
                    `UPDATE "CharacterStats" SET "TotalFines" = "TotalFines" + 200 WHERE "UserID" = $1`,
                    [m.UserID]
                );
            }
        }
        await client.query('COMMIT');

        await logAdminAction('w3_compliance', captainUserId, undefined, `${periodLabel}|${teamName}`, {
            teamName,
            periodLabel,
            totalMembers: membersRes.rowCount || 0,
            violatorCount: violators.length,
            violators: violators.map(v => v.name),
        });

        return { success: true, alreadyRun: false, periodLabel, violators };
    } catch (error: any) {
        await client.query('ROLLBACK');
        return { success: false, error: error.message };
    } finally {
        await client.end();
    }
}

// ── 6. 記錄小隊長批次上繳大會 ─────────────────────────────────────
export async function recordOrgSubmission(
    captainUserId: string,
    amount: number,
    submittedAt: string,  // YYYY-MM-DD
    notes?: string,
) {
    if (amount <= 0) return { success: false, error: '金額必須大於 0' };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(submittedAt)) return { success: false, error: '日期格式錯誤，請使用 YYYY-MM-DD' };

    const client = await connectDb();
    try {
        const captainRes = await client.query<{ LittleTeamLeagelName: string; IsCaptain: boolean }>(
            `SELECT "LittleTeamLeagelName", "IsCaptain" FROM "CharacterStats" WHERE "UserID" = $1`,
            [captainUserId]
        );
        if (!captainRes.rows[0]?.IsCaptain) return { success: false, error: '僅限小隊長使用' };
        const squadName = captainRes.rows[0].LittleTeamLeagelName;

        const insertRes = await client.query<{ id: string }>(
            `INSERT INTO "SquadFineSubmissions" (squad_name, amount, submitted_at, recorded_by, notes)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`,
            [squadName, amount, submittedAt, captainUserId, notes || null]
        );
        await logAdminAction('fine_org_submission', captainUserId, undefined, squadName, { amount, submittedAt, notes });
        return { success: true, id: insertRes.rows[0].id };
    } catch (error: any) {
        return { success: false, error: error.message };
    } finally {
        await client.end();
    }
}

// ── 7. 查詢小隊上繳大會紀錄 ──────────────────────────────────────
export async function getSquadOrgSubmissions(captainUserId: string) {
    const client = await connectDb();
    try {
        const captainRes = await client.query<{ LittleTeamLeagelName: string; IsCaptain: boolean }>(
            `SELECT "LittleTeamLeagelName", "IsCaptain" FROM "CharacterStats" WHERE "UserID" = $1`,
            [captainUserId]
        );
        if (!captainRes.rows[0]?.IsCaptain) return { success: false, error: '僅限小隊長使用' };
        const squadName = captainRes.rows[0].LittleTeamLeagelName;

        const res = await client.query(
            `SELECT id, squad_name, amount, submitted_at::text, recorded_by, notes,
                    to_char(created_at AT TIME ZONE 'Asia/Taipei', 'YYYY-MM-DD') AS created_at
             FROM "SquadFineSubmissions"
             WHERE squad_name = $1
             ORDER BY submitted_at DESC`,
            [squadName]
        );
        return { success: true, records: res.rows };
    } catch (error: any) {
        return { success: false, error: error.message };
    } finally {
        await client.end();
    }
}

// ── 8. 查詢小隊歷史繳款紀錄 ──────────────────────────────────────
export async function getSquadFinePaymentHistory(captainUserId: string) {
    const client = await connectDb();
    try {
        const captainRes = await client.query<{ LittleTeamLeagelName: string; IsCaptain: boolean }>(
            `SELECT "LittleTeamLeagelName", "IsCaptain" FROM "CharacterStats" WHERE "UserID" = $1`,
            [captainUserId]
        );
        if (!captainRes.rows[0]?.IsCaptain) return { success: false, error: '僅限小隊長使用' };

        const squadName = captainRes.rows[0].LittleTeamLeagelName;
        const histRes = await client.query(
            `SELECT id, user_id, user_name, amount, period_label,
                    paid_to_captain_at::text, submitted_to_org_at::text,
                    recorded_by, to_char(created_at AT TIME ZONE 'Asia/Taipei', 'YYYY-MM-DD') AS created_at
             FROM "FinePayments"
             WHERE squad_name = $1
             ORDER BY created_at DESC
             LIMIT 100`,
            [squadName]
        );

        return { success: true, squadName, records: histRes.rows };
    } catch (error: any) {
        return { success: false, error: error.message };
    } finally {
        await client.end();
    }
}
