# 巔峰試煉（Peak Trial）系統設計文檔

> **版本**：v1.0 | **建立日期**：2026-03-25
> 本文描述「巔峰試煉」功能模組的完整設計邏輯與技術規格。

---

## 一、功能概述

**巔峰試煉**是由各大隊長（或管理員）舉辦的特別活動報名系統，讓學員可在前台瀏覽活動、線上報名、取得入場 QR 碼，並由大隊長現場掃碼核銷出席。

核心目標：
- 取代紙本名單，數位化管理活動報名與出席
- 讓學員保有可截圖的報到憑證（QR 碼）
- 大隊長能即時掌握報名人數與出席狀況

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

**關聯**：`trial_id` 設 `ON DELETE CASCADE`，刪除活動時自動清除所有報名記錄。

---

## 三、角色與權限

| 操作 | 一般學員 | 小隊長 | 大隊長 | 管理員 |
|------|---------|--------|--------|--------|
| 瀏覽開放活動 | ✅ | ✅ | ✅ | ✅ |
| 報名活動 | ✅ | ✅ | ✅ | — |
| 取消報名 | ✅（未出席） | ✅ | ✅ | — |
| 查看 QR 碼 | ✅（已報名） | ✅ | ✅ | — |
| 新增活動 | ❌ | ❌ | ✅（本大隊） | ✅（全部） |
| 編輯活動 | ❌ | ❌ | ✅（本大隊） | ✅（全部） |
| 開啟 / 關閉活動 | ❌ | ❌ | ✅ | ✅ |
| 刪除活動 | ❌ | ❌ | ✅ | ✅ |
| 查看報名名單 | ❌ | ❌ | ✅ | ✅ |
| 掃碼核銷 | ❌ | ❌ | ✅（指揮部） | ✅ |
| 手動核銷（名單點擊） | ❌ | ❌ | ✅ | ✅ |

---

## 四、學員操作流程

### 4.1 瀏覽與報名

1. 進入前台「🏆 巔峰試煉」Tab
2. 系統自動載入所有 `is_active = true` 的活動（切換 Tab 時刷新）
3. 每筆活動顯示：標題、日期、時間、地點、已報名人數 / 名額
4. 點擊活動卡片展開詳細說明與行動按鈕
5. 點擊「🏆 立即報名」完成報名

**名額滿員邏輯**：
- 若 `max_participants` 已設定且 `registration_count >= max_participants`，顯示「名額已滿，無法報名」
- 後端二次驗證，防止並發超額報名

### 4.2 QR 碼取得

報名成功後可從兩處取得 QR 碼：
- **「我的報名記錄」區塊**：每筆未出席的報名右側有 QR 碼按鈕
- **活動展開卡片**：已報名狀態下，展開後顯示「QR 碼」按鈕

QR 碼內容 = `PeakTrialRegistrations.id`（UUID），唯一對應該學員的該次報名記錄。

建議截圖保存，報到當天出示給大隊長掃描。

### 4.3 取消報名

- 條件：尚未出席（`attended = false`）
- 位置：展開活動卡片 → 「取消報名」按鈕
- 已出席（`attended = true`）者無法自行取消

---

## 五、大隊長操作流程（指揮部）

### 5.1 活動管理

1. 進入「指揮部」Tab → 下方「巔峰試煉管理」區塊
2. 僅顯示本大隊（`battalion_name = 自身 BigTeamLeagelName`）或本人建立的活動
3. 點擊「新增活動」填寫表單：名稱、說明、日期、時間、地點、名額上限
4. 儲存後活動自動設 `is_active = true`、`created_by = 本人 UserID`

**編輯活動**：點擊鉛筆圖示，表單帶入現有資料，儲存時執行 UPDATE（`upsertPeakTrial` 依 `id` 是否存在判斷 INSERT / UPDATE）。

**開關活動**：點擊 CheckCheck 圖示切換 `is_active`，關閉後學員端不顯示此活動。

**刪除活動**：點擊垃圾桶圖示，連同所有報名記錄一起刪除（CASCADE）。

### 5.2 查看報名名單

點擊眼睛圖示展開名單，顯示所有報名學員、所屬小隊、出席狀態。

手動核銷：點擊「核銷」按鈕直接標記 `attended = true`，適用於未帶手機的學員。

### 5.3 掃碼核銷

1. 點擊掃描圖示（ScanLine）啟動 QR 掃描器
2. 掃描學員手機上的報到 QR 碼（內容為 `registration.id`）
3. 後端查詢 `PeakTrialRegistrations` 確認記錄存在
4. 若 `attended = false`：更新為 `true`，顯示「✓ 姓名 報到成功！」
5. 若 `attended = true`（已掃過）：顯示「姓名 已完成核銷」（黃色警示）
6. 若找不到記錄（無效 QR）：顯示「找不到此報名記錄」（紅色錯誤）
7. 掃描後 3 秒冷卻，防止重複觸發；同時自動刷新報名名單

---

## 六、管理員操作流程（後台 AdminDashboard）

後台「課程管理」分頁下方有「巔峰試煉管理」區塊，功能與大隊長指揮部相同，但可管理**所有大隊**的活動（無 `battalion_name` 過濾）。

操作項目：新增 / 編輯 / 開關 / 刪除活動、查看報名名單、手動核銷。

---

## 七、Server Actions（`app/actions/peakTrials.ts`）

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
| `markPeakTrialAttendanceByName(trialId, userName)` | 依姓名核銷（大隊長備用方式） |

---

## 八、前端元件

| 元件 | 路徑 | 說明 |
|------|------|------|
| `PeakTrialTab` | `components/Tabs/PeakTrialTab.tsx` | 學員前台，報名 / QR 碼 / 取消 |
| `PeakTrialScanner` | `components/PeakTrialScanner.tsx` | 大隊長掃碼核銷（dynamic import，避免 SSR） |
| CommandantTab 巔峰試煉管理區塊 | `components/Tabs/CommandantTab.tsx` | 大隊長活動 CRUD + 名單 + 掃碼 |
| AdminDashboard 巔峰試煉管理區塊 | `components/Admin/AdminDashboard.tsx` | 後台活動 CRUD + 名單 |

`PeakTrialScanner` 使用 `html5-qrcode` 套件（與課程 Scanner 相同技術棧），DOM 元素 ID 為 `pt-qr-reader-{trialId}`，確保多個掃描器同時存在時不衝突。

---

## 九、業務規則摘要

1. **活動可見性**：前台只顯示 `is_active = true` 的活動
2. **報名唯一性**：同一學員對同一活動只能有一筆報名（DB UNIQUE 約束 + 前端錯誤碼 `23505` 攔截）
3. **名額管理**：後端在報名時進行 SELECT COUNT 二次驗證，防止並發超額
4. **取消限制**：`attended = true` 後不可取消（後端 WHERE 條件含 `attended = false`）
5. **資料完整性**：活動刪除時 CASCADE 清除所有報名，QR 碼自動失效
6. **QR 碼設計**：內容為 `PeakTrialRegistrations.id`（UUID），不含任何敏感資訊，掃描後直接以 PK 查詢核銷
