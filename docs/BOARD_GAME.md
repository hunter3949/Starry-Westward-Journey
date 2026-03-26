# 開運大富翁 — 設計文件

**模組名稱**：開運大富翁（Board Game Module）
**後台入口**：AdminDashboard → 開運大富翁（`adminModule === 'monopoly'`）
**建立日期**：2026-03-25
**狀態**：開發中（v0.1 基礎介面完成）

---

## 目錄

1. [模組概述](#1-模組概述)
2. [資料庫結構](#2-資料庫結構)
3. [貨幣系統](#3-貨幣系統)
4. [換匯所](#4-換匯所)
5. [前台介面](#5-前台介面)
6. [後台管理介面](#6-後台管理介面)
7. [Server Actions](#7-server-actions)
8. [SystemSettings 設定項](#8-systemsettings-設定項)

---

## 1. 模組概述

開運大富翁是一個與主遊戲（定課系統）**完全獨立**的小遊戲模組。由管理員從後台開啟後，玩家登入或重新整理時會強制跳出入場彈框，點擊「點擊進入」後進入遊戲界面。

**獨立性**：
- 現金（💰）與福報（🌸）**僅在此遊戲內流通**，與定課系統的修為（Exp）、金幣（Coins）、戰鬥金幣（GameGold）完全無關
- 不影響主遊戲任何資料

---

## 2. 資料庫結構

### `BoardGameStats`

| 欄位 | 型別 | 說明 |
|------|------|------|
| `user_id` | TEXT PK | 玩家 UserID |
| `cash` | INTEGER | 現金餘額（預設 0） |
| `blessing` | INTEGER | 福報餘額（預設 0） |
| `updated_at` | TIMESTAMPTZ | 最後更新時間 |

```sql
CREATE TABLE IF NOT EXISTS "BoardGameStats" (
    user_id TEXT PRIMARY KEY,
    cash INTEGER NOT NULL DEFAULT 0,
    blessing INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE "BoardGameStats" DISABLE ROW LEVEL SECURITY;
```

遷移檔案：`supabase/migrations/20260325_add_board_game_stats.sql`

---

## 3. 貨幣系統

| 貨幣 | 圖示 | 說明 |
|------|------|------|
| 現金 | 💰 | 遊戲流通貨幣，可由福報兌換 |
| 福報 | 🌸 | 高價值貨幣，可兌換現金；來源待設計（如格子獎勵等） |

> 兩種貨幣都存於 `BoardGameStats`，不與主遊戲任何幣種混用。

---

## 4. 換匯所

- **換匯比率**：由管理員在後台設定（`SystemSettings.BoardGameExchangeRate`），預設 `10`，意為 1 福報 = 10 現金
- **支援雙向兌換**：
  - 福報 → 現金：花費 N 福報，獲得 `N × 比率` 現金
  - 現金 → 福報：花費 N 現金，獲得 `⌈N ÷ 比率⌉` 福報（向上取整計算成本）
- 兌換流程：輸入金額 → 預覽結果 → 點擊「確認換匯」→ 再次彈窗確認 → 執行

---

## 5. 前台介面

### 入場彈框（`app/page.tsx` 內聯）

- 觸發條件：`systemSettings.BoardGameEnabled === 'true' && userData && view === 'app' && !boardGameEntered`
- **不可關閉**（無 X 按鈕，無背景點擊關閉）
- 每次重新整理或重新登入都會再次彈出（`boardGameEntered` 為 React state，頁面 mount 時重置）
- 點擊「點擊進入」後呼叫 `getBoardGameStats` 載入貨幣資料，設定 `boardGameEntered = true`

### 遊戲主界面（`components/BoardGame/BoardGameView.tsx`）

全屏固定疊層（`z-[100]`），蓋在主畫面上方。

| 區塊 | 說明 |
|------|------|
| 姓名卡 | `userData.Name` |
| 小隊卡 | `LittleTeamNickName` 優先，fallback `LittleTeamLeagelName`，再 fallback「未分隊」 |
| 現金卡（全寬） | 顯示 `cash` 餘額 |
| 福報卡（全寬） | 顯示 `blessing` 餘額 |
| 換匯所 | 展開/收起；方向切換（福報↔現金）；輸入即預覽；確認送審 |

---

## 6. 後台管理介面

**位置**：`AdminDashboard` → 左側導覽「開運大富翁」

| 功能 | 說明 |
|------|------|
| **模式開關** | 開啟/關閉整個遊戲模組（`BoardGameEnabled`），切換後即時生效 |
| **換匯比率** | 設定「1 福報 = N 現金」（`BoardGameExchangeRate`），輸入後點「儲存比率」 |

---

## 7. Server Actions

**檔案**：`app/actions/boardGame.ts`

| Function | 說明 |
|----------|------|
| `getBoardGameStats(userId)` | 查詢玩家現金與福報餘額；無記錄時回傳 `{cash:0, blessing:0}` |
| `exchangeCurrency(userId, direction, amount, currentCash, currentBlessing, rate)` | 執行換匯，更新 `BoardGameStats`（UPSERT）；回傳成功/失敗及新餘額 |

---

## 8. SystemSettings 設定項

| 鍵名 | 型別 | 說明 |
|------|------|------|
| `BoardGameEnabled` | `'true'` \| `'false'` | 遊戲模式開關 |
| `BoardGameExchangeRate` | 數字字串 | 1 福報 = N 現金（預設 `'10'`） |

> 這兩個欄位已加入 `types/index.ts` 的 `SystemSettings` interface，並已加入 `app/page.tsx` 的 `setSystemSettings(...)` 載入區塊。

---

## 待開發功能

- [ ] 遊戲棋盤 UI（格子地圖）
- [ ] 骰子擲骰移動
- [ ] 格子事件（獲得/扣除現金 / 福報）
- [ ] 排行榜（現金、福報）
- [ ] 管理員發放 / 扣除貨幣
- [ ] 歷史交易紀錄
