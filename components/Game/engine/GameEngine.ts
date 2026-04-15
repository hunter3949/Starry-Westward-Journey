// 遊戲主引擎 — 管理遊戲循環、狀態

import { generateMaze, type MazeMap } from './MapGenerator';
import { Player } from './Player';
import { FogOfWar } from './FogOfWar';
import { Renderer } from './Renderer';
import { InputManager } from './Input';

export type GameState = 'playing' | 'paused' | 'victory' | 'gameover';
export type GameEvent = { type: 'chest'; x: number; y: number } | { type: 'trap' } | { type: 'exit' } | { type: 'stay_too_long' };

export class GameEngine {
    map: MazeMap;
    player: Player;
    fog: FogOfWar;
    renderer: Renderer;
    input: InputManager;
    state: GameState = 'playing';
    events: GameEvent[] = [];

    private animFrame = 0;
    private lastTime = 0;
    private viewW = 0;
    private viewH = 0;
    private onEvent?: (event: GameEvent) => void;

    constructor(canvas: HTMLCanvasElement, onEvent?: (event: GameEvent) => void) {
        this.map = generateMaze(21, 31);
        this.player = new Player(this.map.start.x, this.map.start.y);
        this.fog = new FogOfWar(this.map.width, this.map.height);
        this.renderer = new Renderer(canvas);
        this.input = new InputManager();
        this.onEvent = onEvent;
    }

    resize(w: number, h: number) {
        this.viewW = w;
        this.viewH = h;
        this.renderer.resize(w, h);
    }

    start() {
        this.lastTime = performance.now();
        this.loop();
    }

    stop() {
        if (this.animFrame) cancelAnimationFrame(this.animFrame);
        this.input.destroy();
    }

    newGame() {
        this.map = generateMaze(21, 31);
        this.player = new Player(this.map.start.x, this.map.start.y);
        this.fog = new FogOfWar(this.map.width, this.map.height);
        this.state = 'playing';
    }

    private loop = () => {
        const now = performance.now();
        const dt = Math.min((now - this.lastTime) / 1000, 0.1); // 秒，最大 100ms
        this.lastTime = now;

        if (this.state === 'playing') {
            this.update(dt);
        }

        this.renderer.render(this.map, this.player, this.fog, this.viewW, this.viewH);
        this.animFrame = requestAnimationFrame(this.loop);
    };

    private update(dt: number) {
        const dir = this.input.direction;
        const { moved, tile } = this.player.update(dir, this.map, dt);

        // 更新迷霧
        this.fog.update(this.player.x, this.player.y, dt);

        // 碰到出口
        if (tile === 3) {
            this.state = 'victory';
            this.onEvent?.({ type: 'exit' });
        }

        // 碰到寶箱
        if (moved && tile === 4) {
            this.map.tiles[this.player.y][this.player.x] = 1; // 寶箱變地板
            this.onEvent?.({ type: 'chest', x: this.player.x, y: this.player.y });
        }

        // 碰到陷阱點
        if (moved && tile === 5) {
            this.onEvent?.({ type: 'trap' });
        }

        // 原地停留太久（黑松林機制：5 秒）
        if (this.player.stayTimer > 5) {
            this.player.stayTimer = 0;
            this.player.hp = Math.max(0, this.player.hp - 10);
            this.onEvent?.({ type: 'stay_too_long' });
            if (this.player.hp <= 0) {
                this.state = 'gameover';
            }
        }
    }
}
