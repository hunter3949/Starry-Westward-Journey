'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { markAttendance } from '@/app/actions/course';
import { COURSE_INFO, type CourseKey } from '@/lib/courseConfig';

interface ScanResult {
    type: 'duplicate' | 'error';
    message: string;
}

interface ScannerProps {
    courseKey: CourseKey;
    onCheckedIn: () => void;
}

export default function Scanner({ courseKey, onCheckedIn }: ScannerProps) {
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const [scanResult, setScanResult] = useState<ScanResult | null>(null);
    const [scanning, setScanning] = useState(false);
    const [successName, setSuccessName] = useState<string | null>(null);
    const cooldownRef = useRef(false);

    const courseInfo = COURSE_INFO[courseKey];

    useEffect(() => {
        const html5QrCode = new Html5Qrcode('qr-reader');
        scannerRef.current = html5QrCode;
        let isRunning = false;

        html5QrCode.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: { width: 240, height: 240 } },
            async (decodedText) => {
                if (cooldownRef.current) return;
                cooldownRef.current = true;

                const res = await markAttendance(decodedText, `checkin-${courseKey}`);

                if (res.success) {
                    if (res.alreadyCheckedIn) {
                        setScanResult({ type: 'duplicate', message: `${res.userName} 已於先前完成報到` });
                        setTimeout(() => {
                            setScanResult(null);
                            cooldownRef.current = false;
                        }, 3000);
                    } else {
                        setSuccessName(res.userName);
                        onCheckedIn();
                        // cooldown held until user confirms modal
                    }
                } else {
                    setScanResult({ type: 'error', message: res.error });
                    setTimeout(() => {
                        setScanResult(null);
                        cooldownRef.current = false;
                    }, 3000);
                }
            },
            () => { /* ignore scan errors (non-QR frames) */ }
        ).then(() => { isRunning = true; setScanning(true); }).catch(() => {
            setScanResult({ type: 'error', message: '無法啟動相機，請確認已授予相機權限' });
        });

        return () => {
            if (isRunning) {
                html5QrCode.stop().catch(() => {});
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [courseKey]);

    return (
        <div className="space-y-3">
            <p className="text-xs text-center text-slate-400">
                正在掃描・{courseInfo.name}（{courseInfo.dateDisplay}）
            </p>

            {/* Camera viewfinder */}
            <div className="relative rounded-2xl overflow-hidden border-2 border-slate-700 bg-black">
                <div id="qr-reader" className="w-full" />
                {!scanning && !scanResult && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <p className="text-slate-500 text-sm">相機啟動中…</p>
                    </div>
                )}
            </div>

            {/* Duplicate / error banner */}
            {scanResult && (
                <div className={`rounded-2xl px-4 py-3 text-center font-bold text-sm transition-all ${
                    scanResult.type === 'duplicate'
                        ? 'bg-yellow-900/60 border border-yellow-500/50 text-yellow-300'
                        : 'bg-red-900/60 border border-red-500/50 text-red-300'
                }`}>
                    {scanResult.message}
                </div>
            )}

            {/* Success modal */}
            {successName && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm">
                    <div className="bg-slate-900 border-2 border-emerald-500/50 rounded-3xl p-8 mx-6 text-center space-y-5 shadow-2xl">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
                            <span className="text-3xl">✓</span>
                        </div>
                        <p className="text-white font-black text-xl">{successName} 掃碼成功</p>
                        <button
                            onClick={() => {
                                setSuccessName(null);
                                cooldownRef.current = false;
                            }}
                            className="w-full py-3 rounded-2xl bg-emerald-600 text-white font-black text-base active:scale-95 transition-all"
                        >
                            確認
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
