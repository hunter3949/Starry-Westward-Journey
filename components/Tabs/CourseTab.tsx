'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import QRCode from 'react-qr-code';
import { registerForCourse, getCourseAttendanceList } from '@/app/actions/course';
import { type Course } from '@/types';
import { ChevronLeft, MapPin, Clock, CalendarDays, QrCode, UserCheck } from 'lucide-react';

const Scanner = dynamic(() => import('@/app/class/checkin/Scanner'), { ssr: false });

type RegResult = { registrationId: string; userName: string };
type StudentView = 'select' | 'register' | 'qr';
type TabView = 'student' | 'volunteer_login' | 'volunteer_scanner';

interface CourseTabProps {
    courses: Course[];
    volunteerPassword: string;
    userId: string;
    userName: string;
}

export default function CourseTab({ courses, volunteerPassword, userId, userName }: CourseTabProps) {
    const [tabView, setTabView] = useState<TabView>('student');
    const [studentView, setStudentView] = useState<StudentView>('select');
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [regResults, setRegResults] = useState<Record<string, RegResult | null>>({});
    const [attendedCourses, setAttendedCourses] = useState<Set<string> | null>(null);

    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState('');

    // 載入出席紀錄
    useEffect(() => {
        if (!userId) return;
        (async () => {
            try {
                const { getUserAttendance } = await import('@/app/actions/course');
                const keys = await getUserAttendance(userId);
                setAttendedCourses(new Set(keys));
            } catch { /* ignore */ }
        })();
    }, [userId]);

    const [volPassword, setVolPassword] = useState('');
    const [volAuthError, setVolAuthError] = useState('');
    const [volCourseId, setVolCourseId] = useState<string>('');
    const [volEnteredPassword, setVolEnteredPassword] = useState(''); // 記錄登入時的密碼
    const [attendanceList, setAttendanceList] = useState<{ userId: string; userName: string; attendedAt: string }[]>([]);

    const activeCourses = courses.filter(c => c.is_active);

    // Set default volunteer course when courses load
    useEffect(() => {
        if (activeCourses.length > 0 && !volCourseId) {
            setVolCourseId(activeCourses[0].id);
        }
    }, [activeCourses, volCourseId]);

    // Load from localStorage on mount
    useEffect(() => {
        const loaded: Record<string, RegResult | null> = {};
        for (const course of activeCourses) {
            try {
                const raw = localStorage.getItem(`course_${course.id}_reg_${userId}`);
                if (raw) loaded[course.id] = JSON.parse(raw);
            } catch { /* ignore */ }
        }
        setRegResults(loaded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [courses]);

    const handleSelectCourse = (course: Course) => {
        setSelectedCourse(course);
        setFormError('');
        if (regResults[course.id]) {
            setStudentView('qr');
        } else {
            setStudentView('register');
        }
    };

    const handleRegister = async () => {
        if (!selectedCourse) return;
        setSubmitting(true);
        setFormError('');
        const res = await registerForCourse(userId, selectedCourse.id);
        setSubmitting(false);
        if (!res.success) {
            setFormError(res.error);
            return;
        }
        const result: RegResult = { registrationId: res.registrationId, userName: res.userName };
        setRegResults(prev => ({ ...prev, [selectedCourse.id]: result }));
        try { localStorage.setItem(`course_${selectedCourse.id}_reg_${userId}`, JSON.stringify(result)); } catch { /* ignore */ }
        setStudentView('qr');
    };

    // 密碼變更時自動踢出志工
    useEffect(() => {
        if (tabView === 'volunteer_scanner' && volEnteredPassword && volunteerPassword && volEnteredPassword !== volunteerPassword) {
            setTabView('volunteer_login');
            setVolPassword('');
            setVolEnteredPassword('');
            setVolAuthError('驗證碼已更新，請重新輸入新密碼');
        }
    }, [volunteerPassword, tabView, volEnteredPassword]);

    const handleVolLogin = (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!volunteerPassword) {
            setVolAuthError('管理員尚未設定志工密碼，請聯繫工作人員');
            return;
        }
        if (volPassword !== volunteerPassword) {
            setVolAuthError('密碼錯誤');
            return;
        }
        setVolAuthError('');
        setVolEnteredPassword(volPassword);
        loadAttendance(volCourseId);
        setTabView('volunteer_scanner');
    };

    const loadAttendance = useCallback(async (courseId: string) => {
        const list = await getCourseAttendanceList(courseId);
        setAttendanceList(list);
    }, []);

    const handleVolCourseChange = (courseId: string) => {
        setVolCourseId(courseId);
        loadAttendance(courseId);
    };

    // ── Volunteer Scanner View ──────────────────────────────────────────────
    if (tabView === 'volunteer_scanner') {
        const info = activeCourses.find(c => c.id === volCourseId);
        return (
            <div className="px-4 pb-8 space-y-5 max-w-lg mx-auto">
                <div className="flex items-center gap-3 pt-4">
                    <button onClick={() => setTabView('student')} className="p-2 bg-slate-800 rounded-xl text-slate-400 hover:text-white">
                        <ChevronLeft size={18} />
                    </button>
                    <div>
                        <p className="text-[10px] text-teal-400 font-black uppercase tracking-widest">志工模式</p>
                        <h2 className="text-lg font-black text-white">掃碼報到</h2>
                    </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                    {activeCourses.map(c => (
                        <button
                            key={c.id}
                            onClick={() => handleVolCourseChange(c.id)}
                            className={`flex-1 py-2.5 rounded-2xl text-xs font-black transition-all ${
                                volCourseId === c.id
                                    ? 'bg-teal-600 text-white shadow-lg shadow-teal-900/30'
                                    : 'bg-slate-800 text-slate-400'
                            }`}
                        >
                            {c.name}
                        </button>
                    ))}
                </div>

                {info && (
                    <div className="bg-slate-900 border border-slate-700/50 rounded-3xl p-4 space-y-1 text-xs text-slate-400">
                        <p className="font-black text-white">{info.name}</p>
                        <p>{info.date_display}・{info.time}</p>
                        <p>{info.location}</p>
                    </div>
                )}

                {volCourseId && <Scanner courseKey={volCourseId as 'class_b' | 'class_c'} onCheckedIn={() => loadAttendance(volCourseId)} />}

                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-teal-400 font-black text-xs uppercase tracking-widest">
                        <UserCheck size={13} /> 已報到（{attendanceList.length} 人）
                    </div>
                    {attendanceList.length === 0 ? (
                        <p className="text-xs text-slate-500 text-center py-4">尚無報到記錄</p>
                    ) : (
                        <div className="bg-slate-900 border border-slate-700/40 rounded-2xl divide-y divide-slate-800 max-h-60 overflow-y-auto">
                            {attendanceList.map(r => (
                                <div key={r.userId} className="flex justify-between items-center px-4 py-2.5">
                                    <span className="text-sm font-bold text-white">{r.userName}</span>
                                    <span className="text-[10px] text-slate-500">
                                        {new Date(r.attendedAt).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ── Volunteer Login View ────────────────────────────────────────────────
    if (tabView === 'volunteer_login') {
        return (
            <div className="px-4 pb-8 max-w-sm mx-auto space-y-6 pt-6">
                <div className="flex items-center gap-3">
                    <button onClick={() => setTabView('student')} className="p-2 bg-slate-800 rounded-xl text-slate-400 hover:text-white">
                        <ChevronLeft size={18} />
                    </button>
                    <div>
                        <p className="text-[10px] text-teal-400 font-black uppercase tracking-widest">志工專區</p>
                        <h2 className="text-lg font-black text-white">掃碼報到入口</h2>
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-700/50 rounded-3xl p-6 space-y-4">
                    <p className="text-xs text-slate-400">請輸入活動志工密碼以開啟掃碼功能。</p>
                    <form onSubmit={handleVolLogin} className="space-y-4">
                        <input
                            type="password"
                            value={volPassword}
                            onChange={e => { setVolPassword(e.target.value); setVolAuthError(''); }}
                            placeholder="志工密碼"
                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white text-center font-bold outline-none focus:border-teal-500"
                            autoFocus
                        />
                        {volAuthError && <p className="text-xs text-red-400 text-center font-bold">{volAuthError}</p>}
                        <button
                            type="submit"
                            className="w-full bg-teal-600 py-3 rounded-2xl text-white font-black hover:bg-teal-500 active:scale-95 transition-all shadow-lg"
                        >
                            <QrCode size={14} className="inline mr-2" />進入掃碼模式
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // ── Student QR View ─────────────────────────────────────────────────────
    if (studentView === 'qr' && selectedCourse) {
        const reg = regResults[selectedCourse.id];
        return (
            <div className="px-4 pb-8 max-w-sm mx-auto space-y-5 pt-4">
                <div className="flex items-center gap-3">
                    <button onClick={() => setStudentView('select')} className="p-2 bg-slate-800 rounded-xl text-slate-400 hover:text-white">
                        <ChevronLeft size={18} />
                    </button>
                    <div>
                        <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">報名完成</p>
                        <h2 className="text-lg font-black text-white">{selectedCourse.name}・入場 QR 碼</h2>
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-700/50 rounded-3xl p-6 space-y-4 text-center">
                    <p className="text-sm font-black text-white">{reg?.userName}</p>
                    <div className="flex justify-center">
                        <div className="bg-white p-4 rounded-2xl shadow-xl">
                            {reg?.registrationId && <QRCode value={reg.registrationId} size={200} />}
                        </div>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                        請截圖保存此 QR 碼<br />報到當天出示給志工掃描
                    </p>
                </div>

                <div className="bg-slate-900 border border-slate-700/40 rounded-2xl px-5 py-4 space-y-2 text-sm text-slate-300">
                    <div className="flex items-center gap-2"><CalendarDays size={13} className="text-slate-500 shrink-0" /><span>{selectedCourse.date_display}</span></div>
                    <div className="flex items-center gap-2"><Clock size={13} className="text-slate-500 shrink-0" /><span>{selectedCourse.time}</span></div>
                    <div className="flex items-center gap-2"><MapPin size={13} className="text-slate-500 shrink-0" /><span>{selectedCourse.location}</span></div>
                </div>
            </div>
        );
    }

    // ── Registration Confirm ─────────────────────────────────────────────────
    if (studentView === 'register' && selectedCourse) {
        return (
            <div className="px-4 pb-8 max-w-sm mx-auto space-y-5 pt-4">
                <div className="flex items-center gap-3">
                    <button onClick={() => setStudentView('select')} className="p-2 bg-slate-800 rounded-xl text-slate-400 hover:text-white">
                        <ChevronLeft size={18} />
                    </button>
                    <div>
                        <p className="text-[10px] text-amber-400 font-black uppercase tracking-widest">課程報名</p>
                        <h2 className="text-lg font-black text-white">{selectedCourse.name}</h2>
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-700/40 rounded-2xl px-5 py-4 space-y-1.5 text-sm text-slate-300">
                    <div className="flex items-center gap-2"><CalendarDays size={13} className="text-slate-500 shrink-0" /><span>{selectedCourse.date_display}</span></div>
                    <div className="flex items-center gap-2"><Clock size={13} className="text-slate-500 shrink-0" /><span>{selectedCourse.time}</span></div>
                    <div className="flex items-center gap-2"><MapPin size={13} className="text-slate-500 shrink-0" /><span>{selectedCourse.location}</span></div>
                </div>

                <div className="bg-slate-900 border border-slate-700/50 rounded-3xl p-6 space-y-5">
                    <div className="text-center space-y-1">
                        <p className="text-xs text-slate-500">報名者</p>
                        <p className="text-xl font-black text-white">{userName}</p>
                    </div>

                    {formError && (
                        <div className="bg-red-950/40 border border-red-500/30 rounded-2xl px-4 py-3">
                            <p className="text-xs text-red-400 font-bold text-center">{formError}</p>
                        </div>
                    )}

                    <button onClick={handleRegister} disabled={submitting} className="w-full bg-amber-600 py-4 rounded-2xl text-white font-black shadow-lg hover:bg-amber-500 active:scale-95 transition-all disabled:opacity-50">
                        {submitting ? '報名中...' : '確認報名・取得 QR 碼'}
                    </button>
                </div>
            </div>
        );
    }

    // ── Course Selection (Default) ───────────────────────────────────────────
    return (
        <div className="px-4 pb-8 space-y-5 max-w-lg mx-auto pt-4">
            <div>
                <h2 className="text-xl font-black text-white">課程報名</h2>
            </div>

            {activeCourses.length === 0 ? (
                <div className="bg-slate-900 border border-slate-700/50 rounded-3xl p-8 text-center">
                    <p className="text-slate-500 text-sm font-bold">目前尚無開放報名的課程</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {activeCourses.map(course => {
                        const reg = regResults[course.id];
                        const isRegistered = !!reg;
                        const isAttended = attendedCourses?.has(course.id) ?? false;
                        return (
                            <div key={course.id} className={`rounded-3xl border-2 p-5 space-y-3 transition-all ${isAttended ? 'bg-gradient-to-br from-amber-950/40 to-slate-900 border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.1)]' : isRegistered ? 'bg-gradient-to-br from-emerald-950/60 to-slate-900 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 'bg-slate-900 border-slate-700/50'}`}>
                                <div className="flex items-center gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-black text-white text-base">{course.name}</h3>
                                            {isAttended
                                                ? <span className="text-[10px] px-2 py-0.5 bg-amber-500/20 text-amber-400 font-black rounded-lg shrink-0">已出席 ✓</span>
                                                : isRegistered && <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-400 font-black rounded-lg shrink-0">已報名</span>}
                                        </div>
                                        <div className="space-y-1 text-xs text-slate-400">
                                            <div className="flex items-center gap-1.5"><CalendarDays size={11} className="text-slate-500 shrink-0" />{course.date_display}</div>
                                            <div className="flex items-center gap-1.5"><Clock size={11} className="text-slate-500 shrink-0" />{course.time}</div>
                                            <div className="flex items-center gap-1.5"><MapPin size={11} className="text-slate-500 shrink-0" />{course.location}</div>
                                        </div>
                                    </div>
                                    {((course.reward_exp ?? 0) > 0 || (course.reward_coins ?? 0) > 0) && (
                                        <div className="text-right shrink-0">
                                            {(course.reward_exp ?? 0) > 0 && <div className="text-sm font-black text-orange-400">+{course.reward_exp} 修為</div>}
                                            {(course.reward_coins ?? 0) > 0 && <div className="text-xs font-bold text-yellow-400">+{course.reward_coins} 🪙</div>}
                                        </div>
                                    )}
                                </div>
                                {isAttended ? (
                                    <div className="w-full py-3 rounded-2xl font-black text-sm text-center bg-amber-500/10 text-amber-400">
                                        ✓ 已完成出席
                                    </div>
                                ) : (
                                    <button onClick={() => handleSelectCourse(course)} className={`w-full py-3 rounded-2xl font-black text-sm transition-all active:scale-95 ${isRegistered ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-900/30' : 'bg-amber-600 text-white hover:bg-amber-500 shadow-lg shadow-amber-900/20'}`}>
                                        {isRegistered ? <><QrCode size={14} className="inline mr-1.5" />查看入場 QR 碼</> : '立即報名'}
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="pt-2 text-center">
                <button onClick={() => setTabView('volunteer_login')} className="text-[11px] text-slate-600 hover:text-teal-400 font-bold transition-colors underline underline-offset-2">
                    志工報到入口
                </button>
            </div>
        </div>
    );
}
