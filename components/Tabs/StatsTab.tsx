import React from 'react';
import { Sparkles, Shield, Heart, Brain, Zap, Trophy, Coins, Cake } from 'lucide-react';
import { CharacterStats } from '@/types';

interface StatCardProps {
    label: string;
    value: number;
    icon: React.ReactNode;
    color: string;
}

export const StatCard = ({ label, value, icon, color }: StatCardProps) => (
    <div className="bg-slate-900 border-2 border-slate-800 p-5 rounded-4xl shadow-xl text-left">
        <div className="flex items-center gap-2 mb-2">
            {icon}
            <span className="text-[10px] font-black text-slate-500 tracking-widest uppercase ml-1">{label}</span>
        </div>
        <div className="flex items-center gap-4">
            <span className="text-4xl font-black text-white">{value || 0}</span>
            <div className="h-2.5 flex-1 bg-slate-800 rounded-full overflow-hidden shadow-inner">
                <div
                    className={`h-full ${color} opacity-70 transition-all duration-1000`}
                    style={{ width: `${Math.min(100, ((value || 0) / 50) * 100)}%` }}
                ></div>
            </div>
        </div>
    </div>
);

// ── 六維蛛網圖（純 SVG）──────────────────────────────────────

const RADAR_STATS = [
    { key: 'Spirit',    label: '神識', color: '#a855f7' },
    { key: 'Physique',  label: '根骨', color: '#ef4444' },
    { key: 'Charisma',  label: '魅力', color: '#ec4899' },
    { key: 'Savvy',     label: '悟性', color: '#3b82f6' },
    { key: 'Luck',      label: '機緣', color: '#10b981' },
    { key: 'Potential', label: '潛力', color: '#eab308' },
];

function RadarChart({ userData }: { userData: CharacterStats }) {
    const cx = 150, cy = 150, maxR = 110;
    const maxVal = 100; // 屬性上限
    const n = RADAR_STATS.length;

    const getPoint = (i: number, r: number) => {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
    };

    // 背景網格（5 層）
    const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];
    const gridPaths = gridLevels.map(pct => {
        const pts = Array.from({ length: n }, (_, i) => getPoint(i, maxR * pct));
        return pts.map(p => `${p.x},${p.y}`).join(' ');
    });

    // 資料多邊形
    const values = RADAR_STATS.map(s => Math.min(maxVal, (userData as any)[s.key] ?? 0));
    const dataPoints = values.map((v, i) => getPoint(i, (v / maxVal) * maxR));
    const dataPath = dataPoints.map(p => `${p.x},${p.y}`).join(' ');

    return (
        <div className="bg-slate-900 border-2 border-slate-800 rounded-4xl p-5 shadow-xl">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 text-center">六維屬性總覽</p>
            <svg viewBox="0 0 300 300" className="w-full max-w-[280px] mx-auto">
                {/* 背景網格 */}
                {gridPaths.map((pts, i) => (
                    <polygon key={i} points={pts} fill="none" stroke="rgba(148,163,184,0.1)" strokeWidth="1" />
                ))}
                {/* 軸線 */}
                {RADAR_STATS.map((_, i) => {
                    const p = getPoint(i, maxR);
                    return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(148,163,184,0.08)" strokeWidth="1" />;
                })}
                {/* 資料區域 */}
                <polygon points={dataPath} fill="rgba(249,115,22,0.15)" stroke="#f97316" strokeWidth="2" />
                {/* 資料點 */}
                {dataPoints.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r="4" fill={RADAR_STATS[i].color} stroke="#0f172a" strokeWidth="2" />
                ))}
                {/* 標籤 */}
                {RADAR_STATS.map((s, i) => {
                    const p = getPoint(i, maxR + 22);
                    return (
                        <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
                            className="text-[10px] font-black fill-slate-400">
                            {s.label}
                        </text>
                    );
                })}
                {/* 數值 */}
                {RADAR_STATS.map((s, i) => {
                    const p = getPoint(i, maxR + 36);
                    return (
                        <text key={`v${i}`} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
                            className="text-[9px] font-bold" fill={s.color}>
                            {values[i]}
                        </text>
                    );
                })}
            </svg>
        </div>
    );
}

interface StatsTabProps {
    userData: CharacterStats;
}

export function StatsTab({ userData }: StatsTabProps) {

    const displayAge = userData.Birthday
        ? Math.floor((Date.now() - new Date(userData.Birthday).getTime()) / (365.25 * 24 * 3600 * 1000))
        : null;

    return (
        <div className="space-y-8 animate-in zoom-in-95 duration-500 mx-auto text-center">
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-yellow-900/40 to-slate-900 border-2 border-yellow-500/20 p-6 rounded-4xl shadow-2xl text-center flex flex-col items-center justify-center">
                    <Coins className="text-yellow-500 mb-2" size={24} />
                    <span className="text-4xl font-black text-yellow-500 mb-1">{userData.Coins || 0}</span>
                    <p className="text-[10px] text-yellow-500/70 font-black uppercase tracking-[0.2em]">天庭金幣餘額</p>
                </div>

                <div className="bg-gradient-to-br from-sky-950/40 to-slate-900 border-2 border-white/5 p-6 rounded-4xl shadow-2xl text-center flex flex-col items-center justify-center">
                    <Zap className="text-sky-400 mb-2" size={24} />
                    <span className="text-4xl font-black text-sky-400 mb-1">{userData.EnergyDice || 0}</span>
                    <p className="text-[10px] text-sky-400/70 font-black uppercase tracking-[0.2em]">能量骰子</p>
                </div>

            </div>

            {/* Birthday card — read-only, set by admin via roster import */}
            <div className="bg-slate-900 border-2 border-slate-800 p-5 rounded-4xl shadow-xl text-left">
                <div className="flex items-center gap-2 mb-3">
                    <Cake size={16} className="text-pink-400" />
                    <span className="text-[10px] font-black text-slate-500 tracking-widest uppercase ml-1">生日（金剛杖資格驗證）</span>
                </div>
                <span className="text-white font-bold">
                    {userData.Birthday
                        ? `${userData.Birthday}（${displayAge} 歲）`
                        : <span className="text-slate-500">尚未設定</span>}
                </span>
            </div>

            <RadarChart userData={userData} />

            <div className="grid grid-cols-1 gap-5 text-center mx-auto">
                <StatCard label="神識 (Spirit)" value={userData.Spirit} icon={<Sparkles size={16} className="text-purple-400" />} color="bg-purple-500" />
                <StatCard label="根骨 (Physique)" value={userData.Physique} icon={<Shield size={16} className="text-red-400" />} color="bg-red-500" />
                <StatCard label="魅力 (Charisma)" value={userData.Charisma} icon={<Heart size={16} className="text-pink-400" />} color="bg-pink-500" />
                <StatCard label="悟性 (Savvy)" value={userData.Savvy} icon={<Brain size={16} className="text-blue-400" />} color="bg-blue-500" />
                <StatCard label="機緣 (Luck)" value={userData.Luck} icon={<Zap size={16} className="text-emerald-400" />} color="bg-emerald-500" />
                <StatCard label="潛力 (Potential)" value={userData.Potential} icon={<Trophy size={16} className="text-yellow-400" />} color="bg-yellow-500" />
            </div>
        </div>
    );
}
