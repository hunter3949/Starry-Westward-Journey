'use client';

import React, { useState } from 'react';
import { ArrowLeftRight, ChevronDown, ChevronUp, RefreshCw, Zap } from 'lucide-react';
import { CharacterStats, SystemSettings } from '@/types';
import { exchangeCurrency, performLifeReset } from '@/app/actions/boardGame';

interface Props {
    userData: CharacterStats;
    cash: number;
    blessing: number;
    systemSettings: SystemSettings;
    onStatsChange: (cash: number, blessing: number) => void;
}

export default function BoardGameView({ userData, cash, blessing, systemSettings, onStatsChange }: Props) {
    const buyRate  = parseInt(systemSettings.BoardGameBuyRate  || '10', 10);  // 1 福報 = buyRate 現金
    const sellRate = parseInt(systemSettings.BoardGameSellRate || '10', 10);  // sellRate 現金 = 1 福報
    const zeroEnabled = systemSettings.BoardGameZeroEnabled === 'true';
    const zeroCashMul     = parseFloat(systemSettings.BoardGameZeroCashMultiplier     || '1');
    const zeroBlessingMul = parseFloat(systemSettings.BoardGameZeroBlessingMultiplier || '1');

    const [showExchange, setShowExchange] = useState(false);
    const [direction, setDirection] = useState<'blessing_to_cash' | 'cash_to_blessing'>('blessing_to_cash');
    const [inputAmount, setInputAmount] = useState('');
    const [confirmExchange, setConfirmExchange] = useState(false);
    const [confirmZero, setConfirmZero] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

    const parsedInput = parseInt(inputAmount, 10) || 0;
    const spendBalance = direction === 'blessing_to_cash' ? blessing : cash;

    // preview calculations
    const previewReceive = direction === 'blessing_to_cash'
        ? parsedInput * buyRate
        : Math.floor(parsedInput / sellRate);
    const previewLabel = direction === 'blessing_to_cash' ? '現金' : '福報';
    const spendLabel   = direction === 'blessing_to_cash' ? '福報' : '現金';

    const canExchange = parsedInput > 0 && parsedInput <= spendBalance &&
        (direction === 'cash_to_blessing' ? Math.floor(parsedInput / sellRate) >= 1 : true);

    const showMsg = (text: string, ok: boolean) => {
        setMessage({ text, ok });
        setTimeout(() => setMessage(null), 3000);
    };

    const handleExchange = async () => {
        setLoading(true);
        const res = await exchangeCurrency(
            userData.UserID, direction, parsedInput, cash, blessing, buyRate, sellRate
        );
        setLoading(false);
        setConfirmExchange(false);
        if (res.success) {
            onStatsChange(res.newCash!, res.newBlessing!);
            setInputAmount('');
            showMsg('兌換成功！', true);
        } else {
            showMsg(res.error || '兌換失敗', false);
        }
    };

    const handleLifeReset = async () => {
        setLoading(true);
        const res = await performLifeReset(userData.UserID, cash, blessing, zeroCashMul, zeroBlessingMul);
        setLoading(false);
        setConfirmZero(false);
        if (res.success) {
            onStatsChange(res.newCash!, res.newBlessing!);
            showMsg('人生歸零完成！', true);
        } else {
            showMsg(res.error || '操作失敗', false);
        }
    };

    const squadName = userData.LittleTeamNickName || userData.LittleTeamLeagelName || '未分隊';

    return (
        <div className="fixed inset-0 z-[100] bg-slate-950 overflow-y-auto">
            <div className="max-w-md mx-auto px-4 py-6 space-y-4">

                {/* Header */}
                <div className="text-center pb-2">
                    <div className="text-4xl mb-1">🎲</div>
                    <h1 className="text-2xl font-black text-emerald-400 tracking-wide">開運大富翁</h1>
                </div>

                {/* 姓名 + 小隊 */}
                <div className="flex flex-col gap-2">
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl px-5 py-3 text-center">
                        <p className="text-xs text-slate-500 mb-0.5">修行者</p>
                        <p className="text-lg font-black text-white">{userData.Name}</p>
                    </div>
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl px-5 py-3 text-center">
                        <p className="text-xs text-slate-500 mb-0.5">所屬小隊</p>
                        <p className="text-lg font-black text-emerald-300">{squadName}</p>
                    </div>
                </div>

                {/* 現金 */}
                <div className="bg-gradient-to-r from-amber-950/60 to-amber-900/40 border border-amber-600/40 rounded-2xl px-6 py-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">💰</span>
                        <span className="text-lg font-black text-amber-300">現金</span>
                    </div>
                    <span className="text-2xl font-black text-amber-400 tabular-nums">{cash.toLocaleString()}</span>
                </div>

                {/* 福報 */}
                <div className="bg-gradient-to-r from-violet-950/60 to-violet-900/40 border border-violet-600/40 rounded-2xl px-6 py-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">🌸</span>
                        <span className="text-lg font-black text-violet-300">福報</span>
                    </div>
                    <span className="text-2xl font-black text-violet-400 tabular-nums">{blessing.toLocaleString()}</span>
                </div>

                {/* 福氣錢莊 */}
                <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden">
                    <button
                        onClick={() => setShowExchange(v => !v)}
                        className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-800 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <ArrowLeftRight size={20} className="text-emerald-400" />
                            <span className="font-black text-white">福氣錢莊</span>
                            <span className="text-xs text-slate-400">買匯 1福報={buyRate}現金 ／ 賣匯 {sellRate}現金=1福報</span>
                        </div>
                        {showExchange ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                    </button>

                    {showExchange && (
                        <div className="px-6 pb-6 space-y-4 border-t border-slate-800">
                            {/* Direction toggle */}
                            <div className="flex gap-2 mt-4">
                                <button
                                    onClick={() => { setDirection('blessing_to_cash'); setInputAmount(''); }}
                                    className={`flex-1 py-2 rounded-xl text-sm font-black transition-all ${direction === 'blessing_to_cash' ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                                >
                                    買匯 福報→現金
                                </button>
                                <button
                                    onClick={() => { setDirection('cash_to_blessing'); setInputAmount(''); }}
                                    className={`flex-1 py-2 rounded-xl text-sm font-black transition-all ${direction === 'cash_to_blessing' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                                >
                                    賣匯 現金→福報
                                </button>
                            </div>

                            {/* Rate hint */}
                            <p className="text-xs text-slate-500 text-center">
                                {direction === 'blessing_to_cash'
                                    ? `買匯率：1 福報 = ${buyRate} 現金`
                                    : `賣匯率：${sellRate} 現金 = 1 福報`}
                            </p>

                            {/* Input */}
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400 font-bold">
                                    花費 {spendLabel}（餘額：{spendBalance.toLocaleString()}）
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    value={inputAmount}
                                    onChange={e => setInputAmount(e.target.value)}
                                    placeholder="輸入數量"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-emerald-500"
                                />
                            </div>

                            {/* Preview */}
                            {parsedInput > 0 && (
                                <div className="bg-slate-800/60 rounded-xl px-4 py-3 flex items-center justify-between">
                                    <span className="text-sm text-slate-400">獲得 {previewLabel}</span>
                                    <span className="text-lg font-black text-emerald-400">{previewReceive.toLocaleString()}</span>
                                </div>
                            )}

                            {message && (
                                <p className={`text-sm font-bold text-center ${message.ok ? 'text-emerald-400' : 'text-red-400'}`}>{message.text}</p>
                            )}

                            <button
                                onClick={() => setConfirmExchange(true)}
                                disabled={!canExchange}
                                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-2xl transition-all active:scale-95"
                            >
                                確認換匯
                            </button>
                        </div>
                    )}
                </div>

                {/* 人生歸零 */}
                {zeroEnabled && (
                    <button
                        onClick={() => setConfirmZero(true)}
                        className="w-full py-4 bg-gradient-to-r from-red-700 to-orange-700 hover:from-red-600 hover:to-orange-600 text-white font-black text-lg rounded-2xl transition-all active:scale-95 shadow-lg flex items-center justify-center gap-3"
                    >
                        <Zap size={22} />
                        人生歸零
                    </button>
                )}

                {/* 八大場域 */}
                <div>
                    <p className="text-xs text-slate-500 font-bold mb-3 tracking-widest">— 場域 —</p>
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { name: '智慧之門',   emoji: '🎓' },
                            { name: '肉身修煉場', emoji: '💪' },
                            { name: '靈魂揚升殿', emoji: '✨' },
                            { name: '心靈餐廳',   emoji: '🍽️' },
                            { name: '智慧之門',   emoji: '🎓' },
                            { name: '無限打工所', emoji: '🔨' },
                            { name: '創業之家',   emoji: '🏠' },
                            { name: '金融投資',   emoji: '📈' },
                        ].map((venue, i) => (
                            <div
                                key={i}
                                className="aspect-square bg-slate-900 border border-slate-700 rounded-2xl flex flex-col items-center justify-center gap-2 p-4"
                            >
                                <span className="text-3xl">{venue.emoji}</span>
                                <span className="text-sm font-black text-white text-center leading-tight">{venue.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Confirm exchange dialog */}
            {confirmExchange && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700 rounded-3xl p-7 max-w-xs w-full space-y-5 text-center">
                        <h3 className="text-lg font-black text-white">確認兌換</h3>
                        <div className="space-y-1 text-sm">
                            <p className="text-slate-300">花費 <span className="font-black text-white">{parsedInput.toLocaleString()} {spendLabel}</span></p>
                            <p className="text-slate-300">獲得 <span className="font-black text-emerald-400">{previewReceive.toLocaleString()} {previewLabel}</span></p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmExchange(false)} className="flex-1 py-3 bg-slate-800 text-slate-300 font-black rounded-xl hover:bg-slate-700 transition-colors">取消</button>
                            <button onClick={handleExchange} disabled={loading} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                                {loading && <RefreshCw size={14} className="animate-spin" />}確認
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm life reset dialog */}
            {confirmZero && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-red-700/50 rounded-3xl p-7 max-w-xs w-full space-y-5 text-center">
                        <div className="text-4xl">⚡</div>
                        <h3 className="text-lg font-black text-red-400">人生歸零</h3>
                        <div className="space-y-1 text-sm bg-slate-800 rounded-xl p-4">
                            <p className="text-slate-300">現金 <span className="font-black text-amber-400">{cash.toLocaleString()}</span> → <span className="font-black text-white">{Math.round(cash * zeroCashMul).toLocaleString()}</span> <span className="text-slate-500">（×{zeroCashMul}）</span></p>
                            <p className="text-slate-300">福報 <span className="font-black text-violet-400">{blessing.toLocaleString()}</span> → <span className="font-black text-white">{Math.round(blessing * zeroBlessingMul).toLocaleString()}</span> <span className="text-slate-500">（×{zeroBlessingMul}）</span></p>
                        </div>
                        <p className="text-xs text-red-400">此操作無法復原，確定繼續？</p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmZero(false)} className="flex-1 py-3 bg-slate-800 text-slate-300 font-black rounded-xl hover:bg-slate-700 transition-colors">取消</button>
                            <button onClick={handleLifeReset} disabled={loading} className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                                {loading && <RefreshCw size={14} className="animate-spin" />}確認
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
