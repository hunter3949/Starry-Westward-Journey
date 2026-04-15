# GBA 風格 RPG 迷宮遊戲 — 五毒西遊

> 嵌入開運西遊系統，GBA 像素風俯視 RPG，五毒對應五張迷宮地圖
> 構圖：16:9 直式（手機優先）
> 技術：HTML Canvas + TypeScript，不需額外套件

---

## 世界觀

西遊五毒地圖，每張迷宮對應一種毒性，玩家必須通過迷宮的考驗才能「解毒」。

| 毒 | 地點 | 環境特徵 | 考驗 |
|---|------|---------|------|
| **貪** | 盤絲洞 | 黏人絲網、誘惑溫泉、金銀財寶 | 捨棄財色 |
| **嗔** | 火焰山 / 火雲洞 | 熔岩河流、火山灰、紅孩兒火雲 | 情緒平定 |
| **痴** | 小雷音寺 | 華麗假佛殿、紅眼假佛像、幻象 | 辨別真偽 |
| **慢** | 五指山 | 五根巨石柱、險峻山路、雲霧 | 謙卑忍耐 |
| **疑** | 黑松林 | 密林濃霧、隨機變換路徑、真假分身 | 信心堅定 |

---

## Phase 1：單人迷宮 Prototype

> 目標：一張可玩的迷宮 + 基本移動 + 迷霧系統
> 地圖選擇：黑松林（迷霧之森）— 最能展示核心機制

### 1-1. 基礎框架
- [ ] 新增「迷宮」Tab（`/maze`），紫色圖示
- [ ] Canvas 元件（`components/Game/MazeGame.tsx`）
- [ ] 16:9 直式構圖，全螢幕模式
- [ ] 像素風渲染（整數縮放，無模糊）

### 1-2. 地圖系統
- [ ] 迷宮自動生成演算法（DFS 或 Prim）
- [ ] Tile-based 地圖（牆壁、地板、入口、出口）
- [ ] 像素 Tileset（先用純色塊 + 邊框，後期替換素材圖）
- [ ] 地圖尺寸：約 20×30 格（直式）

### 1-3. 玩家移動
- [ ] 像素角色（16×16 或 32×32）
- [ ] 桌機：方向鍵 / WASD
- [ ] 手機：虛擬搖桿（左下角半透明 D-pad）
- [ ] 碰撞偵測（不能穿牆）
- [ ] 角色行走動畫（4 方向 × 2-3 幀）

### 1-4. 迷霧系統（Fog of War）
- [ ] 半透明像素霧氣圖層覆蓋整個地圖
- [ ] 玩家周圍 3-4 格範圍可見（圓形視野）
- [ ] 走過的路保留部分可見度（探索記憶）
- [ ] 「信心」道具：暫時撥開更大範圍霧氣（5 秒）

### 1-5. 黑松林特殊機制
- [ ] 路徑陷阱：多條分岔路
- [ ] 原地停留超過 5 秒 → 正確路消失 + 出現敵人
- [ ] 真假分身：遇到兩個一模一樣的 NPC，選錯觸發戰鬥

### 1-6. UI
- [ ] 左上：小地圖（已探索區域）
- [ ] 右上：HP 條 + 道具欄
- [ ] 下方：虛擬搖桿 + 互動按鈕
- [ ] GBA 風格 UI 框（深藍漸層邊框）

---

## Phase 2：戰鬥系統 + 五張地圖

### 2-1. 回合制戰鬥
- [ ] 觸發方式：走到怪物格 / 陷阱觸發 / 選錯分身
- [ ] 戰鬥畫面：切換到戰鬥場景（像素風怪物 vs 玩家）
- [ ] 指令選單：攻擊 / 防禦 / 技能 / 道具 / 逃跑
- [ ] 怪物 AI：簡單隨機行為
- [ ] 戰鬥動畫：攻擊閃爍、傷害數字跳出
- [ ] 勝利：獲得道具 / 開路
- [ ] 失敗：回到迷宮入口重試

