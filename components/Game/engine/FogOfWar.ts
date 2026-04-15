// 迷霧系統 — Fog of War
// 0 = 未探索（全黑）, 0.5 = 已探索但不在視野（半透明）, 1 = 視野內（完全可見）

export class FogOfWar {
    private fog: number[][];
    private width: number;
    private height: number;
    public viewRadius = 4;
    public boosted = false;
    private boostTimer = 0;

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.fog = Array.from({ length: height }, () => Array(width).fill(0));
    }

    update(playerX: number, playerY: number, dt: number) {
        // 處理信心道具加成
        if (this.boosted) {
            this.boostTimer -= dt;
            if (this.boostTimer <= 0) {
                this.boosted = false;
                this.viewRadius = 4;
            }
        }

        // 把之前的可見區域降為已探索
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.fog[y][x] === 1) this.fog[y][x] = 0.5;
            }
        }

        // 計算當前視野（圓形）
        const r = this.viewRadius;
        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                if (dx * dx + dy * dy <= r * r) {
                    const fx = playerX + dx;
                    const fy = playerY + dy;
                    if (fx >= 0 && fx < this.width && fy >= 0 && fy < this.height) {
                        this.fog[fy][fx] = 1;
                    }
                }
            }
        }
    }

    getVisibility(x: number, y: number): number {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 0;
        return this.fog[y][x];
    }

    activateBoost(duration: number = 5) {
        this.boosted = true;
        this.boostTimer = duration;
        this.viewRadius = 8;
    }
}
