'use server';

import { createClient } from '@supabase/supabase-js';
import { PeakTrial, PeakTrialRegistration } from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// ── 查詢活動列表（含報名人數）────────────────────────────
export async function listPeakTrials(filter: {
    battalionName?: string;
    activeOnly?: boolean;
} = {}) {
    const supabase = createClient(supabaseUrl, supabaseKey);
    let query = supabase.from('PeakTrials').select('*').order('date', { ascending: true });
    if (filter.battalionName) query = query.eq('battalion_name', filter.battalionName);
    if (filter.activeOnly) query = query.eq('is_active', true);
    const { data, error } = await query;
    if (error) return { success: false, error: error.message, trials: [] as PeakTrial[] };

    // 批次取得所有報名計數（避免 N+1）
    const { data: regData } = await supabase
        .from('PeakTrialRegistrations')
        .select('trial_id');
    const countMap = new Map<string, number>();
    (regData || []).forEach(r => countMap.set(r.trial_id, (countMap.get(r.trial_id) || 0) + 1));

    const trials = (data || []).map(t => ({
        ...t,
        registration_count: countMap.get(t.id) || 0,
    })) as PeakTrial[];
    return { success: true, trials };
}

// ── 新增 / 更新活動（大隊長 + 管理員）────────────────────
export async function upsertPeakTrial(trial: Partial<PeakTrial> & { title: string; date: string; created_by: string }) {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { id, ...rest } = trial;
    if (id) {
        const { data, error } = await supabase.from('PeakTrials').update(rest).eq('id', id).select().single();
        if (error) return { success: false, error: error.message };
        return { success: true, trial: data as PeakTrial };
    }
    const { data, error } = await supabase.from('PeakTrials').insert(rest).select().single();
    if (error) return { success: false, error: error.message };
    return { success: true, trial: data as PeakTrial };
}

// ── 切換活動啟用狀態 ──────────────────────────────────────
export async function togglePeakTrialActive(id: string, isActive: boolean) {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { error } = await supabase.from('PeakTrials').update({ is_active: isActive }).eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
}

// ── 刪除活動 ──────────────────────────────────────────────
export async function deletePeakTrial(id: string) {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { error } = await supabase.from('PeakTrials').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
}

// ── 報名活動（一般學員）───────────────────────────────────
export async function registerForPeakTrial(
    trialId: string,
    userId: string,
    userName: string,
    squadName?: string,
    battalionName?: string,
) {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 檢查活動是否存在且開放
    const { data: trial } = await supabase.from('PeakTrials').select('id, is_active, max_participants').eq('id', trialId).single();
    if (!trial) return { success: false, error: '找不到此活動' };
    if (!trial.is_active) return { success: false, error: '此活動已關閉報名' };

    // 名額限制檢查
    if (trial.max_participants) {
        const { count } = await supabase.from('PeakTrialRegistrations').select('*', { count: 'exact', head: true }).eq('trial_id', trialId);
        if ((count ?? 0) >= trial.max_participants) return { success: false, error: '名額已滿' };
    }

    const { data, error } = await supabase.from('PeakTrialRegistrations').insert({
        trial_id: trialId,
        user_id: userId,
        user_name: userName,
        squad_name: squadName,
        battalion_name: battalionName,
    }).select().single();

    if (error) {
        if (error.code === '23505') return { success: false, error: '您已報名此活動' };
        return { success: false, error: '報名失敗：' + error.message };
    }
    return { success: true, registration: data as PeakTrialRegistration };
}

// ── 取消報名 ──────────────────────────────────────────────
export async function cancelPeakTrialRegistration(trialId: string, userId: string) {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { error } = await supabase.from('PeakTrialRegistrations').delete().eq('trial_id', trialId).eq('user_id', userId).eq('attended', false);
    if (error) return { success: false, error: error.message };
    return { success: true };
}

// ── 查詢活動報名名單 ──────────────────────────────────────
export async function getPeakTrialRegistrations(trialId: string) {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase.from('PeakTrialRegistrations').select('*').eq('trial_id', trialId).order('registered_at', { ascending: true });
    if (error) return { success: false, error: error.message, registrations: [] as PeakTrialRegistration[] };
    return { success: true, registrations: (data || []) as PeakTrialRegistration[] };
}

// ── 查詢我的報名記錄 ──────────────────────────────────────
export async function getMyPeakTrialRegistrations(userId: string) {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase.from('PeakTrialRegistrations').select('*').eq('user_id', userId);
    if (error) return { success: false, error: error.message, registrations: [] as PeakTrialRegistration[] };
    return { success: true, registrations: (data || []) as PeakTrialRegistration[] };
}

// ── 核銷（標記出席）──────────────────────────────────────
export async function markPeakTrialAttendance(registrationId: string) {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: reg } = await supabase
        .from('PeakTrialRegistrations')
        .select('id, attended, user_name')
        .eq('id', registrationId)
        .single();
    if (!reg) return { success: false, error: '找不到此報名記錄' };
    if (reg.attended) return { success: true, alreadyAttended: true, userName: reg.user_name as string };
    const { error } = await supabase.from('PeakTrialRegistrations').update({
        attended: true,
        attended_at: new Date().toISOString(),
    }).eq('id', registrationId);
    if (error) return { success: false, error: error.message };
    return { success: true, alreadyAttended: false, userName: reg.user_name as string };
}

// ── 依姓名 + 大隊核銷（大隊長手動核銷用）────────────────
export async function markPeakTrialAttendanceByName(trialId: string, userName: string) {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: reg } = await supabase.from('PeakTrialRegistrations').select('id').eq('trial_id', trialId).eq('user_name', userName).single();
    if (!reg) return { success: false, error: `找不到「${userName}」的報名記錄` };
    const { error } = await supabase.from('PeakTrialRegistrations').update({
        attended: true,
        attended_at: new Date().toISOString(),
    }).eq('id', reg.id);
    if (error) return { success: false, error: error.message };
    return { success: true };
}
