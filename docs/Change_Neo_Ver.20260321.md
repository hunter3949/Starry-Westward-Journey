# 版本更新說明 — 2026/03/21

**初始版本**：`41f3fc5`
**更新版本**：`4281bd6`
**更新日期**：2026-03-21
**編輯者**：Neo Huang

---

## 目錄

1. [資料庫結構變更（Supabase Migrations）](#1-資料庫結構變更supabase-migrations)
2. [新增功能](#2-新增功能)
   - 2.1 [人生提示卡（LifeHintCard）](#21-人生提示卡lifehintcard)
   - 2.2 [主線任務排程自動切換](#22-主線任務排程自動切換)
   - 2.3 [後台大規模重構：AdminDashboard](#23-後台大規模重構admindashboard)
   - 2.4 [任務角色（QuestRole）系統](#24-任務角色questrole系統)
   - 2.5 [字體大小調整功能](#25-字體大小調整功能)
   - 2.6 [站台品牌客製化（SiteName / SiteLogo）](#26-站台品牌客製化sitename--sitelogo)
   - 2.7 [課程系統動態化（Courses 資料表）](#27-課程系統動態化courses-資料表)
   - 2.8 [大隊自訂顯示名稱（BattalionSettings）](#28-大隊自訂顯示名稱battalionsettings)
   - 2.9 [志工密碼每日自動輪換（Cron Job）](#29-志工密碼每日自動輪換cron-job)
   - 2.10 [LINE 帳號取消綁定](#210-line-帳號取消綁定)
   - 2.11 [後台手動新增成員 / 大小隊分組管理](#211-後台手動新增成員--大小隊分組管理)
   - 2.12 [Supabase Storage 圖片庫管理](#212-supabase-storage-圖片庫管理)
3. [功能調整與改進](#3-功能調整與改進)
   - 3.1 [主線任務修為與金幣可設定](#31-主線任務修為與金幣可設定)
   - 3.2 [課程報名流程改為 userId 識別](#32-課程報名流程改為-userid-識別)
   - 3.3 [CourseTab 重構：動態讀取課程、密碼自動踢出](#33-coursetab-重構動態讀取課程密碼自動踢出)
   - 3.4 [Header 新增小隊名稱與任務角色顯示](#34-header-新增小隊名稱與任務角色顯示)
   - 3.5 [排行榜顯示任務角色標籤](#35-排行榜顯示任務角色標籤)
   - 3.6 [名單驗證模式下隱藏自由註冊按鈕](#36-名單驗證模式下隱藏自由註冊按鈕)
   - 3.7 [指揮官頁籤新增「進入管理後台」捷徑](#37-指揮官頁籤新增進入管理後台捷徑)
   - 3.8 [updateGlobalSettings 批次更新方法](#38-updateglobalsettings-批次更新方法)
   - 3.9 [頁面標題動態化（document.title）](#39-頁面標題動態化documenttitle)
4. [系統設定（SystemSettings）新增欄位](#4-系統設定systemsettings新增欄位)
5. [型別定義更新（types/index.ts）](#5-型別定義更新typesindexts)
6. [後台管理文件（docs/center.md）](#6-後台管理文件docscentermd)
7. [測試資料 Seed Script（supabase/seed.sql）](#7-測試資料-seed-scriptsupabaseseedsql)
8. [其他](#8-其他)

---

## 1. 資料庫結構變更（Supabase Migrations）

此版本新增了 9 個 migration 檔，大幅擴展資料庫結構，將原本寫死在程式碼中的設定資料全部移入資料庫管理。

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

為 `ArtifactConfig` 新增四個結構化加成欄位，以便將來讓 server 端計算邏輯直接讀取資料庫，而非寫死在程式碼中：
- `exp_multiplier_personal`：個人修為倍率（如 a1 = 1.2）
- `exp_multiplier_team`：全隊修為倍率（如 a3 = 1.5）
- `exp_bonus_personal`：個人修為加成（如 a2 = +150）
- `exp_bonus_team`：全隊修為加成（預留欄位）

同時 back-fill 了已知的 a1–a5 值。

### `202603210003_achievement_config.sql` — 成就設定資料表

新建 `AchievementConfig` 資料表，將成就殿堂的所有成就定義（超過 40 筆）移入資料庫管理。欄位包含：
- `rarity`（common / rare / epic / legendary）
- `icon`（emoji）、`hint`（未解鎖提示文字）、`description`（解鎖條件說明）
- `role_exclusive`（職業專屬，`NULL` = 全員可解鎖）

Migration 包含完整的初始 seed 資料。

### `202603210004_artifact_config_icon.sql` — 法寶圖示欄位

為 `ArtifactConfig` 補充 `icon` 欄位，允許使用 emoji 或 Supabase Storage 公開圖片 URL，`NULL` 時 fallback 到靜態圖檔 `/images/artifacts/{id}.png`。

### `202603210005_system_settings_kv.sql` — SystemSettings 格式遷移

**重要**：將 `SystemSettings` 從「單一 wide-table 橫列格式」遷移為「key-value 格式」（每個設定值各佔一列，以 `SettingName` 為主鍵）。

遷移步驟：
1. 為 `SystemSettings` 表新增 `Value` 欄位（idempotent）
2. 將 `global` 橫列中的五個設定（`TopicQuestTitle`、`WorldState`、`WorldStateMsg`、`RegistrationMode`、`VolunteerPassword`）各自拆出，寫成獨立的 KV 列
3. 若無志工密碼，預設填入 `'000000'`
4. 刪除舊的 `global` 橫列

此 migration 解決了 `page.tsx` 與 `global_dice_bonus` RPC 已改用 KV 格式但資料庫仍為舊格式的不一致問題。

### `202603220000_courses_table.sql` — 課程資料表

新建 `Courses` 資料表，讓課程定義從 `lib/courseConfig.ts` 靜態設定改為資料庫驅動。欄位包含課程 ID、名稱、日期、顯示日期、時間、地點、啟用狀態、排序。Migration 預填了原本寫死的兩筆課程（`class_b` 課後課、`class_c` 結業）。

### `202603220001_course_address.sql` — 課程地址欄位

為 `Courses` 表新增 `address` 欄位，用於儲存完整地址（原先 `location` 欄位只存地點名稱）。

### `202603220003_display_names.sql` — 大小隊自訂顯示名稱

- 為 `TeamSettings` 表新增 `display_name` 欄位，允許各小隊設定自訂顯示名稱
- 新建 `BattalionSettings` 資料表，記錄大隊名稱與其自訂顯示名稱

---

## 2. 新增功能

### 2.1 人生提示卡（LifeHintCard）

**新增檔案**：`components/LifeHintCard.tsx`

全新的互動式抽卡元件，在「每日定課」頁籤頂端顯示。每位玩家每天可抽一張「人生提示卡」，卡片上印有禪意短語（如「外求一物是一物，內求一心是全部」）。

**互動流程**：
1. 點擊「洗牌抽卡」按鈕，畫面出現 10 張疊疊的牌背
2. 系統動畫洗牌（隨機交換 8 對牌）
3. 洗牌後，10 張牌收攏到畫面中央
4. 頂牌放大，以 scaleX 翻牌動畫翻開正面，顯示隨機抽取的文字
5. 抽到的文字以梯度色背景展示卡片，並儲存到 `localStorage`（key 格式：`life_hint_card_{userId}`），下次進入該邏輯日直接顯示今日抽到的卡片內容而不再重複抽卡

**客製化**：
- 管理員可在後台設定「卡牌座右銘」清單（`SystemSettings.CardMottos`），作為自訂語句池取代預設的 10 句
- 管理員可在後台設定「卡牌背面圖片」（`SystemSettings.CardBackImage`），以 base64 data URL 儲存，取代預設的藍色漸層背面

### 2.2 主線任務排程自動切換

在 `app/page.tsx` 新增主線任務排程（`SystemSettings.MainQuestSchedule`）的前端自動套用邏輯。

**運作方式**：
- 管理員可在後台設定一組排程（JSON 陣列 `MainQuestEntry[]`），每筆含有 `id`、`title`（主題名稱）、`reward`（修為）、`coins`（金幣）、`startDate`（生效日期）
- `page.tsx` 掛載 `useEffect` 監聽 `MainQuestSchedule` 與 `MainQuestAppliedId` 的變化
- 每次重新整理頁面，系統會找出所有 `startDate <= 今日` 的排程中最新的一筆，若其 `id` 與已套用的 `MainQuestAppliedId` 不同，則自動呼叫 `updateGlobalSettings` 批次更新 `TopicQuestTitle`、`TopicQuestReward`、`TopicQuestCoins`、`MainQuestAppliedId` 四個設定值，同時在 `TopicHistory` 建立歷史記錄

### 2.3 後台大規模重構：AdminDashboard

`components/Admin/AdminDashboard.tsx` 從 243 行擴展到 3678 行，重寫整個後台介面。原本僅有的 LINE 機器人選單設定被完整的後台管理系統取代，包含以下新增管理區塊：

#### 定課管理（DailyQuestConfigSection）
- 以可收折面板呈現目前所有定課設定（從 `DailyQuestConfig` 資料庫讀取）
- 若資料庫尚無資料，自動顯示程式碼中的預設值作為預覽
- 提供「匯入預設定課」按鈕，一次將 q1–q9 的預設值寫入資料庫
- 可新增或編輯每項定課的所有欄位（ID、標題、副標題、說明、修為、金幣、骰子數、圖示、每日上限、排序、啟用狀態）
- 支援啟用/停用切換與刪除操作

#### 法寶管理（ArtifactConfigSection）
- 以可收折面板顯示法寶列表（從 `ArtifactConfig` 資料庫讀取）
- 同樣支援從 `ARTIFACTS_CONFIG` 常數匯入預設值
- 可編輯每件法寶的所有欄位，包含新增的結構化加成欄位（倍率/加成值）

#### 成就管理（AchievementConfigSection）
- 以可收折面板顯示所有成就定義（從 `AchievementConfig` 資料庫讀取）
- 支援匯入預設成就資料（從 `ACHIEVEMENTS` 常數）
- 可新增、編輯、刪除成就，設定稀有度、圖示、解鎖提示、職業限定等欄位

#### 大小隊成員管理（MemberManagementSection）
- 顯示所有玩家列表（從 `leaderboard` 讀取）
- 支援手動新增成員（輸入姓名、手機號、職業、大隊、小隊、是否為隊長/指揮官，Server Action: `adminCreateMember`）
- 支援直接在後台修改成員的大隊/小隊歸屬、隊長、指揮官、GM 身份

#### 課程管理（CourseManagementSection）
- 新增課程 CRUD 介面，可動態新增/修改/刪除課程（讀取 `Courses` 資料庫表）
- 支援查看各課程的報名名單（呼叫 `getCourseRegistrations`）

#### 顯示名稱管理（DisplayNamesSection）
- 提供大隊（`BattalionSettings`）與小隊（`TeamSettings.display_name`）的顯示名稱設定介面

#### 任務角色管理（QuestRoleConfigSection）
- 可新增/編輯/刪除任務角色定義（儲存於 `SystemSettings.QuestRoles`，JSON 格式）
- 每個角色有 id、名稱、職責說明（可多條）

#### 人生提示卡設定（CardMottosSection / CardBackImageSection）
- 提供座右銘清單的文字編輯介面（每行一句，儲存至 `SystemSettings.CardMottos`）
- 提供卡牌背面圖片上傳（以 base64 data URL 儲存至 `SystemSettings.CardBackImage`）

#### 圖片庫（StorageGallerySection）
- 整合 Supabase Storage 的 `public` bucket 管理
- 可瀏覽各子資料夾的圖片、上傳新圖片、刪除圖片

#### 共用圖示選擇器（IconPicker）
- 在定課、法寶、成就管理的表單中共用，支援兩種模式：
  - **Emoji 模式**：直接輸入/貼上 emoji
  - **圖片庫模式**：瀏覽 Supabase Storage 中的圖片，點擊套用

### 2.4 任務角色（QuestRole）系統

新增小隊「任務角色」的完整管理流程，為每位隊員在遊戲框架外增加明確的協作職能定位。

**角色定義**（`lib/constants.tsx` → `DEFAULT_QUEST_ROLES`）：
內建六種預設角色，包含副隊長、叮叮隊長（管理共同定課）、樂樂隊長（歡樂氣氛）、衝衝隊長（鼓勵加分）、驚驚隊長（計分提醒）、抱抱隊長（關心夥伴）。管理員可在後台自訂角色清單。

**資料儲存**：`CharacterStats.QuestRole`（新增欄位，見 section 5）

**小隊長操作介面**（`components/Tabs/CaptainTab.tsx`）：
新增「任務角色指派」區塊，小隊長可展開各角色，選擇將哪位隊員指派為該角色，或清除現有指派。Server Action 為 `setMemberQuestRole`（在 `fines.ts` 中實作），會驗證操作者是否為小隊長、目標成員是否在同一小隊。

**顯示位置**：
- Header 的個人資訊區塊顯示目前玩家的任務角色名稱（青綠色標籤）
- 排行榜個人排名中，每位玩家名字旁顯示任務角色標籤

### 2.5 字體大小調整功能

在 Header 右上角新增「設定」按鈕（齒輪圖示），展開後提供四段字體大小選擇：小（100%）、中（112%）、大（125%）、特大（140%）。

設定方式：修改 `document.documentElement.style.fontSize`，讓整個 app 以相對 rem 單位縮放。偏好值儲存至 `localStorage`（key：`font_size_pref`），下次開啟自動套用。

### 2.6 站台品牌客製化（SiteName / SiteLogo）

管理員可在後台設定站台名稱（`SystemSettings.SiteName`）與 logo 圖片（`SystemSettings.SiteLogo`，base64 data URL）。

登入頁面（`LoginForm`）與瀏覽器 tab 標題（`document.title`）皆會即時反映這兩個設定。未設定時維持預設值「大無限開運西遊」與 `/images/logo.png`。

### 2.7 課程系統動態化（Courses 資料表）

原本課程資料寫死在 `lib/courseConfig.ts`，此版本改為從資料庫 `Courses` 表讀取。

**新增 Server Actions**（`app/actions/course.ts`）：
- `listCourses()`：依 `sort_order` 排序讀取所有課程
- `upsertCourse(course)`：新增或更新課程
- `deleteCourse(id)`：刪除課程（同時刪除相關報名記錄）

管理員可在後台「課程管理」區塊動態新增、修改、刪除課程，不需改動程式碼。

### 2.8 大隊自訂顯示名稱（BattalionSettings）

新增 `BattalionSettings` 資料表（見 migration），允許各大隊設定獨立的顯示名稱（如大隊代號 "A" 顯示為 "龍騎大隊"）。小隊的顯示名稱則透過 `TeamSettings.display_name` 欄位管理。

**新增 Server Actions**（`app/actions/admin.ts`）：
- `getGroupDisplayNames()`：同時取得所有小隊與大隊的顯示名稱
- `setSquadDisplayName(squadName, displayName)`
- `setBattalionDisplayName(battalionName, displayName)`

### 2.9 志工密碼每日自動輪換（Cron Job）

**新增檔案**：`app/api/cron/rotate-vol-password/route.ts`

每日台灣時間 00:00（UTC 16:00）自動產生新的六位數隨機密碼，寫入 `SystemSettings.VolunteerPassword`。API 路由以 `CRON_SECRET` Bearer token 鑑權，防止外部呼叫。

**`vercel.json` 更新**：新增 cron job 設定：
```json
{ "path": "/api/cron/rotate-vol-password", "schedule": "0 16 * * *" }
```

`CourseTab` 同步加入「密碼變更時自動踢出已登入志工」的防護機制：若志工登入後 `volunteerPassword` 有異動，自動導回登入畫面並顯示提示訊息。

### 2.10 LINE 帳號取消綁定

玩家可在 Header 設定面板中取消 LINE 帳號綁定。

**運作方式**：
- 設定面板偵測到 `userData.LineUserId` 存在時，顯示「LINE 取消綁定」按鈕（紅色）
- 確認後呼叫 `unbindLine(userId)`（新增至 `app/actions/admin.ts`），將 `CharacterStats.LineUserId` 清空
- 客戶端同步更新 `userData` 狀態

### 2.11 後台手動新增成員 / 大小隊分組管理

**新增 Server Actions**（`app/actions/admin.ts`）：

`adminCreateMember(data)`：允許後台管理員直接新增玩家（不需透過正常報名流程）。以手機號碼去除非數字字元作為 `UserID`，若 ID 已存在則拒絕。初始化所有角色屬性為預設值（等級 1、修為 0、各屬性 10 等）。

`updateMemberAssignment(userId, teamName, squadName, isCaptain, isCommandant, isGM?)`：批次更新成員的大隊、小隊、職務。後台成員管理介面中每一列都可呼叫此方法，修改完後自動觸發 `leaderboard` 資料刷新。

### 2.12 Supabase Storage 圖片庫管理

**新增 Server Actions**（`app/actions/admin.ts`）：

後台新增完整的 Supabase Storage 管理功能，使用 `public` bucket：
- `listStorageFiles(folder)`：列出指定資料夾下的圖片（過濾佔位符 `.emptyFolderPlaceholder`）
- `listStorageFolders()`：列出 bucket 根目錄下的所有資料夾
- `uploadStorageFile(formData)`：上傳圖片至指定資料夾
- `deleteStorageFile(fullPath)`：刪除圖片

另外保留了原本的 `uploadQuestIcon` 方法（上傳至 `quest-icons/` 路徑）。

**新增 API 路由**（`app/api/admin/local-images/route.ts`）：
掃描 `public/images/` 目錄下的靜態圖片，回傳公開 URL 列表。`IconPicker` 元件的「圖片庫」分頁利用此 API 瀏覽本地靜態圖片。

---

## 3. 功能調整與改進

### 3.1 主線任務修為與金幣可設定

**受影響檔案**：`components/Tabs/WeeklyTopicTab.tsx`

主線任務（`t1` 主題親證）原本修為固定為 1000、金幣固定為 100。現在改為讀取 `SystemSettings` 的設定值：
- `systemSettings.TopicQuestReward`（預設 `'1000'`）
- `systemSettings.TopicQuestCoins`（預設 `'100'`）

`topicExp` 計算（含 a4 幌金繩 ×1.5 倍率）以此動態值為基礎。打卡按鈕傳入 server 的 `reward` 也改用動態值，確保前後一致。

UI 同時將標籤從「雙週挑戰」改為「主線任務」，更符合實際定位。

### 3.2 課程報名流程改為 userId 識別

**受影響檔案**：`app/actions/course.ts`

原本的 `registerForCourse` 需要玩家輸入姓名與手機末三碼進行比對，改為新版的 `registerForCourse(userId, courseKey)`，直接以登入玩家的 `userId` 查詢，省略手動填表步驟。

舊的「姓名 + 末三碼」方法重命名為 `registerForCourseByName` 保留，供獨立頁面（`/class/b`、`/class/c`）繼續使用（兩頁面以 alias import 方式調整，行為不變）。

### 3.3 CourseTab 重構：動態讀取課程、密碼自動踢出

**受影響檔案**：`components/Tabs/CourseTab.tsx`

- Props 介面從 `{ userData: CharacterStats, volunteerPassword }` 改為 `{ courses: Course[], volunteerPassword, userId, userName }`，課程清單由父元件傳入（已從資料庫讀取）
- `localStorage` key 從靜態 `STORAGE_KEYS` map 改為動態產生：`course_{courseId}_reg`
- 報名頁面移除姓名/手機末三碼輸入表單，改為直接以 `userId` 呼叫 `registerForCourse`
- 只顯示 `is_active === true` 的課程
- 志工登入後，若 `volunteerPassword` 有變動，自動踢出並要求重新輸入

### 3.4 Header 新增小隊名稱與任務角色顯示

**受影響檔案**：`components/Layout/Header.tsx`

玩家名字下方新增一列，以標籤形式顯示：
- 所屬小隊名稱（灰色標籤）
- 任務角色名稱（青綠色標籤，`questRoleName` prop 由父元件傳入）

Header 的 Props 新增 `fontSize`、`onFontSizeChange`、`questRoleName`、`onUnbindLine`。

### 3.5 排行榜顯示任務角色標籤

**受影響檔案**：`components/Tabs/RankTab.tsx`

個人排名列表中，每位玩家名字旁新增小型任務角色標籤（若 `CharacterStats.QuestRole` 有值且在 `questRoleDefs` 中找到對應名稱）。標籤樣式為青綠色細框 badge。

`RankTab` Props 新增 `questRoleDefs?: QuestRoleDef[]`。

### 3.6 名單驗證模式下隱藏自由註冊按鈕

**受影響檔案**：`components/Login/LoginForm.tsx`

`LoginForm` 新增 `registrationMode` prop。當 `registrationMode === 'roster'` 時，「尚未啟動轉生？」按鈕不渲染，避免讓不在名單上的人嘗試自行註冊。

### 3.7 指揮官頁籤新增「進入管理後台」捷徑

**受影響檔案**：`components/Tabs/CommandantTab.tsx`

`CommandantTab` 新增可選 prop `onGoToAdmin`。若傳入此方法，頁籤頂端顯示一個紅色漸層的「進入大會管理後台 (GM)」按鈕，讓具有 IsGM 身份的使用者可以快速切換至後台，不需回到登入頁。

（`app/page.tsx` 中，`showCommandantTab` 條件包含 `isGM`，並將 `() => setView('admin')` 傳入此 prop。）

### 3.8 updateGlobalSettings 批次更新方法

**受影響檔案**：`app/page.tsx`

新增 `updateGlobalSettings(updates: Record<string, string>)` 方法，允許一次批次更新多個 `SystemSettings` 欄位（使用 `Promise.all` 並行執行 upsert）。原本的 `updateGlobalSetting`（單筆）仍保留。

主線任務自動切換需要同時更新四個欄位（title, reward, coins, appliedId），此方法正是為此設計，並同時傳遞給 `AdminDashboard` 使用。

### 3.9 頁面標題動態化（document.title）

**受影響檔案**：`app/page.tsx`

新增 `useEffect` 監聽 `systemSettings.SiteName`，動態更新 `document.title`。未設定時顯示預設的「大無限開運西遊」。

---

## 4. 系統設定（SystemSettings）新增欄位

此版本在 `SystemSettings` 介面新增以下欄位（均為 key-value 格式儲存）：

| 欄位名稱 | 說明 | 備註 |
|---------|------|------|
| `TopicQuestReward` | 主線任務修為（字串數字）| 預設 `'1000'` |
| `TopicQuestCoins` | 主線任務金幣（字串數字）| 預設 `'100'` |
| `MainQuestSchedule` | 主線任務排程（JSON 字串，`MainQuestEntry[]`）| 用於自動切換主題 |
| `MainQuestAppliedId` | 最後一次自動套用的排程項目 ID | 避免重複觸發 |
| `DefinedSquads` | 預設小隊列表（JSON 字串）| 目前供後台使用 |
| `DefinedBattalions` | 預設大隊列表（JSON 字串）| 目前供後台使用 |
| `SiteName` | 站台顯示名稱 | 顯示於登入頁與 tab 標題 |
| `SiteLogo` | 站台 logo（base64 data URL）| 顯示於登入頁 |
| `CardMottos` | 人生提示卡語句池（JSON 字串，`string[]`）| 空時使用內建 10 句 |
| `CardBackImage` | 人生提示卡背面圖片（base64 data URL）| 空時使用藍色漸層 |

這些欄位在 `page.tsx` 的資料載入區塊（`setSystemSettings({...})` 呼叫）中均已明確列出，確保正確載入。

`QuestRoles` 欄位（`QuestRole[]` JSON）雖也儲存在 `SystemSettings` 中，但未加入 TypeScript 介面，而是透過 `questRoleDefs` 獨立 state 管理。

---

## 5. 型別定義更新（types/index.ts）

### `CharacterStats` 介面
- `LineUserId` 移除了原本附在後面的 `// LINE Login 綁定 ID` 注釋（注釋誤挪到下一欄）
- 新增 `QuestRole?: string`：記錄玩家目前擔任的任務角色 ID（對應 `DEFAULT_QUEST_ROLES` 中的 `id`）

### 新增 `MainQuestEntry` 介面
```typescript
interface MainQuestEntry {
  id: string;
  title: string;
  reward: number;
  coins: number;
  startDate: string; // YYYY-MM-DD
}
```
用於主線任務排程，每筆記錄代表一個將在指定日期生效的主線任務設定。

### `SystemSettings` 介面
新增 10 個欄位（詳見 section 4）。

### 新增 `Course` 介面
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
對應新建的 `Courses` 資料庫表，用於動態課程管理。

---

## 6. 後台管理文件（docs/center.md）

**新增檔案**：`docs/center.md`

新增後台管理功能的完整技術說明文件，涵蓋：
- 後台入口與密碼說明
- 各管理區塊的功能說明（全域設定、DDA 共業系統、戰隊名冊、主線任務排程、定課/法寶/成就設定、課程管理等）
- CSV 批量匯入名冊的格式規範
- 各設定對應的資料庫欄位說明

---

## 7. 測試資料 Seed Script（supabase/seed.sql）

**新增檔案**：`supabase/seed.sql`

提供完整的開發/測試環境資料建立腳本，可在 Supabase Dashboard SQL Editor 執行。內容包含：
- 清空所有相關資料表（依外鍵順序）
- 插入 2 個隊伍（龍騎隊、鳳翔隊）的 `TeamSettings`
- 插入 11 位虛擬玩家（含 1 位指揮官、2 位小隊長、8 位一般成員）的 `CharacterStats`
- 插入對應的 `Rosters` 名冊

所有虛擬玩家的 UserID 使用 `9123400XX` 格式，登入末三碼依序為 001–011，方便測試不同角色的功能。

---

## 8. 其他

### vercel.json
新增 cron job 設定：
```json
{
  "path": "/api/cron/rotate-vol-password",
  "schedule": "0 16 * * *"
}
```
每日 UTC 16:00（台灣時間 00:00）自動輪換志工密碼。需在 Vercel 環境變數中設定 `CRON_SECRET`。

### lib/constants.tsx
新增 `DEFAULT_QUEST_ROLES` 陣列匯出，定義六種預設任務角色。管理員未自訂時，系統使用此預設清單。

### app/class/b/page.tsx 與 app/class/c/page.tsx
兩個獨立報名頁面改為 import `registerForCourseByName as registerForCourse`，行為完全不變（仍使用姓名 + 末三碼識別），僅為配合 `course.ts` 的函式重命名而調整 import。

---

## 9. 後續補充變更（2026/03/21 對話追加）

以下為本次對話中額外完成、未包含在原始 commit 範圍內的功能調整。

### 9.1 小隊長可在指揮所設定小隊名稱

**相關檔案**：`components/Tabs/CaptainTab.tsx`、`app/page.tsx`

小隊長在「指揮所」頁籤的 Header 區塊，新增「✏️ 設定小隊名稱」按鈕。

**運作方式**：
- 點擊後展開文字輸入欄，輸入自訂名稱後按「儲存」
- 呼叫已存在的 server action `setSquadDisplayName(teamName, displayName)`，寫入 `TeamSettings.display_name`
- 儲存成功後 Header 立即顯示新名稱；原系統代號（`TeamName`）以小字顯示在下方
- 留空儲存可清除自訂名稱，恢復顯示系統代號

`page.tsx` 新增：讀取 `teamSettings?.display_name` 並以 `teamDisplayName` prop 傳入 `CaptainTab`。

---

### 9.2 大隊長可在指揮部設定大隊名稱

**相關檔案**：`components/Tabs/CommandantTab.tsx`、`app/page.tsx`

大隊長在「指揮部」頁籤的 Header 區塊，新增「✏️ 設定大隊名稱」按鈕。

**運作方式**：
- 點擊後展開文字輸入欄，輸入自訂名稱後按「儲存」
- 呼叫已存在的 server action `setBattalionDisplayName(battalionName, displayName)`，寫入 `BattalionSettings.display_name`
- 儲存成功後 Header 立即顯示新名稱；原系統大隊代號（`SquadName`）以小字顯示在下方
- 若儲存失敗，以 `onShowMessage` 顯示錯誤訊息

`page.tsx` 新增：登入時同步讀取 `BattalionSettings.display_name`，存入 `battalionDisplayName` state 並傳入 `CommandantTab`。

**版面微調（後續修正）**：Header 卡片統一調整為與小隊長相同的置中風格：
- 卡片整體加上 `text-center`，大隊名稱與標籤文字皆置中
- Refresh 按鈕移至標題列右側
- 「設定大隊名稱」區塊加入 `border-t` 橫線分隔，按鈕加上 `mx-auto` 置中

---

### 9.3 參數管理新增「基本參數」區塊

**相關檔案**：`components/Admin/AdminDashboard.tsx`

AdminDashboard 參數管理頁面的第一個區塊改為「基本參數」，包含：
- **網站 / 登入頁顯示名稱**：可修改 `SiteName`，留空則回退至預設值「大無限開運西遊」
- （規劃中）登入頁 Logo 圖片上傳

---

### 9.4 人生提示卡背面設計更正

**相關檔案**：`components/LifeHintCard.tsx`

卡牌背面（未翻開狀態）改為黃色漸層搭配彩虹光暈設計，符合用戶指定的視覺風格：
- 背景：黃色漸層（`#ffe066 → #ffd000 → #ffb800`）
- 裝飾：橫紋線條 + 底部彩虹 conic-gradient + 中心白色光點
- 正面（翻開後有文字）：粉色系漸層（`#ffecd2 → #fcb69f → #f8a5c2 → #ffeaa7`）

翻牌動畫改為 `scaleX: 1→0→1` 水平折疊效果，完全不依賴 `backface-visibility`，相容所有瀏覽器及手機 Safari。

---

### 9.5 指揮部版面調整

**相關檔案**：`components/Tabs/CommandantTab.tsx`

「傳愛申請終審」標題與說明文字從 Header 卡片中移出，改為：
- **無申請時**：顯示在空狀態框格內上方，搭配分隔線後才顯示「目前無待終審申請」
- **有申請時**：顯示在申請列表上方

---

## 10. 測試資料（seed.sql 重構）

**相關檔案**：`supabase/seed.sql`

重新設計測試資料以反映正式三大隊架構，完整覆蓋大隊長、小隊長、一般成員三種角色層級。

### 架構設計

| 大隊 | 小隊 | 大隊長 |
|------|------|--------|
| 第一大隊 | 第一小隊、第二小隊、第三小隊 | 陳志豪（末三碼 002） |
| 第二大隊 | 第四小隊、第五小隊、第六小隊 | 黃建明（末三碼 003） |
| 第三大隊 | 第七小隊、第八小隊、第九小隊 | 李永誠（末三碼 004） |

- 小隊編號**全域不重置**，第二大隊從第四小隊接續
- 每個小隊：1 名小隊長 + 2 名成員
- GM（林大統，末三碼 001）：`IsCommandant=true`、`IsGM=true`

### 人員總覽（共 31 人）

| 角色 | 人數 | UserID 範圍 | 末三碼 |
|------|------|-------------|--------|
| GM | 1 | 912340001 | 001 |
| 大隊長 | 3 | 912340002–004 | 002–004 |
| 小隊長 | 9 | 912340005–013 | 005–013 |
| 成員 | 18 | 912340014–031 | 014–031 |

### 登入方式

貼上 `supabase/seed.sql` 全文至 **Supabase Dashboard → SQL Editor → New query → Run**。

登入：**姓名 + 手機末三碼**（例：`陳志豪` + `002`）

---

## 11. 大會中樞後台登入機制重構

**相關檔案**：`app/page.tsx`、`app/actions/admin.ts`

### 11.1 GM 工具列新增「登入大會中樞」按鈕

GM 模式工具列（`GmToolbar`）的「⚙ GM模式」標籤旁新增快捷按鈕，點擊後直接進入後台登入畫面（`view = 'admin'`）。

### 11.2 雙模式登入驗證

| 模式 | 密令 | 操作者記錄 | 限制 |
|------|------|-----------|------|
| GM 模式 | 登入者手機末三碼 | 實際姓名（`userData.Name`） | 僅限 `IsGM=true` 帳號 |
| 直接登入 | `123`（預設通用密令） | `最高管理員` | 非 GM 帳號才可使用 |

**GM 帳號無法使用通用密令 `123` 登入**，強制以個人末三碼驗證。

### 11.3 操作記錄追蹤

新增 `adminOperator` state，驗證成功後依登入模式設定操作者名稱，並傳入所有 `logAdminAction` 呼叫：

- `app/page.tsx`：臨時任務新增 / 切換 / 刪除
- `app/actions/admin.ts`：`triggerWeeklySnapshot`、`checkWeeklyW3Compliance`、`importRostersData` 均新增 `actor` 參數

### 11.4 每次離開後台必須重新驗證

- 點擊「登入大會中樞」按鈕：重置 `adminAuth` + `adminOperator`
- 點擊後台「取消 / 關閉」按鈕（`onClose`）：同樣重置，確保每次進入都需重新輸入密令
- 關閉後依登入狀態返回：已登入 → 用戶介面；未登入 → 登入頁
