# 版本更新說明 — 2026/03/25

**基礎版本**：`cb64e6e`（接續 `Change_Neo_Ver.20260324_1.md`）
**更新日期**：2026-03-25
**編輯者**：Neo Huang

---

## 本次更新內容

### 一、巔峰試煉審核系統（PeakTrialReviews）— 全新功能

#### a. 新增資料表 `PeakTrialReviews`

| 欄位 | 說明 |
|------|------|
| `trial_id` + `battalion_name` | 複合唯一約束，同一大隊對同一活動只能一筆申請（UPSERT） |
| `own_participants` | 本隊出席人數（大隊長填報） |
| `cross_participants` | 跨隊出席人數（大隊長填報） |
| `reward_per_person` | 每位出席者可獲修為（系統自動計算） |
| `total_members` | 填報時的本大隊總人數（僅供參考） |
| `photo_data` | 大合照 base64 |
| `video_url` | 影片連結（選填，後期新增欄位） |
| `status` | `pending` / `approved` / `rejected` |

遷移檔案：
- `supabase/migrations/20260325_add_peak_trial_reviews.sql`
- `supabase/migrations/20260325_add_peak_trial_review_video_url.sql`

> **注意**：兩張 PeakTrials 相關資料表均已設 `DISABLE ROW LEVEL SECURITY`，避免 Supabase RLS 默認封鎖讀取。

#### b. 型別定義（`types/index.ts`）

新增 `PeakTrialReview` interface，欄位對應資料表結構，含 `video_url?: string`。

---

### 二、修為分配規則調整（核心邏輯變更）

#### 舊規則

修為池 ÷ 全體大隊成員人數 = 每人修為（不論是否出席）

#### 新規則

```
修為池 = min(本隊出席人數, 21) × 1,500 + min(跨隊出席人數, 21) × 1,050
每位【實際出席】的本大隊成員各獲得完整修為池
未出席或未報名者：0 修為
```

#### 後端邏輯（`app/actions/peakTrials.ts`）

- `approvePeakTrialReview`：改為查詢 `PeakTrialRegistrations` WHERE `battalion_name = 本大隊` AND `attended = true`，僅對出席者批次更新 `CharacterStats.Exp`
- 不再對全體大隊成員發放，確保「有參加才有修為」

---

### 三、新增 Server Actions（`app/actions/peakTrials.ts`）

| Function | 說明 |
|----------|------|
| `submitPeakTrialReview(data)` | 送審申請（UPSERT），儲存照片 base64 與影片連結 |
| `getTrialReviewStatus(trialId, battalionName)` | 查詢審核狀態，包含 `photo_data`、`video_url`（供前台預填） |
| `recalcPeakTrialReview(reviewId)` | 依目前實際報名資料重算 `own_participants`、`cross_participants`、`reward_per_person` |
| `listPeakTrialReviews(status?)` | 管理員取得所有審核申請，可過濾狀態 |
| `approvePeakTrialReview(reviewId, reviewedBy)` | 核准並發放修為（僅出席者） |
| `rejectPeakTrialReview(reviewId, reviewedBy, notes)` | 駁回，記錄原因 |

---

### 四、前台 PeakTrialTab 改版（`components/Tabs/PeakTrialTab.tsx`）

1. **移除重新整理按鈕**：Header 不再顯示 RefreshCw 按鈕，改為切換 Tab 時自動刷新
2. **Header 置中**：標題、說明文字統一置中對齊
3. **主辦大隊標籤前移**：「主辦：XXX大隊」改為顯示在活動標題右側的小標籤（Badge），不再另起一行
4. **預計修為獎勵框**（新增，位於 Header 與活動列表之間）：
   - 顯示「本大隊每人預計獲得 XXXX 修為（預計）」
   - 計算公式：`min(總報名人數, 21) × 1,500`（估算值）
   - 紅字說明：「＊請廣邀大隊夥伴一同參與＊」、「＊此為預計修為，待大會最終審核確認＊」
   - 僅在有開放活動時顯示
