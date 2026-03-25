# 版本更新說明 — 2026/03/21 ～ 2026/03/22

**基礎版本**：`41f3fc5`
**更新版本**：`b061daf`
**更新日期**：2026-03-22
**編輯者**：Neo Huang

---

## 備註

### 一、資料庫欄位重新定義後的待驗功能

本次更新重新定義了大小隊的欄位語義：

| 欄位 | 代表 |
|------|------|
| `BigTeamLeagelName` | 大隊法定名稱 |
| `LittleTeamLeagelName` | 小隊法定名稱 |
| `BigTeamNickName` | 大隊暱稱 |
| `LittleTeamNickName` | 小隊暱稱 |

欄位語義修正後，下列功能可能受影響，**需逐一驗證**：

- **a. 藏寶閣 — 團隊資金**：購買團隊法寶時以 `LittleTeamLeagelName` 計算小隊人數與費用分攤，需確認金額計算正確。
- **b. 修為榜 — 小隊榜計算**：小隊排行依 `LittleTeamLeagelName` 分組加總，需確認排名數據正確顯示。

---

### 二、Token 不足，尚未完成的功能規劃

以下功能已規劃但因 Token 限制尚未實作，列入下一版本待辦：

- **a. 任務角色顯示一致性**：指揮所目前以「角色名稱」指派任務角色，後台參與人員名單卻顯示「角色 ID」。需統一改為顯示角色名稱，確保前後台呈現一致。

- **b. 後台任務角色儲存修正**：參與人員名單的任務角色編輯介面儲存後未實際寫入資料庫，需修正。

- **c. 戰隊名冊匯入格式重構**：CSV 格式改為標準欄位順序：`電話, 姓名, 生日(YYYY-MM-DD), 大隊, 是否大隊長, 小隊, 是否小隊長`。電話號碼去除首位 `0` 後直接作為 `UserID`，是否為大小隊長欄位支援 `true/false` 或 `1/0`。同步更新批量上傳解析邏輯與手動新增表單欄位。

- **d. 參與人員名單 — 小隊篩選**：目前僅支援大隊篩選，需新增小隊二級篩選下拉選單。

- **e. 參與人員名單 — 顯示暱稱**：大隊與小隊欄位目前僅顯示法定名稱（`LeagelName`），需於第二列以括號補充暱稱（`NickName`），例如：`第一大隊（龍騎隊）`。

- **f. 主線任務排程重構**：「全域修行設定」與「主線任務排程列表」功能重疊，統一保留「主線任務排程列表」。介面顯示順序由上至下：**當前主線任務**（唯讀）｜**排程列表**（可編輯）｜**新增排程**｜**歷史排程紀錄**。

- **g. 新增主線任務排程欄位**：新增排程時需填寫：**主標題**（`TopicQuestTitle`）｜**任務名稱**（顯示於 UI 的簡短名稱）｜**任務說明**（詳細描述）。

---

### 三、版面調整待辦

- **a. 小隊長指揮所 — 區塊排列順序**：
  `AI 隊務分析` ｜ `設定小隊名稱` ｜ `本週推薦定課抽籤` ｜ `傳愛分數審核（小隊長初審）` ｜ `罰款管理` ｜ `任務角色指派`

- **b. 大隊長指揮部 — 所轄小隊加框**：「所轄小隊」區塊需以卡片框線框起，視覺上與其他區塊區隔。

- **c. 所轄小隊 — 隊員存活狀態顯示**：小隊員名單需標示每位隊員的「存活」或「陣亡」狀態（以最後打卡時間判斷）。

- **d. 所轄小隊 — 小隊概覽存活率**：小隊概覽列的小隊長名稱旁顯示本小隊目前的存活率百分比（例：`存活率 71%`）。

---

## 目錄

