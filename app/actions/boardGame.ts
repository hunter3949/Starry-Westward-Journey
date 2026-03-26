'use server';

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

/**
 * 換匯
 * 買匯 (blessing_to_cash): 1 福報 = buyRate 現金
 * 賣匯 (cash_to_blessing):  sellRate 現金 = 1 福報
 */
export async function exchangeCurrency(
    userId: string,
    direction: 'blessing_to_cash' | 'cash_to_blessing',
    amount: number,           // spend amount
    currentCash: number,
    currentBlessing: number,
    buyRate: number,          // 1 福報 = buyRate 現金
    sellRate: number          // sellRate 現金 = 1 福報
): Promise<{ success: boolean; newCash?: number; newBlessing?: number; error?: string }> {
    if (amount <= 0 || !Number.isInteger(amount)) {
        return { success: false, error: '請輸入正整數金額' };
    }

    let newCash: number;
    let newBlessing: number;

    if (direction === 'blessing_to_cash') {
        // spend 福報, gain 現金
        if (amount > currentBlessing) return { success: false, error: '福報餘額不足' };
        newBlessing = currentBlessing - amount;
        newCash = currentCash + amount * buyRate;
    } else {
        // spend 現金, gain 福報 — sellRate 現金 = 1 福報
        if (amount > currentCash) return { success: false, error: '現金餘額不足' };
        const blessingGain = Math.floor(amount / sellRate);
        if (blessingGain < 1) return { success: false, error: `至少需要 ${sellRate} 現金才能兌換 1 福報` };
        newCash = currentCash - amount;
        newBlessing = currentBlessing + blessingGain;
    }

    const { error } = await supabase
        .from('BoardGameStats')
        .upsert({ user_id: userId, cash: newCash, blessing: newBlessing, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    if (error) return { success: false, error: error.message };
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
    return { success: true, newCash, newBlessing };
}
