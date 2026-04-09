'use server';

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function writeTransactionLog(
    userId: string,
    type: string,
    label: string,
    expDelta: number = 0,
    coinsDelta: number = 0,
    detail?: Record<string, any>
) {
    await supabase.from('TransactionLog').insert({
        user_id: userId,
        type,
        label,
        exp_delta: expDelta,
        coins_delta: coinsDelta,
        detail: detail ?? null,
    });
}

export interface TransactionLogEntry {
    id: string;
    user_id: string;
    type: string;
    label: string;
    exp_delta: number;
    coins_delta: number;
    detail: any;
    created_at: string;
}

export async function getTransactionLogs(userId: string): Promise<TransactionLogEntry[]> {
    const { data } = await supabase
        .from('TransactionLog')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(200);
    return (data ?? []) as TransactionLogEntry[];
}

// 查詢小隊成員的團隊相關異動（金幣捐贈 + 法寶購買）
export async function getSquadTeamLogs(squadName: string): Promise<(TransactionLogEntry & { userName?: string })[]> {
    // 先取小隊成員
    const { data: members } = await supabase
        .from('CharacterStats')
        .select('UserID, Name')
        .eq('LittleTeamLeagelName', squadName);
    if (!members || members.length === 0) return [];

    const userIds = members.map(m => m.UserID);
    const nameMap = new Map(members.map(m => [m.UserID, m.Name]));

    const { data: logs } = await supabase
        .from('TransactionLog')
        .select('*')
        .in('user_id', userIds)
        .in('type', ['coin_transfer', 'artifact_purchase'])
        .order('created_at', { ascending: false })
        .limit(100);

    return ((logs ?? []) as TransactionLogEntry[]).map(l => ({
        ...l,
        userName: nameMap.get(l.user_id) ?? l.user_id,
    }));
}