5. **未報名警示框**（新增，位於獎勵框下方）：
   - 條件：有開放活動但本人尚未報名任何活動
   - 顯示：「！！您未參與任何試煉，無法獲得修為，請即刻報名參與！！」（紅色邊框，文字自動縮小不超過一行）

---

### 五、大隊長指揮部增強（`components/Tabs/CommandantTab.tsx`）

#### a. 限制每位大隊長最多新增 1 場活動
- `created_by === userData.UserID` 已有活動時，「新增活動」按鈕自動隱藏

#### b. 統計及回報審核面板（新功能）

點擊「統計及回報審核」按鈕開啟面板：

- **修為統計格**：本隊參與人數 / 跨隊參與人數 / 每位參與者各獲得（預計）
  - 「每位參與者各獲得（預計）」改為紅字標示，強調為預計值，非全體均分
- **送審資料**：
  - 上傳大合照（必填）
  - 上傳影片連結（選填，新增欄位）
- **預填已送審資料**：重開審核面板時，自動從 `getTrialReviewStatus` 讀取已存的 `photo_data` 與 `video_url` 預填，無需重新上傳
- **重新送審**：不論 pending 或 rejected 狀態，皆可修改後重新送審（UPSERT 覆蓋）

---

### 六、管理員後台審核中心增強（`components/Admin/AdminDashboard.tsx`）

#### a. 自動刷新
- 切換至「審核中心」模組時自動重新載入 `ptReviews`（`useEffect` on `adminModule`）

#### b. 頂部操作列（審核中心 → 巔峰試煉審核區塊右上角）

| 按鈕 | 功能 |
|------|------|
| ↻ 重整 | 手動重新載入審核列表 |
| 🔄 重新計算修為 | 對所有 pending 申請重算 `own_participants`、`cross_participants`、`reward_per_person`（依目前實際報名資料） |
| ❌ 批次駁回 | 駁回所有已勾選的 pending 申請 |
| ✅ 批次核准 | 核准所有已勾選的 pending 申請並發放修為（含確認對話框） |

#### c. 審核卡片增強

每筆申請卡片新增：

1. **Checkbox**（待審核申請才顯示）：供批次操作勾選
2. **▼ 查看參與名單**：呼叫 `getPeakTrialRegistrations`，列出本隊（出席/未出席）與跨隊報名者
3. **🎬 影片**：始終顯示影片欄位；有連結時顯示可點擊 URL，無連結時顯示「未提供影片連結」

#### d. 核准邏輯調整

`approvePeakTrialReview` 不再對全體大隊成員發放修為，改為只發放給 `attended = true` 的本大隊報名成員（對應修為分配規則調整）。

---

## 資料庫遷移執行清單

以下 SQL 需在 Supabase 控制台手動執行：

```sql
-- 1. 建立 PeakTrialReviews 資料表
-- 詳見 supabase/migrations/20260325_add_peak_trial_reviews.sql

-- 2. 新增影片連結欄位
ALTER TABLE "PeakTrialReviews" ADD COLUMN IF NOT EXISTS video_url TEXT;
```

---

## 異動檔案清單

| 檔案 | 說明 |
|------|------|
| `types/index.ts` | 新增 `PeakTrialReview` interface，含 `video_url` |
| `app/actions/peakTrials.ts` | 新增 6 個審核相關 action；`approvePeakTrialReview` 改為只發放給出席成員 |
| `components/Tabs/PeakTrialTab.tsx` | 移除重整鍵、置中 Header、前移主辦標籤、新增預計修為框與未報名警示框 |
| `components/Tabs/CommandantTab.tsx` | 限 1 場活動、審核面板（統計 + 照片 + 影片連結 + 預填）、標籤文字更新 |
| `components/Admin/AdminDashboard.tsx` | 自動刷新、批次操作（勾選 + 重算 + 批次核准/駁回）、參與名單、影片連結顯示 |
| `supabase/migrations/20260325_add_peak_trial_reviews.sql` | 建立 `PeakTrialReviews` 資料表 |
| `supabase/migrations/20260325_add_peak_trial_review_video_url.sql` | 新增 `video_url` 欄位 |
| `docs/BIG_CHALLENGE_GAME.md` | 更新至 v2.0，完整記錄巔峰試煉系統設計 |
