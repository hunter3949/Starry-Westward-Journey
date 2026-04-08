'use client';
import { Settings } from 'lucide-react';
import { ADMIN_PASSWORD } from '@/lib/constants';
import React from 'react';

export function LineRichMenuSection() {
    const [status, setStatus] = React.useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
    const [msg, setMsg] = React.useState('');

    const handleSetup = async () => {
        setStatus('loading');
        setMsg('');
        try {
            const res = await fetch(`/api/admin/setup-richmenu?key=${encodeURIComponent(ADMIN_PASSWORD)}`);
            const data = await res.json();
            if (data.success) {
                setStatus('ok');
                setMsg(`選單已設定完成（ID: ${data.richMenuId}）`);
            } else {
                setStatus('error');
                setMsg(data.error ?? '未知錯誤');
            }
        } catch (e: unknown) {
            setStatus('error');
            setMsg(e instanceof Error ? e.message : '連線失敗');
        }
    };

    return (
        <section className="space-y-6">
            <div className="flex items-center gap-2 text-orange-500 font-black text-sm uppercase tracking-widest">
                <Settings size={16} /> LINE 機器人選單設定
            </div>
            <div className="bg-slate-900 border-2 border-slate-800 p-8 rounded-4xl space-y-4 shadow-xl">
                {status === 'ok' ? (
                    <p className="text-xs text-center font-bold text-green-400">{msg}</p>
                ) : (
                    <>
                        <p className="text-xs text-slate-400">點擊後將自動產生選單圖片並透過 LINE API 設為預設選單，需要約 10–20 秒。</p>
                        <button
                            onClick={handleSetup}
                            disabled={status === 'loading'}
                            className="w-full bg-green-700 p-4 rounded-2xl text-white font-black shadow-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                        >
                            {status === 'loading' ? '⏳ 設定中…' : '📱 設定 LINE 定課選單'}
                        </button>
                        {status === 'error' && msg && (
                            <p className="text-xs text-center font-bold text-red-400">{msg}</p>
                        )}
                    </>
                )}
            </div>
        </section>
    );
}

