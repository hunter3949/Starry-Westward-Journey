// 輸入系統 — 鍵盤 + 虛擬搖桿

export type Direction = 'up' | 'down' | 'left' | 'right' | null;

export class InputManager {
    private keys: Set<string> = new Set();
    private touchDir: Direction = null;
    private _interact = false;

    constructor() {
        if (typeof window === 'undefined') return;
        window.addEventListener('keydown', e => {
            this.keys.add(e.key);
            if (e.key === ' ' || e.key === 'Enter') this._interact = true;
        });
        window.addEventListener('keyup', e => this.keys.delete(e.key));
    }

    get direction(): Direction {
        if (this.touchDir) return this.touchDir;
        if (this.keys.has('ArrowUp') || this.keys.has('w') || this.keys.has('W')) return 'up';
        if (this.keys.has('ArrowDown') || this.keys.has('s') || this.keys.has('S')) return 'down';
        if (this.keys.has('ArrowLeft') || this.keys.has('a') || this.keys.has('A')) return 'left';
        if (this.keys.has('ArrowRight') || this.keys.has('d') || this.keys.has('D')) return 'right';
        return null;
    }

    get interact(): boolean {
        const v = this._interact;
        this._interact = false;
        return v;
    }

    setTouchDirection(dir: Direction) {
        this.touchDir = dir;
    }

    destroy() {
        // cleanup if needed
    }
}
