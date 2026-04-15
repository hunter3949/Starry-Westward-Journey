'use client';
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameEngine, type GameState, type GameEvent } from './engine/GameEngine';

export function MazeGame() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<GameEngine | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [gameState, setGameState] = useState<GameState>('playing');
    const [message, setMessage] = useState<string | null>(null);

    const handleEvent = useCallback((event: GameEvent) => {
        if (event.type === 'chest') {
            setMessage('發現寶箱！獲得信心道具');
            if (engineRef.current) engineRef.current.fog.activateBoost(5);
            setTimeout(() => setMessage(null), 2000);
        }
        if (event.type === 'trap') {
            setMessage('路徑陷阱！小心迷失...');
            setTimeout(() => setMessage(null), 2000);
        }
        if (event.type === 'stay_too_long') {
            setMessage('停留太久了！黑霧侵蝕 -10 HP');
            setTimeout(() => setMessage(null), 2000);
        }
        if (event.type === 'exit') {
            setGameState('victory');
        }
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const engine = new GameEngine(canvas, handleEvent);
        engineRef.current = engine;

        const resize = () => {
            const w = container.clientWidth;
            const h = container.clientHeight;
            engine.resize(w, h);
        };
        resize();
        window.addEventListener('resize', resize);

        engine.start();

        return () => {
            engine.stop();
            window.removeEventListener('resize', resize);
        };
    }, [handleEvent]);

    const handleNewGame = () => {
        if (engineRef.current) {
            engineRef.current.newGame();
            setGameState('playing');
            setMessage(null);
        }
    };

    // 虛擬搖桿
    const setDir = (dir: 'up' | 'down' | 'left' | 'right' | null) => {
        engineRef.current?.input.setTouchDirection(dir);
    };

    return (
        <div ref={containerRef} className="relative w-full h-full min-h-[500px] bg-[#0a0f1e] rounded-2xl overflow-hidden select-none">
            <canvas ref={canvasRef} className="block w-full h-full" style={{ imageRendering: 'pixelated' }} />

            {/* 事件訊息 */}
            {message && (
                <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-black/80 text-yellow-300 font-black text-sm px-4 py-2 rounded-xl animate-in fade-in z-10">
                    {message}
                </div>
            )}

            {/* 虛擬搖桿（手機） */}
            <div className="absolute bottom-6 left-6 z-20 md:hidden">
                <div className="relative w-32 h-32">
                    {/* 上 */}
                    <button
                        onTouchStart={() => setDir('up')} onTouchEnd={() => setDir(null)}
                        onMouseDown={() => setDir('up')} onMouseUp={() => setDir(null)}
                        className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center text-white/60 active:bg-white/30 text-lg"
                    >▲</button>
                    {/* 下 */}
                    <button
                        onTouchStart={() => setDir('down')} onTouchEnd={() => setDir(null)}
                        onMouseDown={() => setDir('down')} onMouseUp={() => setDir(null)}
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center text-white/60 active:bg-white/30 text-lg"
                    >▼</button>
                    {/* 左 */}
                    <button
                        onTouchStart={() => setDir('left')} onTouchEnd={() => setDir(null)}
                        onMouseDown={() => setDir('left')} onMouseUp={() => setDir(null)}
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center text-white/60 active:bg-white/30 text-lg"
                    >◀</button>
                    {/* 右 */}
                    <button
                        onTouchStart={() => setDir('right')} onTouchEnd={() => setDir(null)}
                        onMouseDown={() => setDir('right')} onMouseUp={() => setDir(null)}
                        className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center text-white/60 active:bg-white/30 text-lg"
                    >▶</button>
                </div>
            </div>

            {/* 勝利畫面 */}
            {gameState === 'victory' && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-30">
                    <div className="bg-slate-900 border-2 border-yellow-500/50 rounded-3xl p-8 text-center space-y-4 max-w-sm mx-4">
                        <div className="text-5xl">🏆</div>
                        <h2 className="text-2xl font-black text-yellow-400">迷宮通關！</h2>
                        <p className="text-sm text-slate-400">你成功走出了黑松林的迷霧</p>
                        <button onClick={handleNewGame}
                            className="w-full py-3 bg-yellow-600 hover:bg-yellow-500 text-white font-black rounded-2xl transition-colors">
                            再次挑戰
                        </button>
                    </div>
                </div>
            )}

            {/* Game Over */}
            {gameState === 'gameover' && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-30">
                    <div className="bg-slate-900 border-2 border-red-500/50 rounded-3xl p-8 text-center space-y-4 max-w-sm mx-4">
                        <div className="text-5xl">💀</div>
                        <h2 className="text-2xl font-black text-red-400">迷失在黑霧中...</h2>
                        <p className="text-sm text-slate-400">黑霧侵蝕了你的生命力</p>
                        <button onClick={handleNewGame}
                            className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-black rounded-2xl transition-colors">
                            重新挑戰
                        </button>
                    </div>
                </div>
            )}

            {/* 操作提示 */}
            <div className="absolute bottom-4 right-4 text-[10px] text-white/30 hidden md:block">
                WASD / 方向鍵移動
            </div>
        </div>
    );
}
