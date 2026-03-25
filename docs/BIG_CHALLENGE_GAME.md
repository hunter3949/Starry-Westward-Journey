# 巔峰試煉（Peak Trial）系統設計文檔

> **版本**：v2.0 | **建立日期**：2026-03-25 | **最後更新**：2026-03-25
> 本文描述「巔峰試煉」功能模組的完整設計邏輯與技術規格。

---

## 一、功能概述

**巔峰試煉**是由各大隊長舉辦的特別活動報名系統，讓學員可在前台瀏覽活動、線上報名、取得入場 QR 碼，並由大隊長現場掃碼核銷出席。活動結束後，大隊長填報統計資料送審，管理員核准後自動發放修為給**實際出席的本大隊成員**。

核心目標：
- 取代紙本名單，數位化管理活動報名與出席
- 讓學員保有可截圖的報到憑證（QR 碼）
- 大隊長能即時掌握報名人數與出席狀況
- 透過修為激勵學員積極參與並邀請大隊夥伴

---

## 二、資料庫結構

### 2.1 PeakTrials（活動表）

| 欄位 | 型別 | 說明 |
|------|------|------|
| `id` | UUID PK | 活動唯一識別碼 |
| `title` | TEXT | 活動名稱（必填） |
| `description` | TEXT | 活動說明（選填） |
| `date` | DATE | 活動日期（必填，YYYY-MM-DD） |
| `time` | TEXT | 活動時間（選填，如 `14:00`） |
| `location` | TEXT | 活動地點（選填） |
| `max_participants` | INTEGER | 名額上限（NULL = 不限制） |
| `battalion_name` | TEXT | 主辦大隊法定名稱 |
| `created_by` | TEXT | 建立者 UserID 或 `'admin'` |
| `is_active` | BOOLEAN | 是否開放報名（預設 `true`） |
| `created_at` | TIMESTAMPTZ | 建立時間 |

### 2.2 PeakTrialRegistrations（報名表）

| 欄位 | 型別 | 說明 |
|------|------|------|
| `id` | UUID PK | 報名記錄唯一識別碼（同時作為 QR 碼內容） |
| `trial_id` | UUID FK | 對應 `PeakTrials.id`（CASCADE DELETE） |
| `user_id` | TEXT | 報名學員 UserID |
| `user_name` | TEXT | 報名學員姓名 |
| `squad_name` | TEXT | 所屬小隊名稱（選填） |
| `battalion_name` | TEXT | 所屬大隊名稱（選填） |
| `registered_at` | TIMESTAMPTZ | 報名時間 |
| `attended` | BOOLEAN | 是否已出席（預設 `false`） |
| `attended_at` | TIMESTAMPTZ | 核銷時間 |

**唯一約束**：`UNIQUE(trial_id, user_id)` — 同一活動每人只能報名一次。

### 2.3 PeakTrialReviews（審核申請表）

| 欄位 | 型別 | 說明 |
|------|------|------|
| `id` | UUID PK | 審核記錄唯一識別碼 |
| `trial_id` | UUID FK | 對應 `PeakTrials.id`（CASCADE DELETE） |
| `trial_title` | TEXT | 活動名稱（冗余，方便後台顯示） |
| `battalion_name` | TEXT | 申請大隊法定名稱 |
| `submitted_by` | TEXT | 送審者 UserID |
| `own_participants` | INTEGER | 本隊參與人數（大隊長填報） |
| `cross_participants` | INTEGER | 跨隊參與人數（大隊長填報） |
| `reward_per_person` | INTEGER | 每位參與者可獲得的修為（系統計算） |
| `total_members` | INTEGER | 本大隊總人數（填報時記錄，僅供參考） |
| `photo_data` | TEXT | 大合照 base64 |
| `video_url` | TEXT | 影片連結（選填，YouTube / Google Drive 等） |
| `status` | TEXT | `pending` / `approved` / `rejected` |
| `reviewed_by` | TEXT | 審核者（`'admin'`） |
| `reviewed_at` | TIMESTAMPTZ | 審核時間 |
| `review_notes` | TEXT | 駁回原因（選填） |
| `created_at` | TIMESTAMPTZ | 初次送審時間 |

**唯一約束**：`UNIQUE(trial_id, battalion_name)` — 同一大隊對同一活動只能有一筆審核（重複送審用 UPSERT 覆蓋）。

---

## 三、角色與權限

