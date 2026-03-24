# 版本更新說明 — 2026/03/23 ～ 2026/03/24

**基礎版本**：`04f7567`
**更新日期**：2026-03-24
**編輯者**：Neo Huang

---

## 本次更新內容

### 一、傳愛分數（W4）三階段審核流程重構

#### 背景說明
原流程所有申請統一走「小隊長初審 → 管理員終審」，導致小隊長申請自己送出的案件時無法跳過自審問題。

#### 新審核流程（三條路徑）

| 申請人身份 | 初始狀態 | 審核路徑 |
|-----------|---------|---------|
| 一般隊員 | `pending` | 小隊長初審 → 大隊長二審 → 管理員終審 |
| 小隊長 | `squad_approved` | 大隊長二審 → 管理員終審（略過初審）|
| 大隊長 | `battalion_approved` | 管理員終審（略過初審與二審）|

#### 新增狀態值

`W4Application.status` 擴充：

| 狀態 | 說明 |
|------|------|
| `pending` | 待小隊長初審 |
| `squad_approved` | 待大隊長二審 |
| `battalion_approved` | 待管理員終審 |
| `approved` | 已核准（已入帳）|
| `rejected` | 已駁回 |

#### 後端邏輯異動（`app/actions/w4.ts`）

1. **`submitW4Application`**
   - 提交前查詢申請人的 `IsCaptain`、`IsCommandant` 欄位
   - 依角色決定初始狀態：`IsCommandant` → `battalion_approved`；`IsCaptain` → `squad_approved`；其餘 → `pending`
   - 回傳新增 `initialStatus` 欄位，供前台顯示對應的提示訊息

2. **新增 `reviewW4ByBattalionLeader(appId, reviewerId, approve, notes)`**
   - 驗證審核者具有 `IsCommandant` 資格
   - 僅可審核 `status === 'squad_approved'` 的申請
   - 防止大隊長審核自己的申請（`app.user_id === reviewerId` 時回傳錯誤）
   - 核准 → `battalion_approved`；駁回 → `rejected`

3. **`reviewW4ByAdmin`**
   - 前置檢查從 `status !== 'squad_approved'` 改為 `status !== 'battalion_approved'`，確保管理員只接受已通過大隊長二審的申請

---

### 二、大隊長指揮部（CommandantTab）更新

#### a. 審核邏輯更換
- 由原本的 `reviewW4ByAdmin`（終審入帳）改為 `reviewW4ByBattalionLeader`（二審，不入帳）
- 核准後狀態 `battalion_approved`，仍需管理員終審才正式入帳

#### b. 自我申請過濾
- 申請列表使用 IIFE 過濾掉 `app.user_id === userData.UserID` 的案件，避免大隊長審核自己的傳愛申請

#### c. 文字標示更新
- 待審核 badge：`待終審` → `待大隊長審核`
- 區塊說明：`以下為已通過小隊長初審、待終審的申請` → `以下為已通過小隊長初審、待大隊長審核的申請`
- 核准成功訊息：`✅ 已核准入帳，傳愛修為已發放！` → `✅ 已通過二審，待管理員終審入帳。`

---

### 三、週記任務頁（WeeklyTopicTab）— 狀態標示更新

`W4_STATUS_LABELS` 對照表新增 `battalion_approved`，並統一中文用語：

| 狀態碼 | 顯示文字 | 顏色 |
|--------|---------|------|
| `pending` | 🟡 待小隊長審核 | yellow |
| `squad_approved` | 🔵 待大隊長審核 | blue |
| `battalion_approved` | 🟣 待管理員審核 | violet |
| `approved` | 🟢 已核准（已入帳）| emerald |
| `rejected` | 🔴 已駁回 | red |

原「核實」用語統一改為「審核」。

---

### 四、管理後台（AdminDashboard）大幅重構

#### a. 預設進入頁面
- `adminModule` 初始值從 `null`（首頁）改為 `'dashboard'`（儀表板），後台登入後直接顯示儀表板

#### b. 新增「審核中心」模組
- 左側導覽列新增 **審核中心**（粉色系，`CheckCircle` 圖示）
- 原首頁的「傳愛分數終審（管理員）」與「親證故事存檔」兩個區塊移入審核中心
- 審核中心的傳愛終審僅顯示 `status === 'battalion_approved'` 的申請（已通過大隊長二審）
- 待審核 badge 標示：`待終審` → `待管理員審核`（紫色）

#### c. 審核中心待審紅點通知
- `reviewPendingCount = squadApprovedW4Apps.length`
- 桌面版：導覽列項目右側顯示紅色圓形數字 badge
- 手機版：導覽按鈕右上角顯示絕對定位小紅點 badge

#### d. 儀表板新增修行者修為榜
- 儀表板區塊底部加入 `<RankTab leaderboard={leaderboard} />`
- 首頁（`adminModule === null`）移除修行者修為榜預覽與管理操作日誌

#### e. 「陣亡」統一改為「沉寂」
- 儀表板統計卡：「陣亡人數」→「沉寂人數」
- 查看連結：「查看陣亡名單」→「查看沉寂名單」
- 彈窗標題：「陣亡名單」→「沉寂名單」

#### f. 操作日誌載入時機修正
- 原本 `adminModule === null` 也會觸發日誌查詢，已移除此條件，僅 `adminModule === 'logs'` 時載入

#### g. 程式碼清理
- 移除未使用的 `ChevronUp` import
- 移除未使用的 `fineBalance` 變數

---

### 五、主頁（app/page.tsx）更新

#### a. 傳愛申請提交成功訊息依角色差異化
```
IsCommandant → 「傳愛申請已提交，已略過初審，直接進入管理員終審。」
IsCaptain    → 「傳愛申請已提交，已略過小隊長初審，待大隊長二審。」
一般隊員      → 「傳愛申請已提交，待小隊長初審。」
```

#### b. 管理員登入時改撈 `battalion_approved` 申請
- `getW4Applications({ status: 'squad_approved' })` → `getW4Applications({ status: 'battalion_approved' })`
- 確保管理員審核中心只顯示已通過大隊長二審的案件

#### c. 新增 `reviewW4ByBattalionLeader` import
- 供大隊長資料載入後呼叫正確的審核 action

---

### 六、型別定義（`types/index.ts`）

- `W4Application.status` union 新增 `'battalion_approved'`

---

## 異動檔案清單

| 檔案 | 說明 |
|------|------|
| `app/actions/w4.ts` | 角色判斷初始狀態、新增 `reviewW4ByBattalionLeader`、修正管理員終審前置檢查 |
| `app/page.tsx` | 差異化提交訊息、管理員撈 `battalion_approved`、新增 import |
| `types/index.ts` | `W4Application.status` 新增 `battalion_approved` |
| `components/Tabs/CommandantTab.tsx` | 改用大隊長二審 action、自我申請過濾、文字更新 |
| `components/Tabs/WeeklyTopicTab.tsx` | `W4_STATUS_LABELS` 新增 `battalion_approved`、統一「審核」用語 |
| `components/Admin/AdminDashboard.tsx` | 預設進儀表板、新增審核中心模組、紅點通知、修為榜、陣亡→沉寂、程式碼清理 |
