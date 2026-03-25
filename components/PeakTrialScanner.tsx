'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { markPeakTrialAttendance } from '@/app/actions/peakTrials';

interface ScanResult {
    type: 'success' | 'duplicate' | 'error';
    message: string;
}

interface PeakTrialScannerProps {
    trialId: string;
    trialTitle: string;
    onCheckedIn: () => void;
}

export default function PeakTrialScanner({ trialId, trialTitle, onCheckedIn }: PeakTrialScannerProps) {
    const elementId = `pt-qr-reader-${trialId}`;
    const [scanResult, setScanResult] = useState<ScanResult | null>(null);
    const [scanning, setScanning] = useState(false);
    const cooldownRef = useRef(false);

    useEffect(() => {
        const html5QrCode = new Html5Qrcode(elementId);
        let isRunning = false;

        html5QrCode.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: { width: 240, height: 240 } },
            async (decodedText) => {
                if (cooldownRef.current) return;
                cooldownRef.current = true;

                const res = await markPeakTrialAttendance(decodedText);

                if (res.success) {
                    if (res.alreadyAttended) {
                        setScanResult({ type: 'duplicate', message: `${res.userName || '此學員'} 已完成核銷` });
                    } else {
                        setScanResult({ type: 'success', message: `✓ ${res.userName || '報到成功'}！` });
                        onCheckedIn();
                    }
                } else {
                    setScanResult({ type: 'error', message: res.error || '核銷失敗' });
                }

                setTimeout(() => {
                    setScanResult(null);
                    cooldownRef.current = false;
                }, 3000);
            },
            () => {}
        ).then(() => { isRunning = true; setScanning(true); }).catch(() => {
            setScanResult({ type: 'error', message: '無法啟動相機，請確認已授予相機權限' });
        });

        return () => {
            if (isRunning) html5QrCode.stop().catch(() => {});
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [elementId]);

    return (
        <div className="space-y-3">
            <p className="text-xs text-center text-slate-400">掃描報到 QR 碼・{trialTitle}</p>
            <div className="relative rounded-2xl overflow-hidden border-2 border-slate-700 bg-black">
                <div id={elementId} className="w-full" />
                {!scanning && !scanResult && (
                    <div className="absolute inset-0 flex items-center justify-center py-10">
                        <p className="text-slate-500 text-sm">相機啟動中…</p>
                    </div>
                )}
            </div>
            {scanResult && (
                <div className={`rounded-2xl px-4 py-3 text-center font-bold text-sm ${
                    scanResult.type === 'success'
                        ? 'bg-emerald-900/60 border border-emerald-500/50 text-emerald-300'
                        : scanResult.type === 'duplicate'
                        ? 'bg-yellow-900/60 border border-yellow-500/50 text-yellow-300'
                        : 'bg-red-900/60 border border-red-500/50 text-red-300'
                }`}>
                    {scanResult.message}
                </div>
            )}
        </div>
    );
}