| 操作 | 一般學員 | 小隊長 | 大隊長 | 管理員 |
|------|---------|--------|--------|--------|
| 瀏覽開放活動 | ✅ | ✅ | ✅ | ✅ |
| 報名活動 | ✅ | ✅ | ✅ | — |
| 取消報名 | ✅（未出席） | ✅ | ✅ | — |
| 查看 QR 碼 | ✅（已報名） | ✅ | ✅ | — |
| 新增活動 | ❌ | ❌ | ✅（本大隊，限 1 場） | ✅（全部） |
| 編輯活動 | ❌ | ❌ | ✅（本大隊） | ✅（全部） |
| 開啟 / 關閉活動 | ❌ | ❌ | ✅ | ✅ |
| 刪除活動 | ❌ | ❌ | ✅ | ✅ |
| 查看報名名單 | ❌ | ❌ | ✅ | ✅ |
| 掃碼核銷 | ❌ | ❌ | ✅（指揮部） | ✅ |
| 手動核銷（名單點擊） | ❌ | ❌ | ✅ | ✅ |
| 查看本隊名單 | ❌ | ❌ | ✅ | ✅ |
| 查看跨入名單 | ❌ | ❌ | ✅ | ✅ |
| 送審申請修為 | ❌ | ❌ | ✅（本大隊） | ✅ |
| 核准 / 駁回審核 | ❌ | ❌ | ❌ | ✅ |
| 重新計算修為 | ❌ | ❌ | ❌ | ✅ |
| 批次審核 | ❌ | ❌ | ❌ | ✅ |

---

## 四、學員操作流程

### 4.1 瀏覽與報名

1. 進入前台「🏆 巔峰試煉」Tab
2. 系統自動載入所有 `is_active = true` 的活動（切換 Tab 時刷新）
3. 頁面頂部顯示：活動名稱、主辦大隊標籤（內嵌於標題旁）、日期、時間、地點、已報名人數
4. **預計修為獎勵框**（活動列表上方）：顯示「本大隊每人預計獲得 XXXX 修為（預計）」，以目前總報名人數估算
   - 未報名者另顯示警示框：「！！您未參與任何試煉，無法獲得修為，請即刻報名參與！！」
5. 點擊活動卡片展開詳細說明與行動按鈕
6. 點擊「🏆 立即報名」完成報名

**名額滿員邏輯**：若 `max_participants` 已設定且 `registration_count >= max_participants`，顯示「名額已滿，無法報名」；後端二次驗證防止並發超額。

### 4.2 QR 碼取得

報名成功後可從兩處取得 QR 碼：
- **「我的報名記錄」區塊**：每筆未出席的報名右側有 QR 碼按鈕
- **活動展開卡片**：已報名且未出席狀態下，展開後顯示「QR 碼」按鈕

QR 碼內容 = `PeakTrialRegistrations.id`（UUID），唯一對應該學員的該次報名記錄。建議截圖保存，報到當天出示給大隊長掃描。

### 4.3 取消報名

- 條件：尚未出席（`attended = false`）
- 位置：展開活動卡片 → 「取消報名」按鈕
- 已出席（`attended = true`）者無法自行取消

---

## 五、大隊長操作流程（指揮部）

### 5.1 活動管理

1. 進入「指揮部」Tab → 下方「巔峰試煉管理」區塊
2. **每位大隊長限新增 1 場活動**：已有活動時「新增活動」按鈕自動隱藏（依 `created_by === userData.UserID` 判斷）
3. 填寫表單：名稱、說明、日期、時間、地點、名額上限
4. 儲存後活動自動設 `is_active = true`、`battalion_name = 本人 BigTeamLeagelName`、`created_by = 本人 UserID`

**編輯**：點擊鉛筆圖示帶入現有資料，儲存時執行 UPDATE。
**開關**：點擊 CheckCheck 圖示切換 `is_active`，關閉後學員端不顯示此活動。
**刪除**：點擊垃圾桶圖示，連同所有報名記錄一起刪除（CASCADE）。

### 5.2 查看報名名單

點擊眼睛圖示展開名單，顯示所有報名學員、所屬小隊、出席狀態。

手動核銷：點擊「核銷」按鈕直接標記 `attended = true`，適用於未帶手機的學員。

### 5.3 本隊名單

點擊「本隊名單」按鈕（藍色），查詢本大隊所有成員對此活動的報名狀態。

名單依**小隊分組**顯示（按中文數字順序：第一小隊、第二小隊…），每位成員標示三種狀態之一：

| 狀態 | 說明 | 顯示色 |
|------|------|--------|
| 已報名 | 已報名本活動（若已核銷則顯示「✅ 已出席」） | 紫色 / 綠色 |
| 未報名 | 尚未報名本活動 | 灰色 |
| 跨出報名 | 已報名**別大隊**的活動，顯示「跨出→XXX大隊」 | 琥珀色 |

**跨出判斷**：成員未報名本活動，但在 `PeakTrialRegistrations` 存在其他 `trial_id`（對應不同 `battalion_name`），即視為「跨出」。

### 5.4 跨入名單

