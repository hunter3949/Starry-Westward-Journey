'use server';

import { connectDb } from '@/lib/db';
import { getLogicalDateStr } from '@/lib/utils/time';
import { ROLE_CURE_MAP, ROLE_GROWTH_RATES, calculateLevelFromExp, setLevelExpCache } from '@/lib/constants';
import { checkAndUnlockAchievements } from './achievements';
import { writeTransactionLog } from './txlog';
import { createClient } from '@supabase/supabase-js';
import type { BonusQuestRule } from '@/types';

const _sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
let _levelCacheLoaded = false;

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
    // Server-side: 載入等級門檻到快取（只載入一次，後續重用）
    if (!_levelCacheLoaded) {
        try {
            const { data: lvCfg } = await _sb.from('LevelConfig').select('level, exp_required').order('level');
            if (lvCfg && lvCfg.length > 0) { setLevelExpCache(lvCfg); _levelCacheLoaded = true; }
        } catch { /* fallback to default formula */ }
    }

    const client = await connectDb();

    try {
        await client.query('BEGIN');

        const logicalTodayStr = getLogicalDateStr();
        const logicalDateExpr = `CASE
            WHEN EXTRACT(HOUR FROM "Timestamp" AT TIME ZONE 'Asia/Taipei') >= 12
            THEN (date("Timestamp" AT TIME ZONE 'Asia/Taipei'))::text
            ELSE (date("Timestamp" AT TIME ZONE 'Asia/Taipei') - INTERVAL '1 day')::text
          END`;

        // ── 合併查詢：一次取得 user + team + artifacts + 今日打卡數 + 重複檢查 ──
        const q1Variants = (questId === 'q1' || questId === 'q1_dawn') ? ['q1', 'q1_dawn'] : [questId];
        const isQQuest = questId.startsWith('q');

        const [statsRes, countRes, dupRes, artifactRes, bonusCfgRes] = await Promise.all([
            // 1. Lock user + join team inventory
            client.query(
                `SELECT cs.*, ts.inventory AS team_inv
                 FROM "CharacterStats" cs
                 LEFT JOIN "TeamSettings" ts ON ts."LittleTeamLeagelName" = cs."LittleTeamLeagelName"
                 WHERE cs."UserID" = $1 FOR UPDATE OF cs`,
                [userId]
            ),
            // 2. 今日 q 定課數量（日上限）
            isQQuest ? client.query(
                `SELECT COUNT(*) as count FROM "DailyLogs"
                 WHERE "UserID" = $1 AND "QuestID" LIKE 'q%' AND ${logicalDateExpr} = $2`,
                [userId, logicalTodayStr]
            ) : Promise.resolve({ rows: [{ count: '0' }] }),
            // 3. 重複打卡檢查
            isQQuest ? client.query(
                `SELECT COUNT(*) as count FROM "DailyLogs"
                 WHERE "UserID" = $1 AND "QuestID" = ANY($2) AND ${logicalDateExpr} = $3`,
                [userId, q1Variants, logicalTodayStr]
            ) : Promise.resolve({ rows: [{ count: '0' }] }),
            // 4. 法寶設定
            client.query(`SELECT * FROM "ArtifactConfig" WHERE "is_active" = true`).catch(() => ({ rows: [] })),
            // 5. BonusQuestConfig
            client.query(`SELECT "Value" FROM "SystemSettings" WHERE "SettingName" = 'BonusQuestConfig' LIMIT 1`).catch(() => ({ rows: [] })),
        ]);

        if (statsRes.rowCount === 0) throw new Error(`查無此用戶: ${userId}`);

        const userData = statsRes.rows[0];

        // 日上限檢查
        let rewardCapped = false;
        if (isQQuest) {
            rewardCapped = parseInt(countRes.rows[0].count, 10) >= 3;
        }

        // 重複檢查
        if (isQQuest && parseInt(dupRes.rows[0].count, 10) > 0) {
            throw new Error(questId === 'q1_dawn' ? "今日已完成打拳，無法重複記錄。" : "此定課今日已完成。");
        }

        // 4. Determine bonus properties based on character role
        const roleInfo = ROLE_CURE_MAP[userData.Role];
        const isCure = roleInfo?.cureTaskId === questId;
        const finalQuestTitle = isCure ? `${questTitle} (天命對治)` : questTitle;

        const baseReward = rewardCapped ? 0 : questReward;
        let expMultiplier = 1;

        const myInventory = typeof userData.Inventory === 'string' ? JSON.parse(userData.Inventory) : (userData.Inventory || []);
        const teamInvRaw = userData.team_inv;
        const teamInventory: string[] = teamInvRaw ? (typeof teamInvRaw === 'string' ? JSON.parse(teamInvRaw) : (teamInvRaw || [])) : [];

        // ── 法寶加成 ──
        let expBonusFlat = 0;
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
            if (!art.is_team_binding && art.exclusive_with && myInventory.includes(art.exclusive_with)) continue;
            if (!matchesQuest(appliesTo, questId)) continue;

            if (art.exp_multiplier_personal && !art.is_team_binding) expMultiplier *= Number(art.exp_multiplier_personal);
            if (art.exp_multiplier_team && art.is_team_binding) expMultiplier *= Number(art.exp_multiplier_team);
            if (art.exp_bonus_personal && !art.is_team_binding) expBonusFlat += Number(art.exp_bonus_personal);
            if (art.exp_bonus_team && art.is_team_binding) expBonusFlat += Number(art.exp_bonus_team);
        }

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

        // --- 額外骰子：使用預先載入的 BonusQuestConfig ---
        {
            let bonusRules = DEFAULT_BONUS_RULES;
            try {
                if (bonusCfgRes.rows[0]?.Value) {
                    bonusRules = JSON.parse(bonusCfgRes.rows[0].Value);
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

        // 合併屬性加值（避免同一欄位重複 SET）
        const statGains: Record<string, number> = {};

        // Apply Level Up Base Multipliers
        const growthRates = ROLE_GROWTH_RATES[userData.Role] || {};
        for (const [stat, rate] of Object.entries(growthRates)) {
            if (rate && rate > 0) {
                const totalGain = rate * levelDelta;
                if (totalGain > 0) {
                    statGains[stat] = (statGains[stat] || 0) + totalGain;
                }
            }
        }

        // Apply Daily Fix Cure Bonus (+2) — skipped when reward is capped
        if (isCure && roleInfo && !rewardCapped) {
            const statKey = roleInfo.bonusStat;
            statGains[statKey] = (statGains[statKey] || 0) + 2;
        }

        // 一次寫入所有屬性變動
        for (const [stat, gain] of Object.entries(statGains)) {
            updateQuery += `, "${stat}" = "${stat}" + ${gain}`;
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
        writeTransactionLog(userId, 'quest_checkin', finalQuestTitle, finalQuestReward, gainedCoins, { questId });

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
