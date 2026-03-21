'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { X } from 'lucide-react';

const TEXTS = [
    "對別人的期待\n就是對自己的期待",
    "勇敢不是沒有恐懼\n而是帶著恐懼依然前行",
    "外求一物是一物\n內求一心是全部",
    "一切都好",
    "沒有奇蹟\n只有累積",
    "相由心生",
    "流動情緒",
    "外圓內方",
    "給出什麼\n就得到什麼",
    "內在有什麼\n外在就得到什麼",
];

const N = 10;

export function LifeHintCard({ onClose, onDraw, texts, cardBackImage }: { onClose: () => void; onDraw?: (text: string) => void; texts?: string[]; cardBackImage?: string }) {
    const pool = texts && texts.length > 0 ? texts : TEXTS;
    const cardRefs = useRef<(HTMLDivElement | null)[]>(Array(N).fill(null));
    const [busy, setBusy] = useState(false);
    const [started, setStarted] = useState(false);

    const getSize = useCallback(() => {
        const w = Math.min(window.innerWidth * 0.42, 160);
        return { w, h: w * 0.7 };
    }, []);

    const layout = useCallback(() => {
        const { w, h } = getSize();
        const dy = h * 0.2;
        const base = -((N - 1) * dy) / 2;
        cardRefs.current.forEach((el, i) => {
            if (!el) return;
            el.style.width = `${w}px`;
            el.style.height = `${h}px`;
            el.style.left = '50%';
            el.style.top = `${base + i * dy}px`;
            el.style.transform = 'translateX(-50%) scaleX(1)';
            el.style.zIndex = String(i);
            // Reset to back face
            const back = el.querySelector<HTMLDivElement>('.lhc-back');
            const front = el.querySelector<HTMLDivElement>('.lhc-front');
            if (back) back.style.opacity = '1';
            if (front) { front.style.opacity = '0'; front.textContent = ''; }
        });
    }, [getSize]);

    useEffect(() => {
        layout();
        window.addEventListener('resize', layout);
        return () => window.removeEventListener('resize', layout);
    }, [layout]);

    const shuffle = () => new Promise<void>(res => {
        const { h } = getSize();
        const dy = h * 0.2;
        const base = -((N - 1) * dy) / 2;
        const pairs = Array.from({ length: 8 }, () => {
            const a = Math.floor(Math.random() * N);
            let b = Math.floor(Math.random() * N);
            while (b === a) b = Math.floor(Math.random() * N);
            return { a, b };
        });
        let idx = 0;
        const next = () => {
            if (idx >= pairs.length) {
                cardRefs.current.forEach((el, i) => {
                    if (!el) return;
                    el.style.top = `${base + i * dy}px`;
                    el.style.zIndex = String(N - i);
                    el.style.transform = 'translateX(-50%) scaleX(1)';
                });
                return res();
            }
            const { a, b } = pairs[idx];
            const t0 = Date.now();
            const dur = 150;
            const frame = () => {
                const p = Math.min((Date.now() - t0) / dur, 1);
                const e = 1 - Math.pow(1 - p, 3);
                cardRefs.current.forEach((el, i) => {
                    if (!el) return;
                    let top = base + i * dy;
                    if (i === a) top = (base + a * dy) + ((base + b * dy) - (base + a * dy)) * e;
                    else if (i === b) top = (base + b * dy) + ((base + a * dy) - (base + b * dy)) * e;
                    el.style.top = `${top}px`;
                    el.style.transform = 'translateX(-50%) scaleX(1)';
                    el.style.zIndex = (p > 0.1 && p < 0.9)
                        ? String(Math.floor(Math.random() * N) + 1)
                        : String(N - i);
                });
                if (p < 1) requestAnimationFrame(frame);
                else { idx++; setTimeout(next, 75); }
            };
            frame();
        };
        next();
    });

    const settle = () => new Promise<void>(res => {
        const targetTop = window.innerHeight * 0.25;
        cardRefs.current.forEach((el, i) => {
            if (!el) return;
            el.style.transition = `top 400ms ease ${i * 25}ms, transform 400ms ease ${i * 25}ms`;
            setTimeout(() => {
                if (el) {
                    el.style.top = `${targetTop}px`;
                    el.style.transform = 'translateX(-50%) scaleX(1)';
                }
            }, 20);
        });
        setTimeout(res, 500 + N * 25);
    });

    const reveal = () => new Promise<void>(res => {
        const el = cardRefs.current[N - 1];
        if (!el) return res();
        el.style.zIndex = '999';
        const rect = el.getBoundingClientRect();
        const dy = window.innerHeight * 0.4 - (rect.top + rect.height / 2);
        // Move card to center
        el.style.transition = 'top 0.9s cubic-bezier(0.25,0.46,0.45,0.94), transform 0.9s cubic-bezier(0.25,0.46,0.45,0.94)';
        void el.offsetWidth;
        el.style.top = `${parseFloat(el.style.top || '0') + dy}px`;
        el.style.transform = `translateX(-50%) scale(2)`;

        setTimeout(() => {
            el.style.transition = '';
            const text = pool[Math.floor(Math.random() * pool.length)];
            const back = el.querySelector<HTMLDivElement>('.lhc-back');
            const front = el.querySelector<HTMLDivElement>('.lhc-front');
            if (front) front.textContent = text;

            // Phase 1: scaleX 1 → 0 (fold)
            el.style.transition = 'transform 200ms ease-in';
            void el.offsetWidth;
            el.style.transform = 'translateX(-50%) scale(2) scaleX(0)';

            setTimeout(() => {
                // Swap faces at the 0-width point
                if (back) back.style.opacity = '0';
                if (front) front.style.opacity = '1';
                // Phase 2: scaleX 0 → 1 (unfold showing front)
                el.style.transition = 'transform 200ms ease-out';
                void el.offsetWidth;
                el.style.transform = 'translateX(-50%) scale(2) scaleX(1)';
                setTimeout(() => {
                    el.style.transition = '';
                    onDraw?.(text);
                    res();
                }, 220);
            }, 210);
        }, 950);
    });

    const run = async () => {
        if (busy) return;
        setBusy(true);
        setStarted(true);
        layout();
        await shuffle();
        await new Promise(r => setTimeout(r, 500));
        await settle();
        await reveal();
        setBusy(false);
    };

    return (
        <div
            className="fixed inset-0 z-[200] flex flex-col"
            style={{ background: 'linear-gradient(180deg,#0f172a 0%,#1e293b 100%)' }}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 shrink-0 border-b border-white/5">
                <h2 className="text-white font-black text-lg tracking-wide">🃏 人生提示卡</h2>
                <button
                    onClick={onClose}
                    className="p-2 bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"
                >
                    <X size={18} />
                </button>
            </div>

            {/* Card stage */}
            <div className="flex-1 relative overflow-hidden">
                <div
                    className="absolute"
                    style={{ left: '50%', transform: 'translateX(-50%)', top: '38%', width: '100%', pointerEvents: 'none' }}
                >
                    {Array.from({ length: N }).map((_, i) => (
                        <div
                            key={i}
                            ref={el => { cardRefs.current[i] = el; }}
                            className="absolute"
                            style={{ transformOrigin: 'center center' }}
                        >
                            {/* 背面 */}
                            <div
                                className="lhc-back absolute inset-0 rounded-xl overflow-hidden"
                                style={{
                                    backgroundImage: cardBackImage ? `url(${cardBackImage})` : undefined,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    background: cardBackImage ? undefined : 'linear-gradient(135deg,#1e3a5f 0%,#0f2744 60%,#162032 100%)',
                                    boxShadow: '0 6px 16px rgba(0,0,0,0.5)',
                                }}
                            />
                            {/* 正面：粉色系 + 文字 */}
                            <div
                                className="lhc-front absolute inset-0 rounded-xl flex items-center justify-center p-3"
                                style={{
                                    opacity: 0,
                                    background: 'linear-gradient(135deg,#ffecd2 0%,#fcb69f 40%,#f8a5c2 70%,#ffeaa7 100%)',
                                    color: '#5a2d4c',
                                    fontWeight: 700,
                                    fontSize: '13px',
                                    lineHeight: 1.6,
                                    textAlign: 'center',
                                    whiteSpace: 'pre-line',
                                    border: '1px solid rgba(255,255,255,0.5)',
                                    boxShadow: 'inset 0 1px 3px rgba(255,255,255,0.6), 0 4px 15px rgba(0,0,0,0.2)',
                                    textShadow: '0 1px 2px rgba(255,255,255,0.4)',
                                }}
                            />
                        </div>
                    ))}
                </div>

                {/* 初始提示 */}
                {!started && (
                    <div className="absolute inset-0 flex items-end justify-center pb-40 pointer-events-none">
                        <p className="text-slate-500 text-sm font-bold animate-pulse">點下方按鈕開始洗牌</p>
                    </div>
                )}
            </div>

            {/* 按鈕 */}
            <div className="shrink-0 flex justify-center pb-12 pt-3">
                <button
                    onClick={run}
                    disabled={busy}
                    className="bg-gradient-to-b from-emerald-500 to-emerald-700 text-white font-black rounded-full px-10 py-3.5 text-base shadow-lg shadow-emerald-900/40 active:scale-95 transition-all disabled:opacity-50"
                >
                    {busy ? '洗牌中…' : started ? '🔄 再抽一張' : '🃏 洗牌抽卡'}
                </button>
            </div>
        </div>
    );
}