點擊「跨入名單」按鈕（琥珀色），查詢**非本大隊**成員報名本活動的記錄。每筆顯示：姓名、原始大隊、原始小隊、出席狀態。

> 本隊名單與跨入名單互斥，再次點擊同一按鈕收起；資料每次點擊時從 Supabase 即時拉取（`getBattalionTrialStatus`）。

### 5.5 掃碼核銷

1. 點擊掃描圖示（ScanLine）啟動 QR 掃描器（`PeakTrialScanner`）
2. 掃描學員手機上的報到 QR 碼（內容為 `registration.id`）
3. 後端查詢 `PeakTrialRegistrations` 確認記錄存在
4. 若 `attended = false`：更新為 `true`，回傳姓名，顯示「✓ 姓名 報到成功！」（綠色）
5. 若 `attended = true`：顯示「姓名 已完成核銷」（黃色警示）
6. 若找不到記錄：顯示「找不到此報名記錄」（紅色錯誤）
7. 掃描後 3 秒冷卻，防止重複觸發；同時自動刷新報名名單

### 5.6 統計及回報審核

活動結束後，大隊長點擊「統計及回報審核」按鈕進入審核送審流程。

**統計面板**顯示（資料來自 `getBattalionTrialStatus` 實際報名數）：
- 本隊參與人數 → 貢獻 `min(own, 21) × 1,500` 修為
- 跨隊參與人數 → 貢獻 `min(cross, 21) × 1,050` 修為
- **每位參與者各獲得（預計）**：兩項合計，每位出席者各自獲得此修為

**送審流程**：
1. 上傳大合照（必填）
2. 輸入影片連結（選填，YouTube / Google Drive 等）
3. 點擊「送審申請修為」→ 呼叫 `submitPeakTrialReview`，狀態設為 `pending`
4. 重開審核面板時，已提交的照片與影片連結會**自動預填**，可直接修改後重新送審
5. 「重新送審」可隨時更新申請（無論 pending 或 rejected 狀態），覆蓋同一 `(trial_id, battalion_name)` 記錄

---

## 六、修為分配規則

### 6.1 修為計算公式

```
修為池 = min(本隊參與人數, 21) × 1,500 + min(跨隊參與人數, 21) × 1,050
```

- 每位**實際出席**（`attended = true`）的本大隊成員各自獲得完整「修為池」修為
- **未出席或未報名者得 0 修為**

### 6.2 修為上限說明

| 參與類型 | 每人貢獻修為 | 計算上限 |
|---------|------------|---------|
| 本隊出席（own） | 1,500 修為 | 最多計 21 人 |
| 跨隊出席（cross） | 1,050 修為 | 最多計 21 人 |

超過上限人數的額外人數不增加修為池，但仍鼓勵更多人參與。

### 6.3 範例

- 本隊 10 人出席 + 跨隊 5 人出席：`10×1500 + 5×1050 = 20,250` 修為
- 本隊每位出席者各獲得 20,250 修為
- 本隊未出席的成員獲得 0 修為

### 6.4 發放流程

1. 大隊長送審（`pending`）
2. 管理員核准（`approvePeakTrialReview`）
3. 後端查詢 `PeakTrialRegistrations` WHERE `trial_id = 本活動` AND `battalion_name = 本大隊` AND `attended = true`
4. 批次更新符合條件成員的 `CharacterStats.Exp`

---

## 七、管理員後台審核流程

後台「審核中心」（`adminModule = 'review'`）→「🏆 巔峰試煉審核」區塊，**切換至審核中心時自動重新載入**最新資料。

### 7.1 審核列表

每筆審核卡片顯示：
- 活動名稱、申請大隊、送審時間、狀態標籤（⏳ 待審核 / ✅ 已核准 / ❌ 已駁回）
- 修為統計格（本隊參與 / 跨隊參與 / 每人修為）
- **▼ 查看參與名單**：列出本隊（出席狀態）與跨隊報名者
- **▼ 查看大合照**：展開 / 收起照片
- **🎬 影片**：顯示影片連結（可點擊開啟）；未提供時顯示「未提供影片連結」
- 待審核狀態下：駁回原因文字輸入 + 個別「❌ 駁回」和「✅ 核准並發放修為」按鈕

### 7.2 批次操作

| 按鈕 | 功能 |
|------|------|
| ↻ 重整 | 重新載入審核列表 |
| 🔄 重新計算修為 | 依目前實際報名資料重算所有 pending 申請的 `own_participants`、`cross_participants`、`reward_per_person` |
| ❌ 批次駁回 | 駁回所有**已勾選**的 pending 申請（使用各自填寫的駁回原因） |
| ✅ 批次核准 | 核准所有**已勾選**的 pending 申請並發放修為，顯示確認對話框 |

**勾選機制**：每筆 pending 申請左側有 checkbox，批次操作只處理已勾選項目。