### 2-2. 角色技能（對應五大角色）
| 角色 | 技能 | 迷宮效果 |
|------|------|---------|
| 孫悟空 | 火眼金睛 | 識破幻象（小雷音寺假佛像 / 黑松林真假分身） |
| 豬八戒 | 天罡三十六變 | 變化繞過陷阱 |
| 沙悟淨 | 降妖杖 | 淨化毒霧區域 |
| 白龍馬 | 龍行千里 | 移動速度加倍 5 秒 |
| 唐三藏 | 般若波羅蜜 | 全隊回血 |

### 2-3. 五張地圖獨立機制

#### 盤絲洞（貪）
- [ ] 蜘蛛絲陷阱：踩到減速 3 秒
- [ ] 溫泉誘惑：停留回血但會被困住
- [ ] 金銀散落：撿起來會觸發蜘蛛精 Boss
- [ ] Boss：盤絲大仙（纏絲攻擊，需破絲才能傷害）

#### 火焰山（嗔）
- [ ] 熔岩河流：碰到扣 HP
- [ ] 火山灰粒子效果：遮擋視線
- [ ] 地板隨機噴火（2 秒預警紅光）
- [ ] Boss：紅孩兒（三昧真火，需「定風珠」抵擋）

#### 小雷音寺（痴）
- [ ] 幻象層：透明疊加效果，真假難辨
- [ ] 假佛像：互動後觸發戰鬥
- [ ] 真佛像：互動後回血 + 開路
- [ ] Boss：黃眉大王（金鈸陣，需在限時內找到破陣點）

#### 五指山（慢）
- [ ] 垂直攀登地圖（由下往上）
- [ ] 落石機制：需要閃避
- [ ] 體力條：攀爬消耗體力，需要在平台休息
- [ ] Boss：無（考驗耐力，登頂即通關）

#### 黑松林（疑）— Phase 1 已完成
- [ ] 迷霧 + 路徑變換 + 真假分身（Phase 1 已做）
- [ ] Boss：六耳獼猴（跟玩家一模一樣，需要靠隊友辨認）

### 2-4. 寶箱系統
- [ ] 散落在迷宮中
- [ ] 內容：回血藥、信心道具、地圖碎片、Boss 鑰匙
- [ ] Mimic 機率（假寶箱，觸發戰鬥）

### 2-5. 地圖選擇畫面
- [ ] 世界地圖總覽（五個區域圖示）
- [ ] 已通關 / 未通關標記
- [ ] 各地圖最佳通關時間記錄

---

## Phase 3：小隊即時互動

### 3-1. 即時同步
- [ ] Supabase Realtime Channel（每個迷宮一個 channel）
- [ ] 同步資料：玩家位置、方向、狀態（戰鬥中/探索中）
- [ ] 更新頻率：200ms（5 FPS 位置同步）

### 3-2. 隊友顯示
- [ ] 同小隊成員在地圖上顯示為半透明角色
- [ ] 頭上顯示名字
- [ ] 不同角色不同像素造型

### 3-3. 互動功能
- [ ] 靠近隊友可「呼喊」（發送表情符號）
- [ ] 隊長可「集合」（所有人傳送到隊長位置）
- [ ] 協力機關：需要 2 人同時站在不同開關上才能開門
- [ ] Boss 戰可邀請隊友加入（多人回合制）

### 3-4. 聊天泡泡
- [ ] 像素風對話框
- [ ] 預設快捷訊息（「這邊！」「小心！」「等等我」「Boss 在這」）
- [ ] 自由輸入（限 20 字）

---

## Phase 4：系統整合

### 4-1. 取代「啟動冒險」按鈕
- [ ] 「啟動冒險」→ 進入迷宮選擇畫面
- [ ] 消耗能量骰子進入（1 骰 = 1 次探險）
- [ ] 或改為每日免費 1 次 + 骰子加次

### 4-2. 獎勵連動
- [ ] 通關迷宮 → 獲得修為 + 金幣
- [ ] 每張地圖首次通關額外獎勵
- [ ] Boss 擊敗 → 成就解鎖
- [ ] 寶箱道具可帶回主系統（能量骰、金幣等）
- [ ] 通關記錄寫入 TransactionLog