1. [資料庫結構變更（Supabase Migrations）](#1-資料庫結構變更supabase-migrations)
2. [重大修正：大隊／小隊命名混淆全面修正](#2-重大修正大隊小隊命名混淆全面修正)
3. [新增功能](#3-新增功能)
   - 3.1 [人生提示卡（LifeHintCard）](#31-人生提示卡lifehintcard)
   - 3.2 [主線任務排程自動切換](#32-主線任務排程自動切換)
   - 3.3 [任務角色（QuestRole）系統](#33-任務角色questrole系統)
   - 3.4 [字體大小調整功能](#34-字體大小調整功能)
   - 3.5 [站台品牌客製化（SiteName / SiteLogo）](#35-站台品牌客製化sitename--sitelogo)
   - 3.6 [課程系統動態化（Courses 資料表）](#36-課程系統動態化courses-資料表)
   - 3.7 [大隊自訂顯示名稱（BattalionSettings）](#37-大隊自訂顯示名稱battalionsettings)
   - 3.8 [志工密碼每日自動輪換（Cron Job）](#38-志工密碼每日自動輪換cron-job)
   - 3.9 [LINE 帳號取消綁定](#39-line-帳號取消綁定)
   - 3.10 [快捷登入（Quick Login）](#310-快捷登入quick-login)
4. [後台管理（AdminDashboard）](#4-後台管理admindashboard)
   - 4.1 [後台大規模重構](#41-後台大規模重構)
   - 4.2 [後台手動新增成員 / 大小隊分組管理](#42-後台手動新增成員--大小隊分組管理)
   - 4.3 [Supabase Storage 圖片庫管理](#43-supabase-storage-圖片庫管理)
   - 4.4 [參數管理「基本參數」區塊](#44-參數管理基本參數區塊)
   - 4.5 [人員名單欄位與操作改進](#45-人員名單欄位與操作改進)
   - 4.6 [任務角色後台指派修正（RLS 繞過）](#46-任務角色後台指派修正rls-繞過)
5. [功能調整與改進](#5-功能調整與改進)
   - 5.1 [主線任務修為與金幣可設定](#51-主線任務修為與金幣可設定)
   - 5.2 [課程報名流程改為 userId 識別](#52-課程報名流程改為-userid-識別)
   - 5.3 [CourseTab 重構：動態讀取課程、密碼自動踢出](#53-coursetab-重構動態讀取課程密碼自動踢出)
   - 5.4 [Header 顯示優化](#54-header-顯示優化)
   - 5.5 [排行榜顯示任務角色標籤](#55-排行榜顯示任務角色標籤)
   - 5.6 [名單驗證模式下隱藏自由註冊按鈕](#56-名單驗證模式下隱藏自由註冊按鈕)
   - 5.7 [指揮官頁籤新增「進入管理後台」捷徑](#57-指揮官頁籤新增進入管理後台捷徑)
   - 5.8 [updateGlobalSettings 批次更新方法](#58-updateglobalsettings-批次更新方法)
   - 5.9 [頁面標題動態化（document.title）](#59-頁面標題動態化documenttitle)
   - 5.10 [小隊長可在指揮所設定小隊名稱](#510-小隊長可在指揮所設定小隊名稱)
   - 5.11 [大隊長可在指揮部設定大隊名稱](#511-大隊長可在指揮部設定大隊名稱)
   - 5.12 [指揮部版面調整](#512-指揮部版面調整)
   - 5.13 [人生提示卡背面設計更正](#513-人生提示卡背面設計更正)
6. [大會中樞後台登入機制重構](#6-大會中樞後台登入機制重構)
7. [系統設定（SystemSettings）欄位總覽](#7-系統設定systemsettings欄位總覽)
8. [型別定義更新（types/index.ts）](#8-型別定義更新typesindexts)
9. [測試資料 Seed Script（supabase/seed.sql）](#9-測試資料-seed-scriptsupabaseseedsql)
10. [其他](#10-其他)

---

## 1. 資料庫結構變更（Supabase Migrations）

### `202603210000_daily_quest_config.sql` — 定課設定資料表

新建 `DailyQuestConfig` 資料表，讓定課（q1–q9）的定義從程式碼中分離，改為由資料庫驅動。欄位包含：
- `id`（q1–q9 等識別碼）、`title`（主標題）、`sub`（副標題）、`desc`（說明文字）
- `reward`（修為）、`coins`（金幣，`NULL` 表示沿用預設規則 `exp * 0.1`）、`dice`（骰子數）
- `icon`（圖示，可為 emoji 或 URL）、`limit`（每日上限，`NULL` = 無限）
- `sort_order`（排序）、`is_active`（是否啟用）

Migration 同時包含初始 seed，將原本 q1–q9 的設定值預填入資料庫。

### `202603210001_artifact_config.sql` — 法寶設定資料表

新建 `ArtifactConfig` 資料表，將「天庭藏寶閣」的六件法寶（a1–a6）定義移入資料庫管理。欄位涵蓋名稱、描述、效果說明、價格、是否為團隊共享法寶、持有上限、互斥法寶 ID 等。Migration 包含 a1–a6 的初始資料。

### `202603210002_artifact_config_bonus_cols.sql` — 法寶加成欄位

為 `ArtifactConfig` 新增四個結構化加成欄位：
- `exp_multiplier_personal`：個人修為倍率（如 a1 = 1.2）
- `exp_multiplier_team`：全隊修為倍率（如 a3 = 1.5）
- `exp_bonus_personal`：個人修為加成（如 a2 = +150）
- `exp_bonus_team`：全隊修為加成（預留欄位）

### `202603210003_achievement_config.sql` — 成就設定資料表

新建 `AchievementConfig` 資料表（超過 40 筆成就），欄位包含稀有度、圖示、解鎖提示、職業限定等。

### `202603210004_artifact_config_icon.sql` — 法寶圖示欄位

為 `ArtifactConfig` 補充 `icon` 欄位，`NULL` 時 fallback 到 `/images/artifacts/{id}.png`。

### `202603210005_system_settings_kv.sql` — SystemSettings 格式遷移

**重要**：將 `SystemSettings` 從「單一 wide-table 橫列格式」遷移為「key-value 格式」（每個設定值各佔一列，以 `SettingName` 為主鍵）。

### `202603220000_courses_table.sql` — 課程資料表

新建 `Courses` 資料表，課程定義改為資料庫驅動。預填原本寫死的兩筆課程（`class_b`、`class_c`）。

### `202603220001_course_address.sql` — 課程地址欄位

為 `Courses` 表新增 `address` 欄位，儲存完整地址。

### `202603220003_display_names.sql` — 大小隊自訂顯示名稱

- 為 `TeamSettings` 新增 `display_name` 欄位
- 新建 `BattalionSettings` 資料表

### `20260322_rename_roster_columns.sql` — Rosters 欄位重命名

**修正歷史語義錯誤**：
- `Rosters.squad_name`（原誤標為大隊）→ `big_team_name`（大隊法定名稱）
- `Rosters.team_name`（原誤標為小隊）→ `little_team_name`（小隊法定名稱）

---

## 2. 重大修正：大隊／小隊命名混淆全面修正

### 問題根源

`CharacterStats` 中的欄位語義正確：
- `BigTeamLeagelName` = 大隊（battalion）
- `LittleTeamLeagelName` = 小隊（squad）

但 `Rosters` 表中的舊欄位名稱語義**完全顛倒**（`squad_name` 存的是大隊、`team_name` 存的是小隊），導致 `importRostersData` 與 `autoAssignSquads` 在寫入 `CharacterStats` 時也**交叉寫反**，造成：
- `loadBattalionSquads` 始終返回空資料
- 所有小隊層級的操作（TeamSettings lookup、W4 傳愛審核、成就計算、戰鬥金幣分配）全部取到錯誤的欄位

### 修正範圍

**`app/actions/admin.ts`**
- `autoAssignSquads`：修正 `BigTeamLeagelName=$1`（battalionName）、`LittleTeamLeagelName=$2`（squadName）
- `importRostersData`：重命名 vars `squad_name→big_team_name`、`team_name→little_team_name`；修正 UPDATE 欄位順序；修正 Rosters INSERT 使用新欄位名

**`app/actions/quest.ts`**
- TeamSettings lookup：`.eq('BigTeamLeagelName', ...)` → `.eq('LittleTeamLeagelName', ...)`

**`app/actions/store.ts`**
- 購買法寶時的小隊成員數查詢：`BigTeamLeagelName` → `LittleTeamLeagelName`

**`app/actions/gemini.ts`**
- 4 處小隊查詢（含 label 顯示）全部修正

**`app/actions/combat.ts`**
- 戰鬥金幣分配：`.eq('team_name', attacker.LittleTeamLeagelName)`

**`app/actions/achievements.ts`**
- 隊友查詢、teamPunch/teamPerfect/teamStreak 均改用 `LittleTeamLeagelName`
- SELECT 補充 `LittleTeamLeagelName` 欄位

**`app/actions/team.ts`**
- 小隊名稱收集與同隊驗證改用 `LittleTeamLeagelName`

**`app/actions/w4.ts`**
- 小隊長初審：reviewer 查詢 SELECT 及比對欄位均改為 `LittleTeamLeagelName`

**`components/Tabs/ShopTab.tsx`**
- 團隊法寶購買：`userData.BigTeamLeagelName` → `userData.LittleTeamLeagelName`

**`app/page.tsx`**
- 新角色名冊同步：`newChar.BigTeamLeagelName = rosterMatch.big_team_name`（大隊）；`newChar.LittleTeamLeagelName = rosterMatch.little_team_name`（小隊）
- `loadBattalionSquads`：簡化為單一查詢，按 `LittleTeamLeagelName` 分組
- `fetchTeammates`：`.eq('LittleTeamLeagelName', teamName)`
- W4 傳愛提交：參數順序修正（小隊在前、大隊在後）

**`types/index.ts`**
- `Roster` 介面：移除舊 `squad_name`/`team_name`，新增 `big_team_name`/`little_team_name`

---

## 3. 新增功能

### 3.1 人生提示卡（LifeHintCard）

**新增檔案**：`components/LifeHintCard.tsx`

全新互動式抽卡元件，每位玩家每天可抽一張「人生提示卡」，卡片印有禪意短語。

**互動流程**：點擊「洗牌抽卡」→ 動畫洗牌（隨機交換 8 對）→ 10 張牌收攏 → 頂牌翻牌動畫顯示文字 → 儲存至 `localStorage`（key：`life_hint_card_{userId}`）

**客製化**：
- `SystemSettings.CardMottos`：自訂語句池
- `SystemSettings.CardBackImage`：base64 卡牌背面圖片

### 3.2 主線任務排程自動切換

管理員可在後台設定排程（`SystemSettings.MainQuestSchedule`，JSON 陣列 `MainQuestEntry[]`）。每次頁面重整，系統自動找出最新已生效的排程並更新 `TopicQuestTitle`、`TopicQuestReward`、`TopicQuestCoins`、`MainQuestAppliedId`，同時在 `TopicHistory` 建立歷史記錄。

### 3.3 任務角色（QuestRole）系統

為每位隊員提供協作職能定位。

**預設角色**（`lib/constants.tsx` → `DEFAULT_QUEST_ROLES`）：副隊長、叮叮隊長（共同定課）、樂樂隊長（歡樂氣氛）、衝衝隊長（鼓勵加分）、驚驚隊長（計分提醒）、抱抱隊長（關心夥伴）。

**資料儲存**：`CharacterStats.QuestRole`（JSON 字串，如 `'["副隊長","叮叮隊長"]'`）

**小隊長介面**（`CaptainTab`）：展開各角色，選擇指派或清除。Server Action `setMemberQuestRole` 驗證操作者身份與同隊條件。

**顯示位置**：Header 個人資訊標籤、排行榜名字旁 badge。

### 3.4 字體大小調整功能

Header 右上角「設定」按鈕展開四段選擇：小（100%）、中（112%）、大（125%）、特大（140%）。修改 `document.documentElement.style.fontSize`，偏好值儲存於 `localStorage`（key：`font_size_pref`）。

### 3.5 站台品牌客製化（SiteName / SiteLogo）

管理員可在後台設定站台名稱與 logo（base64）。登入頁與 `document.title` 即時反映。

### 3.6 課程系統動態化（Courses 資料表）

課程資料從 `lib/courseConfig.ts` 靜態設定改為資料庫 `Courses` 表。新增 Server Actions：`listCourses()`、`upsertCourse(course)`、`deleteCourse(id)`。

### 3.7 大隊自訂顯示名稱（BattalionSettings）

新增 `BattalionSettings` 資料表與對應 Server Actions（`getGroupDisplayNames`、`setSquadDisplayName`、`setBattalionDisplayName`）。

### 3.8 志工密碼每日自動輪換（Cron Job）

**新增**：`app/api/cron/rotate-vol-password/route.ts`

每日台灣時間 00:00（UTC 16:00）自動產生新六位數密碼，寫入 `SystemSettings.VolunteerPassword`。以 `CRON_SECRET` Bearer token 鑑權。`CourseTab` 同步加入密碼變更自動踢出機制。

### 3.9 LINE 帳號取消綁定

設定面板偵測到 `userData.LineUserId` 時顯示「LINE 取消綁定」按鈕，確認後呼叫 `unbindLine(userId)` 清空 `CharacterStats.LineUserId`。

### 3.10 快捷登入（Quick Login）

後台人員名單中每位成員旁新增「快捷登入」按鈕（LogIn 圖示）。點擊後以 **新分頁** 開啟 `/?uid={userId}`，不離開管理後台。

**實作細節**：
- 前端偵測 URL `?uid=` 參數，寫入 `sessionStorage`（tab 隔離，不影響主視窗 `localStorage`）
- 登入讀取優先順序：`sessionStorage` > `localStorage`
- `page.tsx` 新增 `handleQuickLogin(userId)` 並傳入 `AdminDashboard` 的 `onQuickLogin` prop

---

## 4. 後台管理（AdminDashboard）

### 4.1 後台大規模重構

`components/Admin/AdminDashboard.tsx` 從 243 行擴展至 3678 行。包含以下管理區塊：

| 區塊 | 功能 |
|------|------|
| 定課管理 | CRUD、匯入預設值、啟用/停用切換 |
| 法寶管理 | CRUD、匯入預設值、結構化加成欄位 |
| 成就管理 | CRUD、稀有度、職業限定 |
| 大小隊成員管理 | 人員列表、手動新增、歸屬修改 |
| 課程管理 | CRUD、查看各課程報名名單 |
| 顯示名稱管理 | 大隊與小隊自訂顯示名稱 |
| 任務角色管理 | 角色定義 CRUD（儲存於 `SystemSettings.QuestRoles`） |
| 人生提示卡設定 | 座右銘清單、卡牌背面圖片 |
| 圖片庫 | Supabase Storage `public` bucket 管理 |

共用元件：`IconPicker`（支援 Emoji 模式 + 圖片庫模式）。

### 4.2 後台手動新增成員 / 大小隊分組管理

**`adminCreateMember(data)`**：直接新增玩家，以手機號去除非數字為 `UserID`，若 ID 已存在則拒絕。

**`updateMemberAssignment(userId, ...)`**：批次更新大隊、小隊、職務。

### 4.3 Supabase Storage 圖片庫管理

新增 Server Actions：`listStorageFiles(folder)`、`listStorageFolders()`、`uploadStorageFile(formData)`、`deleteStorageFile(fullPath)`。

新增 API 路由：`app/api/admin/local-images/route.ts`，掃描 `public/images/` 回傳靜態圖片 URL。

### 4.4 參數管理「基本參數」區塊

AdminDashboard 參數管理第一個區塊為「基本參數」，可修改 `SiteName`。

### 4.5 人員名單欄位與操作改進

**欄位順序調整**：

| 舊順序 | 新順序 |
|--------|--------|
| 姓名｜小隊｜職位｜等級｜修為｜連勝｜罰金 | 姓名｜**大隊**｜小隊｜職位｜**任務角色**｜等級｜修為 |

**新增操作**：
- 每列詳情按鈕旁新增「快捷登入」（LogIn 圖示）
- 成員詳情 Modal 中新增任務角色切換按鈕組（可多選）
- 新增人員按鈕旁新增「重新整理」按鈕（RefreshCw 圖示）

**CSV 匯出**：欄位順序與畫面一致。

### 4.6 任務角色後台指派修正（RLS 繞過）

**問題**：Supabase anon key 受 RLS 限制，無法從後台寫入 `CharacterStats`。

**修正**：`adminSetMemberQuestRole` 改用 `connectDb()`（pg 直連，繞過 RLS）：

```ts
export async function adminSetMemberQuestRole(targetUserId: string, roles: string[]) {
    const client = await connectDb();
    const value = roles.length > 0 ? JSON.stringify(roles) : null;
    await client.query(
        `UPDATE "CharacterStats" SET "QuestRole" = $1 WHERE "UserID" = $2`,
        [value, targetUserId]
    );
}
```

---

## 5. 功能調整與改進

### 5.1 主線任務修為與金幣可設定

`WeeklyTopicTab` 改讀 `SystemSettings.TopicQuestReward`（預設 `'1000'`）與 `TopicQuestCoins`（預設 `'100'`），UI 標籤從「雙週挑戰」改為「主線任務」。

### 5.2 課程報名流程改為 userId 識別

`registerForCourse(userId, courseKey)` 直接以登入玩家 ID 識別，省略手動填表。舊的姓名+末三碼方法改名為 `registerForCourseByName` 保留，供獨立頁面使用。

### 5.3 CourseTab 重構：動態讀取課程、密碼自動踢出

- Props 改為 `{ courses, volunteerPassword, userId, userName }`
- `localStorage` key 改為動態 `course_{courseId}_reg`
- 志工登入後密碼變動自動踢出

### 5.4 Header 顯示優化

**小隊/大隊標籤格式**（依身份自動選擇）：
| 身份 | 格式 |
|------|------|
| IsCommandant | `第X大隊（暱稱）．大隊長` |
| IsCaptain | `第X小隊（暱稱）．小隊長` |
| 有 QuestRole | `第X小隊（暱稱）．角色1・角色2` |
| 一般成員 | 小隊暱稱或法定名稱 |

**字體調整**：
- `{Role} 修行中` 文字：`text-[10px]` → `text-xs`（與破貪等標籤同大小）
- 金幣數字：`text-[10px]` → `text-xs`，圖示 12px → 13px
- `{Role} 修行中` 外框：新增透明白色圓角框（`border border-white/15 px-2.5 py-1 rounded-lg`）

### 5.5 排行榜顯示任務角色標籤

`RankTab` 每位玩家名字旁新增青綠色細框 badge 顯示任務角色。新增 `questRoleDefs?: QuestRoleDef[]` prop。

### 5.6 名單驗證模式下隱藏自由註冊按鈕

`LoginForm` 新增 `registrationMode` prop，`'roster'` 時不顯示「尚未啟動轉生？」按鈕。

### 5.7 指揮官頁籤新增「進入管理後台」捷徑

`CommandantTab` 新增可選 `onGoToAdmin` prop，有此方法時頁籤頂端顯示紅色「進入大會管理後台 (GM)」按鈕。

### 5.8 updateGlobalSettings 批次更新方法

新增 `updateGlobalSettings(updates: Record<string, string>)` 使用 `Promise.all` 並行批次更新多個 `SystemSettings` 欄位。

### 5.9 頁面標題動態化（document.title）

新增 `useEffect` 監聽 `systemSettings.SiteName` 動態更新 `document.title`。

### 5.10 小隊長可在指揮所設定小隊名稱

`CaptainTab` 新增「✏️ 設定小隊名稱」按鈕，呼叫 `setSquadDisplayName`，Header 立即反映新名稱。

### 5.11 大隊長可在指揮部設定大隊名稱

`CommandantTab` 新增「✏️ 設定大隊名稱」按鈕，呼叫 `setBattalionDisplayName`，Header 立即反映。版面統一置中風格，Refresh 按鈕移至標題列右側。

### 5.12 指揮部版面調整

「傳愛申請終審」標題從 Header 卡片移出：無申請時顯示於空狀態框格上方，有申請時顯示於列表上方。

### 5.13 人生提示卡背面設計更正

卡牌背面改為黃色漸層（`#ffe066 → #ffd000 → #ffb800`）搭配彩虹光暈，翻牌動畫改為 `scaleX: 1→0→1` 水平折疊，相容所有瀏覽器及手機 Safari。

---

## 6. 大會中樞後台登入機制重構

### 6.1 GM 工具列新增「登入大會中樞」按鈕

`GmToolbar` 的「⚙ GM模式」旁新增快捷按鈕直接進入後台登入（`view = 'admin'`）。

### 6.2 雙模式登入驗證

| 模式 | 密令 | 操作者記錄 | 限制 |
|------|------|-----------|------|
| GM 模式 | 登入者手機末三碼 | 實際姓名 | 僅限 `IsGM=true` 帳號 |
| 直接登入 | `123`（預設通用密令） | `最高管理員` | 非 GM 帳號才可使用 |

### 6.3 操作記錄追蹤

新增 `adminOperator` state，傳入所有 `logAdminAction` 呼叫（臨時任務管理、`triggerWeeklySnapshot`、`checkWeeklyW3Compliance`、`importRostersData`）。

### 6.4 每次離開後台必須重新驗證

點擊「登入大會中樞」或後台「關閉」按鈕時重置 `adminAuth` + `adminOperator`。

---

## 7. 系統設定（SystemSettings）欄位總覽

| 欄位名稱 | 說明 | 備註 |
|---------|------|------|
| `TopicQuestTitle` | 本週主題名稱 | |
| `TopicQuestReward` | 主線任務修為（字串數字） | 預設 `'1000'` |
| `TopicQuestCoins` | 主線任務金幣（字串數字） | 預設 `'100'` |
| `MainQuestSchedule` | 主線任務排程（JSON，`MainQuestEntry[]`） | |
| `MainQuestAppliedId` | 最後自動套用的排程 ID | 避免重複觸發 |
| `WorldState` | 世界狀態（`normal`/`chaos` 等） | |
| `WorldStateMsg` | 世界狀態說明文字 | |
| `RegistrationMode` | `'open'` 自由註冊 / `'roster'` 名單驗證 | |
| `VolunteerPassword` | 志工入口密碼 | 每日 UTC 16:00 自動輪換 |
| `DefinedSquads` | 預設小隊列表（JSON）| `{teamId, squadId}[]` |
| `DefinedBattalions` | 預設大隊列表（JSON）| `string[]` |
| `SiteName` | 站台顯示名稱 | 登入頁與 tab 標題 |
| `SiteLogo` | 站台 logo（base64） | |
| `CardMottos` | 人生提示卡語句池（JSON，`string[]`） | |
| `CardBackImage` | 人生提示卡背面圖片（base64） | |

`QuestRoles`（`QuestRole[]` JSON）儲存於 `SystemSettings` 但透過 `questRoleDefs` 獨立 state 管理，未加入 TypeScript 介面。

---

## 8. 型別定義更新（types/index.ts）

### `CharacterStats` 介面
- 新增 `QuestRole?: string`：任務角色 JSON 陣列（如 `'["副隊長","叮叮隊長"]'`）

### `Roster` 介面
- 移除舊 `squad_name?: string`、`team_name?: string`（語義錯誤的舊欄位）
- 新增 `big_team_name?: string`（大隊法定名稱）
- 新增 `little_team_name?: string`（小隊法定名稱）

### `MainQuestEntry` 介面（新增）
```typescript
interface MainQuestEntry {
  id: string;
  title: string;
  reward: number;
  coins: number;
  startDate: string; // YYYY-MM-DD
}
```

### `Course` 介面（新增）
```typescript
interface Course {
  id: string;
  name: string;
  date: string;
  date_display: string;
  time: string;
  location: string;
  address?: string;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
}
```

### `SystemSettings` 介面
新增 10 個欄位（詳見 section 7）。

---

## 9. 測試資料 Seed Script（supabase/seed.sql）

完整重寫，涵蓋 3 大隊 × 3 小隊 = 9 小隊，共 67 人。

### 架構

| 大隊 | 小隊 | 大隊長 |
|------|------|--------|
| 第一大隊 | 第一～三小隊 | 陳志豪（末三碼 002） |
| 第二大隊 | 第四～六小隊 | 黃建明（末三碼 003） |
| 第三大隊 | 第七～九小隊 | 李永誠（末三碼 004） |

每個小隊：1 名小隊長 + 6 名成員

### 人員總覽

| 角色 | 人數 | UserID 範圍 |
|------|------|-------------|
| GM（林大統） | 1 | 912340001 |
| 大隊長 | 3 | 912340002–004 |
| 小隊長 | 9 | 912340005–013 |
| 成員 | 54 | 912340014–067 |

### Section 0 Migration（安全可重複執行）

- `CharacterStats`：`SquadName/TeamName` 重命名、新增 `LittleTeamNickName`、`BigTeamNickName`、`QuestRole`
- `SystemSettings`：新增 `DefinedBattalions`、`DefinedSquads`、`SiteName`、`SiteLogo`、`CardMottos`、`CardBackImage`、`MainQuestSchedule`、`MainQuestAppliedId`、`TopicQuestReward`、`TopicQuestCoins`
- `Rosters`：`squad_name → big_team_name`、`team_name → little_team_name`

### 資料內容

- `SystemSettings`：含 `DefinedBattalions`、`DefinedSquads`、`SiteName`、`RegistrationMode: 'roster'`
- `CharacterStats`：大隊長 `QuestRole: '["大隊長"]'`，小隊長 `QuestRole: '["小隊長"]'`（部分含第二角色）
- `DailyLogs`：模擬活躍/普通/陣亡分布
- `Rosters`：使用新 `big_team_name`/`little_team_name` 欄位，大隊長 `little_team_name: NULL`

---

## 10. 其他

### vercel.json
```json
{ "path": "/api/cron/rotate-vol-password", "schedule": "0 16 * * *" }
```
每日 UTC 16:00（台灣時間 00:00）自動輪換志工密碼。需設定 `CRON_SECRET` 環境變數。

### lib/constants.tsx
新增 `DEFAULT_QUEST_ROLES` 陣列匯出（六種預設任務角色）。管理員未自訂時系統使用此清單。

### app/class/b / app/class/c
改為 import `registerForCourseByName as registerForCourse`，行為不變，僅配合函式重命名。

### docs/center.md
新增後台管理功能完整技術說明文件（後台入口、各管理區塊說明、CSV 格式規範、資料庫欄位對照）。