### 7.3 重新計算修為邏輯

`recalcPeakTrialReview` 從 `PeakTrialRegistrations` 重新計算：
- 本隊人數 = WHERE `trial_id = X` AND `battalion_name = 申請大隊`
- 跨隊人數 = WHERE `trial_id = X` AND `battalion_name ≠ 申請大隊`
- 更新 DB 中的統計欄位與 `reward_per_person`

---

## 八、Server Actions（`app/actions/peakTrials.ts`）

| Function | 說明 |
|----------|------|
| `listPeakTrials(filter)` | 查詢活動列表，批次計算各活動的 `registration_count` |
| `upsertPeakTrial(trial)` | 新增或更新活動（依 `id` 存在與否判斷） |
| `togglePeakTrialActive(id, isActive)` | 切換活動開放狀態 |
| `deletePeakTrial(id)` | 刪除活動（連同報名記錄） |
| `registerForPeakTrial(trialId, userId, ...)` | 學員報名，後端驗證活動狀態與名額 |
| `cancelPeakTrialRegistration(trialId, userId)` | 取消報名（僅限 `attended = false`） |
| `getPeakTrialRegistrations(trialId)` | 取得活動的完整報名名單 |
| `getMyPeakTrialRegistrations(userId)` | 取得學員自身的所有報名記錄 |
| `markPeakTrialAttendance(registrationId)` | 核銷出席，回傳 `userName` 與 `alreadyAttended` |
| `markPeakTrialAttendanceByName(trialId, userName)` | 依姓名核銷（大隊長備用） |
| `getBattalionTrialStatus(battalionName, trialId)` | 查詢本隊成員狀態（已報名/未報名/跨出）+ 跨入名單 |
| `submitPeakTrialReview(data)` | 送審申請（UPSERT，含照片 base64 與影片連結） |
| `getTrialReviewStatus(trialId, battalionName)` | 查詢指定活動+大隊的審核狀態（含 `photo_data`、`video_url`） |
| `recalcPeakTrialReview(reviewId)` | 依實際報名資料重算 `own_participants`、`cross_participants`、`reward_per_person` |
| `listPeakTrialReviews(status?)` | 管理員取得所有審核申請（可過濾狀態） |
| `approvePeakTrialReview(reviewId, reviewedBy)` | 核准審核，發放修為給 `attended = true` 的本隊成員 |
| `rejectPeakTrialReview(reviewId, reviewedBy, notes)` | 駁回審核，記錄原因 |

---

## 九、前端元件

| 元件 | 路徑 | 說明 |
|------|------|------|
| `PeakTrialTab` | `components/Tabs/PeakTrialTab.tsx` | 學員前台，報名 / QR 碼 / 取消 / 預計修為框 |
| `PeakTrialScanner` | `components/PeakTrialScanner.tsx` | 大隊長掃碼核銷（dynamic import，避免 SSR） |
| CommandantTab 巔峰試煉管理 | `components/Tabs/CommandantTab.tsx` | 大隊長活動 CRUD + 名單 + 本隊 / 跨入 + 掃碼 + 送審審核 |
| AdminDashboard 審核中心 | `components/Admin/AdminDashboard.tsx` | 後台活動管理 + 審核列表 + 批次操作 |

`PeakTrialScanner` 使用 `html5-qrcode` 套件，DOM 元素 ID 為 `pt-qr-reader-{trialId}`，確保多個掃描器同時存在時不衝突。

---

## 十、業務規則摘要

1. **活動可見性**：前台只顯示 `is_active = true` 的活動
2. **大隊長限額**：每位大隊長（依 `created_by`）最多新增 1 場活動
3. **報名唯一性**：DB `UNIQUE(trial_id, user_id)` 約束 + 前端錯誤碼 `23505` 攔截
4. **名額管理**：後端在報名時進行 SELECT COUNT 二次驗證，防止並發超額
5. **取消限制**：`attended = true` 後不可取消
6. **資料完整性**：活動刪除時 CASCADE 清除所有報名，QR 碼自動失效
7. **修為分配**：僅 `attended = true` 的本大隊成員獲得修為；非出席者得 0
8. **修為池不平均分配**：每位出席者各自獲得**完整修為池**（非除以總人數）
9. **審核可重送**：`UPSERT ON CONFLICT (trial_id, battalion_name)` 允許反覆修改再送審，被駁回或 pending 狀態均可重送
10. **預填已送審資料**：重開審核面板時自動讀取 `photo_data` 與 `video_url` 預填表單
11. **跨出報名判斷**：成員在不同 `battalion_name` 的活動存在報名記錄即視為「跨出」
12. **跨入名單過濾**：`PeakTrialRegistrations.battalion_name ≠ 本大隊名稱` 判定