### 4-3. 進度存檔
- [ ] Supabase 存檔：當前地圖、位置、已探索區域、道具
- [ ] 離開迷宮自動存檔
- [ ] 下次進入從存檔點繼續

### 4-4. 後台管理
- [ ] 迷宮設定：開關各地圖、調整難度
- [ ] 獎勵設定：通關修為/金幣可調
- [ ] 統計：各地圖通關率、平均通關時間

---

## 素材清單

### 像素圖（AI 生成或手繪）

**角色（32×32，4 方向 × 3 幀動畫）：**
- [ ] 孫悟空
- [ ] 豬八戒
- [ ] 沙悟淨
- [ ] 白龍馬
- [ ] 唐三藏

**地圖 Tileset（16×16 每格）：**
- [ ] 通用：地板、牆壁、門、寶箱、階梯
- [ ] 盤絲洞：蛛網地板、溫泉、絲線牆
- [ ] 火焰山：熔岩、岩石、火焰噴口
- [ ] 小雷音寺：金磚、佛像、幻象特效
- [ ] 五指山：山石、雲霧、攀爬面
- [ ] 黑松林：樹木、濃霧、分岔路標

**怪物（32×32 或 48×48）：**
- [ ] 蜘蛛精（盤絲洞）
- [ ] 火焰怪 / 紅孩兒（火焰山）
- [ ] 假佛兵 / 黃眉大王（小雷音寺）
- [ ] 落石精（五指山）
- [ ] 樹妖 / 六耳獼猴（黑松林）

**UI：**
- [ ] GBA 風格邊框（深藍漸層）
- [ ] HP/MP 條
- [ ] 戰鬥選單框
- [ ] 對話框
- [ ] 虛擬搖桿

### AI 生成 Prompt（已定義）

**盤絲洞：**
```
Pixel art, vertical 9:16 mobile game map. Pansi Cave scene from Journey to the West. Purple glowing cave walls covered in thick, sticky white spider webs. In the center, a steaming hot spring with floating gold treasures. A small pixel Monk trapped in silk threads. Top-down isometric view, 16-bit retro aesthetic.
```

**火焰山：**
```
Pixel art, vertical 9:16 mobile game map. Flaming Mountain scene. Intense red and orange lava rivers, volcanic ash particles in the air. Rocky platforms surrounded by fire. A young demon (Red Boy) standing on a fire cloud. Retro GBA game UI, high contrast, heat haze effect, 16-bit pixel style.
```

**小雷音寺：**
```
Pixel art, vertical 9:16 mobile game map. Little Leiyin Temple. Golden majestic temple architecture but with a distorted, eerie atmosphere. Fake Buddha statues with glowing red eyes. Ornate pixel patterns, gold and crimson color palette. Illusionary transparent layers, 16-bit game asset style.
```

**五指山：**
```
Pixel art, vertical 9:16 mobile game map. Five Finger Mountain (Two-Boundary Mountain). Five massive stone pillars resembling a giant hand reaching to the clouds. A narrow, steep winding path. Atmospheric height, distant mist. A tiny gold seal on top of the mountain. Epic scale in 16-bit pixel art style.
```

**黑松林：**
```
Pixel art, vertical 9:16 mobile game map. Black Pine Forest. Dense dark green pine trees with heavy "Fog of War" overlay. Semi-transparent white mist covering the edges. Multiple branching paths leading into darkness. Two identical pixel Monkey Kings standing at a crossroad. Mysterious and haunting 16-bit forest environment.
```

### 角色 Spritesheet（32×32，4 方向動畫）

> 共通風格綴詞：`pixel art, 16-bit, GBA style, character spritesheet, front view, back view, side view, 4-way movement, white background, vibrant colors`

#### 核心五人小隊（玩家角色）

