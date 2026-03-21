'use server';

import { createClient } from '@supabase/supabase-js';
import { type Course } from '@/types';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── 課程 CRUD ────────────────────────────────────────────────────────────────

export async function listCourses(): Promise<Course[]> {
    const { data, error } = await supabase
        .from('Courses')
        .select('*')
        .order('sort_order', { ascending: true });
    if (error || !data) return [];
    return data as Course[];
}

export async function upsertCourse(
    course: Omit<Course, 'created_at'>
): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
        .from('Courses')
        .upsert(course, { onConflict: 'id' });
    if (error) return { success: false, error: error.message };
    return { success: true };
}

export async function deleteCourse(id: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase.from('Courses').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
}

// ── 報名 ──────────────────────────────────────────────────────────────────────

export async function registerForCourse(
    userId: string,
    courseKey: string
): Promise<{ success: true; registrationId: string; userName: string } | { success: false; error: string }> {
    if (!userId) return { success: false, error: '請先登入' };

    const { data: users, error: fetchErr } = await supabase
        .from('CharacterStats')
        .select('UserID, Name')
        .eq('UserID', userId);

    if (fetchErr) return { success: false, error: '查詢失敗，請稍後再試' };
    if (!users || users.length === 0) {
        return { success: false, error: '找不到學員資料' };
    }

    const user = users[0];

    const { data: existing } = await supabase
        .from('CourseRegistrations')
        .select('id')
        .eq('user_id', user.UserID)
        .eq('course_key', courseKey)
        .single();

    if (existing) {
        return { success: true, registrationId: existing.id, userName: user.Name };
    }

    const { data: newReg, error: insertErr } = await supabase
        .from('CourseRegistrations')
        .insert({ user_id: user.UserID, course_key: courseKey })
        .select('id')
        .single();

    if (insertErr || !newReg) {
        return { success: false, error: '報名失敗，請稍後再試' };
    }

    return { success: true, registrationId: newReg.id, userName: user.Name };
}

// ── 報名（舊頁面：姓名 + 手機末三碼識別）────────────────────────────────────
export async function registerForCourseByName(
    name: string,
    phone3: string,
    courseKey: string
): Promise<{ success: true; registrationId: string; userName: string } | { success: false; error: string }> {
    const trimmedName = name.trim();
    const trimmedPhone = phone3.trim();
    if (!trimmedName || trimmedPhone.length !== 3 || !/^\d{3}$/.test(trimmedPhone)) {
        return { success: false, error: '請填寫正確的姓名與手機末三碼（3位數字）' };
    }
    const { data: users, error: fetchErr } = await supabase
        .from('CharacterStats')
        .select('UserID, Name')
        .eq('Name', trimmedName)
        .ilike('UserID', `%${trimmedPhone}`);
    if (fetchErr) return { success: false, error: '查詢失敗，請稍後再試' };
    if (!users || users.length === 0) {
        return { success: false, error: '找不到符合的學員資料，請確認姓名與手機末三碼是否正確' };
    }
    const user = users[0];
    const { data: existing } = await supabase
        .from('CourseRegistrations').select('id').eq('user_id', user.UserID).eq('course_key', courseKey).single();
    if (existing) return { success: true, registrationId: existing.id, userName: user.Name };
    const { data: newReg, error: insertErr } = await supabase
        .from('CourseRegistrations').insert({ user_id: user.UserID, course_key: courseKey }).select('id').single();
    if (insertErr || !newReg) return { success: false, error: '報名失敗，請稍後再試' };
    return { success: true, registrationId: newReg.id, userName: user.Name };
}

// ── 報到 ──────────────────────────────────────────────────────────────────────

export async function markAttendance(
    registrationId: string,
    note: string = 'admin'
): Promise<
    | { success: true; userName: string; courseKey: string; alreadyCheckedIn: boolean }
    | { success: false; error: string }
> {
    const { data: reg, error: regErr } = await supabase
        .from('CourseRegistrations')
        .select('user_id, course_key')
        .eq('id', registrationId)
        .single();

    if (regErr || !reg) {
        return { success: false, error: '無效的 QR 碼，找不到對應報名記錄' };
    }

    const { data: user } = await supabase
        .from('CharacterStats')
        .select('Name')
        .eq('UserID', reg.user_id)
        .single();

    const userName = user?.Name ?? reg.user_id;
    const courseKey = reg.course_key as string;

    const { data: existing } = await supabase
        .from('CourseAttendance')
        .select('id')
        .eq('user_id', reg.user_id)
        .eq('course_key', courseKey)
        .single();

    if (existing) {
        return { success: true, userName, courseKey, alreadyCheckedIn: true };
    }

    const { error: attendErr } = await supabase
        .from('CourseAttendance')
        .insert({ user_id: reg.user_id, course_key: courseKey, checked_in_by: note });

    if (attendErr) {
        return { success: false, error: '報到寫入失敗，請重試' };
    }

    return { success: true, userName, courseKey, alreadyCheckedIn: false };
}

// ── 報名名單 ──────────────────────────────────────────────────────────────────

export async function getCourseRegistrations(
    courseKey: string
): Promise<{
    userId: string;
    userName: string;
    teamName: string;
    squadName: string;
    registeredAt: string;
    attended: boolean;
    attendedAt: string | null;
    checkedInBy: string | null;
}[]> {
    const { data: regs, error } = await supabase
        .from('CourseRegistrations')
        .select('id, user_id, registered_at')
        .eq('course_key', courseKey)
        .order('registered_at', { ascending: true });

    if (error || !regs) return [];

    const userIds = regs.map(r => r.user_id);
    if (userIds.length === 0) return [];

    const { data: users } = await supabase
        .from('CharacterStats')
        .select('UserID, Name, TeamName, SquadName')
        .in('UserID', userIds);

    const { data: attended } = await supabase
        .from('CourseAttendance')
        .select('user_id, attended_at, checked_in_by')
        .eq('course_key', courseKey)
        .in('user_id', userIds);

    const userMap = new Map((users ?? []).map(u => [u.UserID, u]));
    const attendanceMap = new Map((attended ?? []).map(a => [a.user_id, a]));

    return regs.map(r => {
        const u = userMap.get(r.user_id);
        const att = attendanceMap.get(r.user_id);
        return {
            userId: r.user_id,
            userName: u?.Name ?? r.user_id,
            teamName: u?.TeamName ?? '—',
            squadName: u?.SquadName ?? '—',
            registeredAt: r.registered_at,
            attended: !!att,
            attendedAt: att?.attended_at ?? null,
            checkedInBy: att?.checked_in_by ?? null,
        };
    });
}

// ── 報到名單 ──────────────────────────────────────────────────────────────────

export async function getCourseAttendanceList(
    courseKey: string
): Promise<{ userId: string; userName: string; attendedAt: string }[]> {
    const { data, error } = await supabase
        .from('CourseAttendance')
        .select('user_id, attended_at')
        .eq('course_key', courseKey)
        .order('attended_at', { ascending: false });

    if (error || !data) return [];

    const userIds = data.map(r => r.user_id);
    if (userIds.length === 0) return [];

    const { data: users } = await supabase
        .from('CharacterStats')
        .select('UserID, Name')
        .in('UserID', userIds);

    const nameMap = new Map((users ?? []).map(u => [u.UserID, u.Name]));

    return data.map(r => ({
        userId: r.user_id,
        userName: nameMap.get(r.user_id) ?? r.user_id,
        attendedAt: r.attended_at,
    }));
}
