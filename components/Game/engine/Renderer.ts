// Canvas 像素風渲染器

import type { MazeMap } from './MapGenerator';
import type { Player } from './Player';
import type { FogOfWar } from './FogOfWar';

const TILE = 16; // 每格像素大小

const COLORS = {
    wall: '#1a2744',
    floor: '#2d4a3e',
    start: '#2d6a4f',
    exit: '#fbbf24',
    chest: '#b45309',
    trap: '#7c3aed',
    fog_full: 'rgba(10,15,30,0.95)',
    fog_half: 'rgba(10,15,30,0.55)',
    player: '#f97316',
    player_eye: '#ffffff',
    minimap_bg: 'rgba(0,0,0,0.6)',
    minimap_player: '#f97316',
    minimap_exit: '#fbbf24',
    hp_bg: '#1e293b',
    hp_bar: '#22c55e',
    hp_border: '#475569',
};

export class Renderer {
    private ctx: CanvasRenderingContext2D;
    private canvas: HTMLCanvasElement;
    private scale = 1;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.ctx.imageSmoothingEnabled = false; // 像素風：無模糊
    }

    resize(viewWidth: number, viewHeight: number) {
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = viewWidth * dpr;
        this.canvas.height = viewHeight * dpr;
        this.canvas.style.width = `${viewWidth}px`;
        this.canvas.style.height = `${viewHeight}px`;
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.ctx.imageSmoothingEnabled = false;
    }

    render(map: MazeMap, player: Player, fog: FogOfWar, viewW: number, viewH: number) {
        const ctx = this.ctx;

        // 計算可見格數
        const tilesX = Math.ceil(viewW / TILE) + 2;
        const tilesY = Math.ceil(viewH / TILE) + 2;

        // 鏡頭跟隨玩家（置中）
        const camX = player.x * TILE - viewW / 2 + TILE / 2;
        const camY = player.y * TILE - viewH / 2 + TILE / 2;

        const startTileX = Math.floor(camX / TILE);
        const startTileY = Math.floor(camY / TILE);
        const offsetX = -(camX % TILE);
        const offsetY = -(camY % TILE);

        // 清屏
        ctx.fillStyle = '#0a0f1e';
        ctx.fillRect(0, 0, viewW, viewH);

        // 繪製地圖 + 迷霧
        for (let dy = -1; dy < tilesY; dy++) {
            for (let dx = -1; dx < tilesX; dx++) {
                const tx = startTileX + dx;
                const ty = startTileY + dy;
                const screenX = dx * TILE + offsetX;
                const screenY = dy * TILE + offsetY;

                if (tx < 0 || tx >= map.width || ty < 0 || ty >= map.height) continue;

                const vis = fog.getVisibility(tx, ty);
                const tile = map.tiles[ty][tx];

                // 地板/牆壁
                if (tile === 0) {
                    ctx.fillStyle = COLORS.wall;
                    ctx.fillRect(screenX, screenY, TILE, TILE);
                    // 牆壁紋理
                    ctx.fillStyle = 'rgba(255,255,255,0.03)';
                    if ((tx + ty) % 2 === 0) ctx.fillRect(screenX + 2, screenY + 2, TILE - 4, TILE - 4);
                } else {
                    ctx.fillStyle = COLORS.floor;
                    ctx.fillRect(screenX, screenY, TILE, TILE);
                    // 地板紋理
                    ctx.fillStyle = 'rgba(255,255,255,0.02)';
                    ctx.fillRect(screenX + 1, screenY + 1, 2, 2);
                }

                // 特殊格
                if (tile === 2) { // 入口
                    ctx.fillStyle = COLORS.start;
                    ctx.fillRect(screenX + 2, screenY + 2, TILE - 4, TILE - 4);
                }
                if (tile === 3) { // 出口
                    ctx.fillStyle = COLORS.exit;
                    ctx.fillRect(screenX + 3, screenY + 3, TILE - 6, TILE - 6);
                    ctx.fillStyle = 'rgba(251,191,36,0.3)';
                    ctx.fillRect(screenX, screenY, TILE, TILE);
                }
                if (tile === 4 && vis > 0) { // 寶箱
                    ctx.fillStyle = COLORS.chest;
                    ctx.fillRect(screenX + 3, screenY + 4, TILE - 6, TILE - 7);
                    ctx.fillStyle = '#fbbf24';
                    ctx.fillRect(screenX + 6, screenY + 6, 4, 3);
                }
                if (tile === 5 && vis > 0) { // 陷阱
                    ctx.fillStyle = COLORS.trap;
                    ctx.globalAlpha = 0.3 + Math.sin(Date.now() / 300) * 0.15;
                    ctx.fillRect(screenX + 2, screenY + 2, TILE - 4, TILE - 4);
                    ctx.globalAlpha = 1;
                }

                // 迷霧覆蓋
                if (vis < 1) {
                    ctx.fillStyle = vis === 0 ? COLORS.fog_full : COLORS.fog_half;
                    ctx.fillRect(screenX, screenY, TILE, TILE);
                }
            }
        }

        // 繪製玩家
        const px = player.x * TILE - camX;
        const py = player.y * TILE - camY;
        // 身體
        ctx.fillStyle = COLORS.player;
        ctx.fillRect(px + 3, py + 3, TILE - 6, TILE - 6);
        // 眼睛（根據朝向）
        ctx.fillStyle = COLORS.player_eye;
        if (player.facing === 'up') { ctx.fillRect(px + 5, py + 4, 2, 2); ctx.fillRect(px + 9, py + 4, 2, 2); }
        if (player.facing === 'down') { ctx.fillRect(px + 5, py + 9, 2, 2); ctx.fillRect(px + 9, py + 9, 2, 2); }
        if (player.facing === 'left') { ctx.fillRect(px + 3, py + 6, 2, 2); ctx.fillRect(px + 3, py + 9, 2, 2); }
        if (player.facing === 'right') { ctx.fillRect(px + 11, py + 6, 2, 2); ctx.fillRect(px + 11, py + 9, 2, 2); }

        // ── UI 層 ──

        // 小地圖（左上）
        const mmScale = 3;
        const mmW = map.width * mmScale;
        const mmH = map.height * mmScale;
        const mmX = 8;
        const mmY = 8;
        ctx.fillStyle = COLORS.minimap_bg;
        ctx.fillRect(mmX - 2, mmY - 2, mmW + 4, mmH + 4);
        for (let y = 0; y < map.height; y++) {
            for (let x = 0; x < map.width; x++) {
                const v = fog.getVisibility(x, y);
                if (v === 0) continue;
                const t = map.tiles[y][x];
                if (t === 0) ctx.fillStyle = 'rgba(100,116,139,0.4)';
                else if (t === 3) ctx.fillStyle = COLORS.minimap_exit;
                else ctx.fillStyle = 'rgba(148,163,184,0.3)';
                ctx.fillRect(mmX + x * mmScale, mmY + y * mmScale, mmScale, mmScale);
            }
        }
        // 玩家位置
        ctx.fillStyle = COLORS.minimap_player;
        ctx.fillRect(mmX + player.x * mmScale - 1, mmY + player.y * mmScale - 1, mmScale + 2, mmScale + 2);

        // HP 條（右上）
        const hpW = 80;
        const hpH = 10;
        const hpX = viewW - hpW - 12;
        const hpY = 12;
        ctx.fillStyle = COLORS.hp_bg;
        ctx.fillRect(hpX, hpY, hpW, hpH);
        ctx.fillStyle = COLORS.hp_bar;
        ctx.fillRect(hpX + 1, hpY + 1, (hpW - 2) * (player.hp / player.maxHp), hpH - 2);
        ctx.strokeStyle = COLORS.hp_border;
        ctx.lineWidth = 1;
        ctx.strokeRect(hpX, hpY, hpW, hpH);
        // HP 文字
        ctx.fillStyle = '#ffffff';
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`HP ${player.hp}/${player.maxHp}`, hpX + hpW / 2, hpY + hpH - 2);
        ctx.textAlign = 'start';
    }
}
