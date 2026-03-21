import { NextResponse } from 'next/server';
import { rotateVolunteerPassword } from '@/app/actions/admin';

// Called by Vercel Cron every day at 16:00 UTC (= midnight Taiwan time)
// vercel.json: { "path": "/api/cron/rotate-vol-password", "schedule": "0 16 * * *" }
export async function GET(request: Request) {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
        return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
    }
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const res = await rotateVolunteerPassword();
    if (!res.success) {
        return NextResponse.json({ error: res.error }, { status: 500 });
    }
    return NextResponse.json({ ok: true, newPassword: res.newPassword });
}
