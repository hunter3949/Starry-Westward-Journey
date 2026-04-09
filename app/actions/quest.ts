'use server';

import { connectDb } from '@/lib/db';
import { getLogicalDateStr } from '@/lib/utils/time';
import { ROLE_CURE_MAP, ROLE_GROWTH_RATES, calculateLevelFromExp, setLevelExpCache } from '@/lib/constants';
import { checkAndUnlockAchievements } from './achievements';
import type { BonusQuestRule } from '@/types';

const DEFAULT_BONUS_RULES: BonusQuestRule[] = [
    { id: 'w1', label: '小天使通話', reward: 500, limit: 1, keywords: ['小天使通話', '與家人互動', '親證圓夢'], bonusType: 'energy_dice', bonusAmount: 1, active: true },
    { id: 'w2', label: '參加心成活動', reward: 500, limit: 2, keywords: ['心成', '同學會', '定聚'], bonusType: 'energy_dice', bonusAmount: 2, active: true },
    { id: 'w4', label: '傳愛分數', reward: 1000, limit: 99, keywords: ['傳愛'], bonusType: 'energy_dice', bonusAmount: 1, active: true },
    { id: 'b_topic', label: '大會主題活動', reward: 0, limit: 99, keywords: ['主題親證', '會長交接', '大會'], bonusType: 'golden_dice', bonusAmount: 1, active: true },
];

