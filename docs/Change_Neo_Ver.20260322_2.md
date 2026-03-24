# 版本更新說明 — 2026/03/22（續更）

**基礎版本**：`ce1c2f7`
**更新日期**：2026-03-22
**編輯者**：Neo Huang

---

## 本次更新內容

### 一、任務管理模組（後台 → 任務管理）

#### f. 主線任務排程重構
- 移除「全域修行設定」獨立區塊（可編輯的 TopicQuestTitle / 修為 / 金幣）
- 保留並重構「主線任務排程列表」，介面顯示順序由上至下：
  1. **當前主線任務（唯讀）**：顯示目前套用中的排程項目（主標題、任務名稱、任務說明、修為/金幣/開始日期）
  2. **排程列表（可編輯）**：進行中任務僅顯示「當前」badge，**不顯示套用或刪除按鈕**（唯讀保護）
  3. **新增排程**：含全部新欄位（見下方 g）
  4. **歷史排程紀錄**：沿用原 TopicHistory 紀錄

#### g. 新增主線任務排程欄位
- 新增排程時新增三個欄位：
  | 欄位 | 對應資料 | 說明 |
  |------|----------|------|
  | 主標題 | `TopicQuestTitle` | 顯示於主畫面大標題 |
  | 任務名稱 | `MainQuestEntry.title` | UI 短名稱（必填）|
  | 任務說明 | `MainQuestEntry.description` | 詳細描述（選填）|
- `MainQuestEntry` 介面新增 `topicTitle?: string` 與 `description?: string`
- `SystemSettings` 介面新增 `TopicQuestDescription?: string`
- 套用排程時同步更新 `TopicQuestTitle`、`TopicQuestDescription`
- 自動套用邏輯（`page.tsx` useEffect）同步寫入 `TopicQuestDescription`

---

### 二、臨時加分任務管理

#### 新增修為 & 金幣獨立編輯
- **新增任務**表單增加「金幣」欄位（空白 = 自動 reward × 10%）
- **現有任務列表**每筆顯示修為 + 金幣 badge（金幣未設定時顯示自動計算值）
- 點擊 ✏️ 圖示展開內聯編輯列，可獨立修改修為與金幣，按「儲存」即時更新 DB
- **DB 變更**：`temporaryquests` 新增 nullable `coins` 欄位
  - Migration 檔：`supabase/migrations/20260322_add_tempquest_coins.sql`
- 打卡邏輯（`quest.ts`）：`quest.coins` 有值時直接使用，否則沿用 `reward × 10%`
- `Quest` 介面新增 `coins?: number`

---

### 三、後台參數管理

#### 所有 section 預設為閉合
- `BasicParamsSection`、`DailyQuestConfigSection`、`GameItemConfigSection`、`AchievementConfigSection`、`RoleConfigSection`、`QuestRoleSection`、`CardMottoSection` 初始狀態全部改為 `collapsed = true`

#### 新增「加分副本管理」section（定課管理下方）
- 管理打卡任務標題關鍵字觸發的額外骰子獎勵規則
- 每條規則包含：副本名稱、觸發關鍵字（逗號或頓號分隔）、骰子類型（⚡ 能量骰 / ✨ 黃金骰）、數量、啟用狀態
- 支援新增、編輯、刪除、啟用/停用、套用預設規則
- 預設 4 條規則（與舊版硬編碼邏輯等效）：

  | 副本名稱 | 觸發關鍵字 | 骰子獎勵 |
  |----------|-----------|---------|
  | 家人互動親證 | 小天使通話、與家人互動、親證圓夢 | ⚡ +1 能量骰 |
  | 參加心成活動 | 心成、同學會、定聚 | ⚡ +2 能量骰 |
  | 傳愛分數 | 傳愛 | ⚡ +1 能量骰 |
  | 大會主題活動 | 主題親證、會長交接、大會 | ✨ +1 黃金骰 |

- 規則儲存至 `SystemSettings.BonusQuestConfig`（JSON）
- `quest.ts` 每次打卡時從 DB 讀取規則，fallback 到上述預設值
- 新增 `BonusQuestRule` 型別至 `types/index.ts`
- `SystemSettings` 介面新增 `BonusQuestConfig?: string`

---

### 四、版面調整（指揮所 / 指揮部）

#### a. 小隊長指揮所 — 區塊排列順序調整
新排列順序（由上至下）：

> **AI 隊務分析** → **設定小隊名稱**（放回 header 卡片，與大隊長一致）→ **本週推薦定課抽籤** → **傳愛分數審核（小隊長初審）** → **罰款管理** → **任務角色指派**

- `設定小隊名稱` 從獨立 section 移回 header 卡片底部（border-t 分隔線下），與大隊長「設定大隊名稱」位置一致

#### b. 大隊長指揮部 — 所轄小隊加框
- 「所轄小隊」區塊以 `bg-slate-900 border-2 border-rose-500/20 rounded-4xl` 卡片包住，視覺上與其他區塊明確區隔

#### c. 所轄小隊 — 隊員活躍狀態顯示
- 每位隊員名稱旁顯示活躍狀態 badge：
  - 🟢 **活躍**（`text-emerald-400`）
  - ⚫ **沉寂**（`text-slate-500`）
- 判斷邏輯與後台儀表板相同：`lastCheckIn` >= 邏輯今日 − 2 天（邏輯今日 = 12:00 前算前一天的 12:00）
- 沉寂者名字顯示為灰色

#### d. 所轄小隊 — 小隊活躍率
- 每條小隊概覽列（隊長名旁）顯示本小隊活躍率百分比，例：`活躍率 71%`
- 顏色依閾值：≥70% 綠、40-69% 黃、<40% 紅
- 活躍率計算：`活躍人數 / 小隊總人數 × 100%`

---

## 資料庫異動

| 異動 | 說明 |
|------|------|
| `temporaryquests.coins` | 新增 nullable INTEGER 欄位 |
| `SystemSettings.BonusQuestConfig` | 新 key，儲存 `BonusQuestRule[]` JSON |
| `SystemSettings.TopicQuestDescription` | 新 key，儲存主線任務說明 |

---

## 異動檔案清單

| 檔案 | 說明 |
|------|------|
| `types/index.ts` | 新增 `BonusQuestRule`、擴充 `Quest.coins`、`MainQuestEntry`、`SystemSettings` |
| `app/page.tsx` | 主線任務自動套用邏輯、資料載入欄位、handleUpdateTempQuest |
| `app/actions/quest.ts` | 加分副本規則改為 DB 讀取，新增 questCoins 參數 |
| `app/actions/admin.ts` | （沿用，無異動） |
| `components/Admin/AdminDashboard.tsx` | 主線任務 UI 重構、臨時任務編輯、params 閉合、加分副本管理 |
| `components/Tabs/CaptainTab.tsx` | 區塊排序調整、設定小隊名稱移回 header |
| `components/Tabs/CommandantTab.tsx` | 所轄小隊加框、活躍率、隊員活躍狀態 |
| `supabase/migrations/20260322_add_tempquest_coins.sql` | 新增 `temporaryquests.coins` 欄位 |
