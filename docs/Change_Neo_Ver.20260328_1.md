# 版本更新說明 — 2026/03/26 ～ 2026/03/28

**基礎版本**：`5b822ab`（接續 `Change_Neo_Ver.20260325_1.md`）
**更新日期**：2026-03-28
**編輯者**：Neo Huang

---

## 本次更新內容

### 一、開運大富翁模組（全新功能）

#### a. 資料表

新增 `BoardGameStats` 資料表（`supabase/migrations/20260325_add_board_game_stats.sql`）：

| 欄位 | 說明 |
|------|------|
| `user_id` | 玩家 UserID（主鍵） |
| `cash` | 現金餘額（僅遊戲內使用，與定課金幣無關） |
| `blessing` | 福報餘額（僅遊戲內使用） |

> 兩種貨幣獨立於主遊戲的 `Coins`／`GameGold`，三者互不影響。

#### b. 後台管理（AdminDashboard — 開運大富翁模組）

新增 `adminModule === 'boardgame'` 管理頁，放置於「任務管理」項目之後：

| 功能 | 說明 |
|------|------|
| 開啟／關閉遊戲模式 | `SystemSettings.BoardGameEnabled`；前台進入點依此切換 |
| 買匯率設定 | 福報→現金換匯比例（`BoardGameBuyRate`） |
| 賣匯率設定 | 現金→福報換匯比例（`BoardGameSellRate`） |
| 開啟人生歸零 | `BoardGameZeroEnabled`；前台換匯所顯示「人生歸零」按鍵 |
| 人生歸零倍率 | 現金 × N 倍（`BoardGameZeroCashMult`）、福報 × N 倍（`BoardGameZeroBlessingMult`） |

#### c. 前台進入流程

1. `BoardGameEnabled === 'true'` 時，使用者進入或重新整理頁面 → 跳出不可關閉的彈框
2. 彈框顯示「人生開運大富翁」，按鍵「點擊進入」
3. 進入 `BoardGameView` 全畫面模組

#### d. BoardGameView 介面（`components/BoardGame/BoardGameView.tsx`）

| 區塊 | 說明 |
|------|------|
| 姓名標籤 | 顯示自己的 `Name` |
| 小隊標籤 | 顯示 `SquadName` |
| 現金框 | 顯示 `BoardGameStats.cash` 餘額 |
| 福報框 | 顯示 `BoardGameStats.blessing` 餘額 |
| 福氣錢莊 | 原名「換匯所」；顯示買匯／賣匯比例，點開兩個欄位（現金、福報）＋確認換匯，附二次確認彈窗 |
| 人生歸零 | 僅在 `BoardGameZeroEnabled` 開啟時顯示；點擊依後台設定倍率直接放大現金與福報 |
| 場域格（8 格） | 兩行四列方形按鈕：智慧之門、肉身修煉場、靈魂揚升殿、心靈餐廳、智慧之門、無限打工所、創業之家、金融投資 |

#### e. Server Actions（`app/actions/boardGame.ts`）

| Function | 說明 |
|----------|------|
| `getBoardGameStats(userId)` | 讀取或初始化玩家的 cash / blessing |
| `exchangeCurrency(userId, from, amount)` | 依買匯／賣匯率換匯（含餘額驗證） |
| `performZeroReset(userId)` | 依後台倍率一次性放大 cash 與 blessing |

---

### 二、大隊長指揮部（CommandantTab）UI 修正

1. **傳愛申請終審外框格**：原本申請列表以鬆散形式呈現，現改用與「巔峰試煉管理」一致的外框卡片包覆：
   - 外框：`bg-slate-900 border-2 border-rose-500/20 rounded-4xl`
   - 標題列：`CheckCircle2` 圖示 + 標題文字並排（與 `Trophy` + 巔峰試煉管理同結構）
   - 子項目改為內縮顯示，底色 `bg-slate-800/60`
2. **Header 排版**：圖示與標題在同一行（`flex items-center gap-2`），副標題另起一行
3. **移除未使用變數**：`totalMembers`、`battalionLabel` 已清理

---

### 三、QR 掃碼成功彈框（Scanner & PeakTrialScanner）

兩個 QR 掃碼器（課程報到 `Scanner.tsx`、巔峰試煉 `PeakTrialScanner.tsx`）掃碼成功後改為全畫面彈框：

- 彈框顯示「＜使用者姓名＞ 掃碼成功」（大字）+ 綠色打勾圖示
- 必須按「確認」按鍵才會繼續掃碼（Cooldown 等待確認後才重置，防止連掃）
- 重複掃碼（已核銷）及錯誤情況維持原本 3 秒自動消失橫幅

---

### 四、後台主線任務排程列表可編輯

排程列表每一筆項目新增鉛筆（`Pencil`）編輯鍵：

- 當前進行中項目（`isActive`）也可編輯（僅不顯示「套用」與刪除）
- 點擊編輯鍵展開內聯表單：主題標籤、任務名稱、說明、修為、金幣、開始日期
- 「儲存變更」以 UPSERT 方式更新後自動依開始日期重新排序
- 「取消」按鍵不儲存，直接收起表單

---

## 異動檔案清單

| 檔案 | 說明 |
|------|------|
| `app/actions/boardGame.ts` | 新增，開運大富翁 server actions |
| `components/BoardGame/BoardGameView.tsx` | 新增，玩家主介面 |
| `components/Admin/AdminDashboard.tsx` | 新增開運大富翁模組；排程列表可編輯 |
| `app/page.tsx` | 接收 BoardGameEnabled 設定、進入彈框邏輯 |
| `components/Tabs/StatsTab.tsx` | 修正六維與罰金顯示條件（始終渲染） |
| `components/Tabs/CommandantTab.tsx` | 傳愛申請終審外框卡片；Header 排版修正；清理未使用變數 |
| `app/class/checkin/Scanner.tsx` | 掃碼成功改為全畫面彈框 |
| `components/PeakTrialScanner.tsx` | 掃碼成功改為全畫面彈框 |
| `types/index.ts` | 新增 BoardGame 相關 SystemSettings 欄位 |
| `supabase/migrations/20260325_add_board_game_stats.sql` | 新增 BoardGameStats 資料表 |
| `docs/BOARD_GAME.md` | 新增，記錄開運大富翁模組設計邏輯 |