| 角色 | Prompt |
|------|--------|
| **孫悟空** | `Monkey King Sun Wukong, pixel art, wearing golden armor and red tiger-skin skirt, holding a golden staff, heroic pose, 32x32 sprite, 16-bit GBA style.` |
| **唐三藏** | `Xuanzang Monk, pixel art, wearing red and gold kasaya robe, holding a Buddhist staff, calm expression, 32x32 sprite, retro RPG style.` |
| **豬八戒** | `Zhu Bajie, pixel art, pig-headed humanoid, black priest robe, carrying a nine-toothed rake, bulky body, 32x32 sprite, 16-bit GBA style.` |
| **沙悟淨** | `Sha Wujing, pixel art, blue skin, red beard, wearing a skull necklace, holding a crescent shovel, 32x32 sprite, retro pixel game art.` |
| **白龍馬** | `White Dragon Horse, pixel art, elegant white horse with dragon horns, blue saddle, 32x32 sprite, 16-bit GBA style.` |

#### 五毒關卡 Boss（反派角色）

| 關卡（毒） | Boss | Prompt |
|-----------|------|--------|
| **盤絲洞（貪）** | 蜘蛛精 | `Spider Queen Boss, pixel art, half-human half-spider, purple and black color scheme, 48x48 large sprite, menacing pose, 16-bit GBA boss.` |
| **火雲洞（嗔）** | 紅孩兒 | `Red Boy (Hong Hai Er), pixel art, young boy demon, holding a fire spear, standing on fire clouds, red theme, 32x32 sprite, 16-bit GBA style.` |
| **小雷音寺（痴）** | 黃眉大王 | `Yellow Brows (Huang Mei), pixel art, monk robe with evil smile, holding two golden cymbals, 48x48 large sprite, 16-bit retro boss aesthetic.` |
| **黑松林（疑）** | 六耳獼猴 | `Six-Eared Macaque, pixel art, looks identical to Sun Wukong but with dark shadow aura and six ears, holding a dark staff, 32x32 sprite.` |
| **五指山（慢）** | 金封印 | `The Great Seal, pixel art, a magical floating golden paper seal with glowing Sanskrit characters, divine aura, 32x32 object sprite.` |

#### 輔助角色（NPC）

| 角色 | Prompt |
|------|--------|
| **觀音菩薩** | `Guanyin Bodhisattva, pixel art, white robe, sitting on a lotus, holding a willow branch, glowing divine halo, 48x48 sprite, serene style.` |
| **土地公** | `Earth Deity NPC, short old man with white beard, holding a wooden cane, classic 16-bit RPG NPC style, 32x32 sprite.` |

### 共通風格參數

所有素材生成時在 prompt 尾部加上：
```
pixel art, GBA style, 16-bit, vibrant colors, game interface, portrait orientation, 9:16 aspect ratio --v 6.0
```

---

## 技術架構

```
components/Game/
  MazeGame.tsx          — 主元件（Canvas + 遊戲循環）
  engine/
    GameEngine.ts       — 遊戲主循環（requestAnimationFrame）
    MapGenerator.ts     — 迷宮生成演算法
    Renderer.ts         — Canvas 像素渲染
    Player.ts           — 玩家狀態 + 移動邏輯
    Combat.ts           — 回合制戰鬥邏輯
    FogOfWar.ts         — 迷霧系統
    Input.ts            — 鍵盤 + 觸控輸入
  assets/
    tilesets/            — 地圖 Tileset PNG
    characters/          — 角色 Spritesheet PNG
    monsters/            — 怪物圖
    ui/                  — UI 框架圖
  maps/
    pansi-cave.ts       — 盤絲洞地圖設定
    flaming-mountain.ts — 火焰山地圖設定
    leiyin-temple.ts    — 小雷音寺地圖設定
    five-finger.ts      — 五指山地圖設定
    black-forest.ts     — 黑松林地圖設定
```

---

## 里程碑

| 階段 | 目標 | 依賴 |
|------|------|------|
| **Phase 1** | 黑松林可玩 prototype（移動 + 迷霧 + 陷阱） | 無 |
| **Phase 2** | 五張地圖 + 戰鬥 + 寶箱 | Phase 1 + 素材 |
| **Phase 3** | 小隊即時互動 | Phase 2 + Supabase Realtime |
| **Phase 4** | 系統整合 + 獎勵連動 | Phase 3 |