// We import ROLE_CURE_MAP directly from constants now
export async function processCheckInTransaction(
    userId: string,
    questId: string,
    questTitle: string,
    questReward: number,
    questDice: number = 0,
    questCoins?: number
) {
    // Server-side: 載入等級門檻到快取（每次 action 呼叫都重新載入，確保最新）
    try {
        const { createClient } = await import('@supabase/supabase-js');
        const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        const { data: lvCfg } = await sb.from('LevelConfig').select('level, exp_required').order('level');
        if (lvCfg && lvCfg.length > 0) setLevelExpCache(lvCfg);
    } catch { /* fallback to default formula */ }

    const client = await connectDb();

    try {
        await client.query('BEGIN');

        // 1. Lock the user's CharacterStats row (排他鎖)
        const statsRes = await client.query(
            `SELECT * FROM "CharacterStats" WHERE "UserID" = $1 FOR UPDATE`,
            [userId]
        );

        if (statsRes.rowCount === 0) {
            throw new Error(`查無此用戶: ${userId}`);
        }

        const userData = statsRes.rows[0];
        const logicalTodayStr = getLogicalDateStr();

        // Helper: logical date expression in SQL (Taiwan timezone, before-noon counts as previous day)
        // Matches the client-side getLogicalDateStr() logic.
        const logicalDateExpr = `CASE
            WHEN EXTRACT(HOUR FROM "Timestamp" AT TIME ZONE 'Asia/Taipei') >= 12
            THEN (date("Timestamp" AT TIME ZONE 'Asia/Taipei'))::text
            ELSE (date("Timestamp" AT TIME ZONE 'Asia/Taipei') - INTERVAL '1 day')::text
          END`;

        // 2. Fetch daily logs to check if rewards are capped (only for 'q' quests)
        // First 3 q-quests give full rewards; 4th+ still record (for curse-breaking) but give 0 rewards.
        let rewardCapped = false;
        if (questId.startsWith('q')) {
            const logsRes = await client.query(
                `SELECT COUNT(*) as count FROM "DailyLogs"
                 WHERE "UserID" = $1 AND "QuestID" LIKE 'q%' AND ${logicalDateExpr} = $2`,
                [userId, logicalTodayStr]
            );
            const dailyCount = parseInt(logsRes.rows[0].count, 10);
            rewardCapped = dailyCount >= 3;
        }

        // 3. Prevent duplicate check-in for the same quest today/week
        if (questId.startsWith('q')) {
            // q1 與 q1_dawn 互斥：同一天只能有其一
            const q1Variants = (questId === 'q1' || questId === 'q1_dawn')
                ? ['q1', 'q1_dawn']
                : [questId];

            const placeholders = q1Variants.map((_, i) => `$${i + 2}`).join(', ');
            const dupCheck = await client.query(
                `SELECT COUNT(*) as count FROM "DailyLogs"
                 WHERE "UserID" = $1 AND "QuestID" IN (${placeholders}) AND ${logicalDateExpr} = $${q1Variants.length + 2}`,
                [userId, ...q1Variants, logicalTodayStr]
            );
            if (parseInt(dupCheck.rows[0].count, 10) > 0) {
                throw new Error(
                    questId === 'q1_dawn'
                        ? "今日已完成打拳，無法重複記錄。"
                        : "此定課今日已完成。"
                );
            }
        }

        // 4. Determine bonus properties based on character role
        const roleInfo = ROLE_CURE_MAP[userData.Role];
        const isCure = roleInfo?.cureTaskId === questId;
        const finalQuestTitle = isCure ? `${questTitle} (天命對治)` : questTitle;

        // If reward is capped, this is a curse-breaking-only check-in — zero out all rewards
        const baseReward = rewardCapped ? 0 : questReward;
        let expMultiplier = 1;

        const myInventory = typeof userData.Inventory === 'string' ? JSON.parse(userData.Inventory) : (userData.Inventory || []);
        let teamInventory: string[] = [];

        if (userData.LittleTeamLeagelName) {
            const tsRes = await client.query(`SELECT inventory FROM "TeamSettings" WHERE "LittleTeamLeagelName" = $1`, [userData.LittleTeamLeagelName]);
            if (tsRes.rowCount && tsRes.rowCount > 0) {
                const tsData = tsRes.rows[0];
                teamInventory = typeof tsData.inventory === 'string' ? JSON.parse(tsData.inventory) : (tsData.inventory || []);
            }
        }

        // ── 法寶加成（從 DB 讀取觸發條件 + 倍率）──
        let expBonusFlat = 0;
        try {
            const artifactRes = await client.query(`SELECT * FROM "ArtifactConfig" WHERE "is_active" = true`);
            const allArtifacts = artifactRes.rows || [];

            const matchesQuest = (appliesTo: string[] | null, qid: string): boolean => {
                if (!appliesTo || appliesTo.length === 0) return false;
                for (const rule of appliesTo) {
                    if (rule === 'all') return true;
                    if (rule.startsWith('prefix:') && qid.startsWith(rule.slice(7))) return true;
                    if (rule === qid) return true;
                }
                return false;
            };

            for (const art of allArtifacts) {
                const artId = art.id;
                const appliesTo: string[] = Array.isArray(art.applies_to) ? art.applies_to : (typeof art.applies_to === 'string' ? JSON.parse(art.applies_to) : []);
                const isOwned = art.is_team_binding ? teamInventory.includes(artId) : myInventory.includes(artId);
                if (!isOwned) continue;

                // 互斥檢查（個人法寶）
                if (!art.is_team_binding && art.exclusive_with && myInventory.includes(art.exclusive_with)) continue;

                if (!matchesQuest(appliesTo, questId)) continue;

                // 經驗倍率
                if (art.exp_multiplier_personal && !art.is_team_binding) expMultiplier *= Number(art.exp_multiplier_personal);
                if (art.exp_multiplier_team && art.is_team_binding) expMultiplier *= Number(art.exp_multiplier_team);
                // 經驗加值
                if (art.exp_bonus_personal && !art.is_team_binding) expBonusFlat += Number(art.exp_bonus_personal);
                if (art.exp_bonus_team && art.is_team_binding) expBonusFlat += Number(art.exp_bonus_team);
            }
        } catch { /* DB 不存在時 fallback — 不加成 */ }

        let finalQuestReward = Math.ceil(baseReward * expMultiplier) + expBonusFlat;

        const currentExp = parseInt(String(userData.Exp), 10) || 0;
        const currentLevel = parseInt(String(userData.Level), 10) || 1;
        const currentCoins = parseInt(String(userData.Coins), 10) || 0;
        const currentEnergyDice = parseInt(String(userData.EnergyDice), 10) || 0;

        const newExp = currentExp + finalQuestReward;
        const newLevel = calculateLevelFromExp(newExp);
        const levelDelta = newLevel - currentLevel;

        let gainedCoins = questCoins !== undefined ? questCoins : Math.floor(baseReward * 0.1);

        const newCoins = currentCoins + gainedCoins;

        let bonusDice = 0;
        let goldenDiceGain = 0;

        // --- 額外骰子：讀取 BonusQuestConfig，fallback 到預設規則 ---
        {
            let bonusRules = DEFAULT_BONUS_RULES;
            try {
                const bcRes = await client.query(
                    `SELECT "Value" FROM "SystemSettings" WHERE "SettingName" = 'BonusQuestConfig' LIMIT 1`
                );
                if (bcRes.rows[0]?.Value) {
                    bonusRules = JSON.parse(bcRes.rows[0].Value);
                }
            } catch { /* fallback */ }
            for (const rule of bonusRules) {
                if (!rule.active) continue;
                if (!rule.keywords.some(kw => questTitle.includes(kw))) continue;
                if (rule.bonusType === 'energy_dice') bonusDice += rule.bonusAmount;
                else if (rule.bonusType === 'golden_dice') goldenDiceGain += rule.bonusAmount;
            }
        }

        const newEnergyDice = currentEnergyDice + questDice + bonusDice;

        let updateQuery = `
      UPDATE "CharacterStats" 
      SET 
        "Exp" = $1, 
        "Level" = $2, 
        "Coins" = $3,
        "EnergyDice" = $4, 
        "LastCheckIn" = $5
    `;
        const updateParams: any[] = [newExp, newLevel, newCoins, newEnergyDice, logicalTodayStr, userId];

        if (goldenDiceGain > 0) {
            updateQuery += `, "GoldenDice" = COALESCE("GoldenDice", 0) + ${goldenDiceGain}`;
        }

        // Apply Level Up Base Multipliers
        const growthRates = ROLE_GROWTH_RATES[userData.Role] || {};
        for (const [stat, rate] of Object.entries(growthRates)) {
            if (rate && rate > 0) {
                // Determine the total gain this level up cycle gives
                const totalGain = rate * levelDelta;
                if (totalGain > 0) {
                    updateQuery += `, "${stat}" = "${stat}" + ${totalGain}`;
                }
            }
        }

        // Apply Daily Fix Cure Bonus (+2) — skipped when reward is capped
        if (isCure && roleInfo && !rewardCapped) {
            const statKey = roleInfo.bonusStat;
            updateQuery += `, "${statKey}" = "${statKey}" + 2`;
        }

        updateQuery += ` WHERE "UserID" = $6 RETURNING *`;

        const updatedStatsRes = await client.query(updateQuery, updateParams);

        // 6. Insert DailyLog
        await client.query(
            `INSERT INTO "DailyLogs" ("Timestamp", "UserID", "QuestID", "QuestTitle", "RewardPoints")
       VALUES ($1, $2, $3, $4, $5)`,
            [new Date().toISOString(), userId, questId, finalQuestTitle, finalQuestReward]
        );

        // Commit transaction
        await client.query('COMMIT');

        // Write transaction log
        const { writeTransactionLog } = await import('./txlog');
        await writeTransactionLog(userId, 'quest_checkin', finalQuestTitle, finalQuestReward, gainedCoins, { questId });

        // Check achievements after commit (uses its own pg client, does not affect this transaction)
        const newAchievements = await checkAndUnlockAchievements(userId, questId);

        return { success: true, rewardCapped, user: updatedStatsRes.rows[0], newAchievements };
    } catch (error: any) {
        await client.query('ROLLBACK');
        return { success: false, error: error.message };
    } finally {
        await client.end();
    }
}

// ── 復原打卡（呼叫 process_undo RPC）────────────────────────────────────────

export async function processUndoTransaction(
    userId: string,
    questId: string,
    questReward: number,
    questDice: number = 0
) {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const logicalToday = getLogicalDateStr();

    const { data, error } = await supabase.rpc('process_undo', {
        p_user_id:       userId,
        p_quest_id:      questId,
        p_quest_reward:  questReward,
        p_quest_dice:    questDice,
        p_logical_today: logicalToday,
    });

    if (error) {
        return { success: false, error: error.message };
    }

    const result = data as {
        success: boolean;
        error?:  string;
        user?:   any;
    };

    if (!result.success) {
        return { success: false, error: result.error };
    }

    return { success: true, user: result.user };
}
