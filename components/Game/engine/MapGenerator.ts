// 迷宮生成器 — DFS (Depth-First Search) 演算法
// 0 = 牆壁, 1 = 地板, 2 = 入口, 3 = 出口, 4 = 寶箱, 5 = 陷阱(路徑變換點)

export type TileType = 0 | 1 | 2 | 3 | 4 | 5;

export interface MazeMap {
    width: number;
    height: number;
    tiles: TileType[][];
    start: { x: number; y: number };
    exit: { x: number; y: number };
}

export function generateMaze(cols: number = 21, rows: number = 31): MazeMap {
    // 確保奇數（迷宮演算法需要）
    const w = cols % 2 === 0 ? cols + 1 : cols;
    const h = rows % 2 === 0 ? rows + 1 : rows;

    // 初始化全牆壁
    const tiles: TileType[][] = Array.from({ length: h }, () => Array(w).fill(0));

    // DFS 挖掘
    const stack: [number, number][] = [];
    const startX = 1;
    const startY = 1;
    tiles[startY][startX] = 1;
    stack.push([startX, startY]);

    const directions = [
        [0, -2], // 上
        [0, 2],  // 下
        [-2, 0], // 左
        [2, 0],  // 右
    ];

    while (stack.length > 0) {
        const [cx, cy] = stack[stack.length - 1];

        // 找未訪問的鄰居
        const neighbors: [number, number, number, number][] = [];
        for (const [dx, dy] of directions) {
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx > 0 && nx < w - 1 && ny > 0 && ny < h - 1 && tiles[ny][nx] === 0) {
                neighbors.push([nx, ny, cx + dx / 2, cy + dy / 2]);
            }
        }

        if (neighbors.length > 0) {
            // 隨機選一個鄰居
            const [nx, ny, wx, wy] = neighbors[Math.floor(Math.random() * neighbors.length)];
            tiles[ny][nx] = 1;
            tiles[wy][wx] = 1;
            stack.push([nx, ny]);
        } else {
            stack.pop();
        }
    }

    // 額外打通一些牆壁讓迷宮不那麼狹窄（約 15% 隨機打通）
    for (let y = 2; y < h - 2; y++) {
        for (let x = 2; x < w - 2; x++) {
            if (tiles[y][x] === 0 && Math.random() < 0.15) {
                const adjFloors = [
                    tiles[y - 1]?.[x], tiles[y + 1]?.[x],
                    tiles[y]?.[x - 1], tiles[y]?.[x + 1],
                ].filter(t => t === 1).length;
                if (adjFloors >= 2) tiles[y][x] = 1;
            }
        }
    }

    // 設定入口和出口
    const start = { x: 1, y: 1 };
    const exit = { x: w - 2, y: h - 2 };
    tiles[start.y][start.x] = 2;
    tiles[exit.y][exit.x] = 3;

    // 散佈寶箱（5-8 個）
    const floorTiles: [number, number][] = [];
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            if (tiles[y][x] === 1) floorTiles.push([x, y]);
        }
    }
    const chestCount = 5 + Math.floor(Math.random() * 4);
    for (let i = 0; i < chestCount && floorTiles.length > 0; i++) {
        const idx = Math.floor(Math.random() * floorTiles.length);
        const [cx, cy] = floorTiles.splice(idx, 1)[0];
        tiles[cy][cx] = 4;
    }

    // 散佈陷阱點（3-5 個）
    const trapCount = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < trapCount && floorTiles.length > 0; i++) {
        const idx = Math.floor(Math.random() * floorTiles.length);
        const [cx, cy] = floorTiles.splice(idx, 1)[0];
        tiles[cy][cx] = 5;
    }

    return { width: w, height: h, tiles, start, exit };
}
