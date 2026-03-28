'use server';

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function logTransaction(
    userId: string,
    type: string,
    cashDelta: number,
    blessingDelta: number,
    cashAfter: number,
    blessingAfter: number,
    note: string
) {
    await supabase.from('BoardGameTransactions').insert({
        user_id: userId,
        type,
        cash_delta: cashDelta,
        blessing_delta: blessingDelta,
        cash_after: cashAfter,
        blessing_after: blessingAfter,
        note,
    });
}

export async function getBoardGameStats(userId: string): Promise<{ cash: number; blessing: number }> {
    const { data, error } = await supabase
        .from('BoardGameStats')
        .select('cash, blessing')
        .eq('user_id', userId)
        .single();
    if (error && error.code === 'PGRST116') return { cash: 0, blessing: 0 };
    if (error) throw new Error(error.message);
    return { cash: data.cash, blessing: data.blessing };
}

export interface BoardGameTransaction {
    id: string;
    type: string;
    cash_delta: number;
    blessing_delta: number;
    cash_after: number;
    blessing_after: number;
    note: string;
    created_at: string;
}

export async function getBoardGameTransactions(userId: string, limit = 30): Promise<BoardGameTransaction[]> {
    const { data } = await supabase
        .from('BoardGameTransactions')
        .select('id, type, cash_delta, blessing_delta, cash_after, blessing_after, note, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
    return data ?? [];
}

/**
 * 換匯
 * 買匯 (blessing_to_cash): 1 福報 = buyRate 現金
 * 賣匯 (cash_to_blessing):  sellRate 現金 = 1 福報
 */
export async function exchangeCurrency(
    userId: string,
    direction: 'blessing_to_cash' | 'cash_to_blessing',
    amount: number,
    currentCash: number,
    currentBlessing: number,
    buyRate: number,
    sellRate: number
): Promise<{ success: boolean; newCash?: number; newBlessing?: number; error?: string }> {
    if (amount <= 0 || !Number.isInteger(amount)) {
        return { success: false, error: '請輸入正整數金額' };
    }

    let newCash: number;
    let newBlessing: number;
    let type: string;
    let note: string;

    if (direction === 'blessing_to_cash') {
        if (amount > currentBlessing) return { success: false, error: '福報餘額不足' };
        newBlessing = currentBlessing - amount;
        newCash = currentCash + amount * buyRate;
        type = 'buy_exchange';
        note = `買匯：-${amount} 福報 → +${amount * buyRate} 現金（匯率 1:${buyRate}）`;
    } else {
        if (amount > currentCash) return { success: false, error: '現金餘額不足' };
        const blessingGain = Math.floor(amount / sellRate);
        if (blessingGain < 1) return { success: false, error: `至少需要 ${sellRate} 現金才能兌換 1 福報` };
        newCash = currentCash - amount;
        newBlessing = currentBlessing + blessingGain;
        type = 'sell_exchange';
        note = `賣匯：-${amount} 現金 → +${blessingGain} 福報（匯率 ${sellRate}:1）`;
    }

    const { error } = await supabase
        .from('BoardGameStats')
        .upsert({ user_id: userId, cash: newCash, blessing: newBlessing, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    if (error) return { success: false, error: error.message };

    await logTransaction(userId, type,
        newCash - currentCash,
        newBlessing - currentBlessing,
        newCash, newBlessing, note
    );
    return { success: true, newCash, newBlessing };
}

/**
 * 人生歸零：現金 × cashMul，福報 × blessingMul
 */
export async function performLifeReset(
    userId: string,
    currentCash: number,
    currentBlessing: number,
    cashMultiplier: number,
    blessingMultiplier: number
): Promise<{ success: boolean; newCash?: number; newBlessing?: number; error?: string }> {
    const newCash = Math.round(currentCash * cashMultiplier);
    const newBlessing = Math.round(currentBlessing * blessingMultiplier);

    const { error } = await supabase
        .from('BoardGameStats')
        .upsert({ user_id: userId, cash: newCash, blessing: newBlessing, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    if (error) return { success: false, error: error.message };

    await logTransaction(userId, 'life_reset',
        newCash - currentCash,
        newBlessing - currentBlessing,
        newCash, newBlessing,
        `人生歸零：現金 ×${cashMultiplier}，福報 ×${blessingMultiplier}`
    );
    return { success: true, newCash, newBlessing };
}
