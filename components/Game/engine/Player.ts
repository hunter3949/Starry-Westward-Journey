// 玩家角色邏輯

import type { Direction } from './Input';
import type { MazeMap, TileType } from './MapGenerator';

export class Player {
    x: number;
    y: number;
    facing: Direction = 'down';
    hp = 100;
    maxHp = 100;
    items: string[] = [];
    private moveTimer = 0;
    private moveInterval = 0.15; // 秒/格
    stayTimer = 0; // 原地停留計時

    constructor(startX: number, startY: number) {
        this.x = startX;
        this.y = startY;
    }

    update(dir: Direction, map: MazeMap, dt: number): { moved: boolean; tile: TileType } {
        this.moveTimer -= dt;

        if (!dir) {
            this.stayTimer += dt;
            return { moved: false, tile: map.tiles[this.y][this.x] };
        }

        this.stayTimer = 0;

        if (this.moveTimer > 0) return { moved: false, tile: map.tiles[this.y][this.x] };

        this.facing = dir;
        let nx = this.x;
        let ny = this.y;

        if (dir === 'up') ny--;
        if (dir === 'down') ny++;
        if (dir === 'left') nx--;
        if (dir === 'right') nx++;

        // 碰撞偵測
        if (nx >= 0 && nx < map.width && ny >= 0 && ny < map.height && map.tiles[ny][nx] !== 0) {
            this.x = nx;
            this.y = ny;
            this.moveTimer = this.moveInterval;
            return { moved: true, tile: map.tiles[ny][nx] };
        }

        return { moved: false, tile: map.tiles[this.y][this.x] };
    }
}
