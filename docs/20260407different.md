# 星光版 vs 巨笑版 — 系統差異分析

> 分析日期：2026-04-07
> 星光版路徑：`/example/Starry-Westward-Journey`
> 巨笑版路徑：`/Starry-Westward-Journey`

---

## 一、架構差異總覽

| 面向 | 星光版 | 巨笑版 |
|------|--------|--------|
| **Next.js 版本** | 16.1.6 | 16.1.6 |
| **dependencies** | 完全相同 | 完全相同 |
| **app/page.tsx** | 1,892 行 | 1,813 行 |
| **AdminDashboard** | 96 行（薄殼） + 12 模組檔案 | 5,584 行（單體） |
| **Tab 元件總行數** | 2,816 行 | 3,273 行 |
| **Server Actions 數量** | 16 檔案 | 15 檔案 |
| **DB Migrations** | 28 檔案 | 31 檔案 |
| **元件載入方式** | `next/dynamic` 懶載入 | 靜態 import |
| **欄位命名風格** | `SquadName / TeamName` | `LittleTeamLeagelName / BigTeamLeagelName` |

---

## 二、後台管理架構（最大差異）

### 星光版：模組化架構
```
components/Admin/
  AdminDashboard.tsx       (96 行，外殼)
  AdminContext.tsx          (全局 Context)
  AdminShell.tsx            (Layout + 側欄)
  modules/
    HomeModule.tsx          首頁總覽
    PersonnelModule.tsx     人員管理
    CourseModule.tsx         課程管理
    TasksModule.tsx         任務管理
    ConfigModule.tsx        參數管理
    GalleryModule.tsx       圖片庫
    LogsModule.tsx          操作日誌
    ReviewModule.tsx        審核管理
    MonopolyModule.tsx      大富翁設定
    DashboardModule.tsx     統計儀表板
```
- 每模組獨立檔案，責任分明
- AdminContext 提供跨模組共享狀態
- AdminShell 處理 Layout + 側欄導航

### 巨笑版：單體架構
```
components/Admin/
  AdminDashboard.tsx       (5,584 行，全功能)
```
- 所有管理功能（人員、課程、任務、參數、圖片庫、成就、法寶、定課）集中在一個檔案
- 透過 `adminModule` state 切換模組視圖
- 包含內嵌子元件：`DailyQuestConfigSection`、`GameItemConfigSection`、`AchievementConfigSection`、`ImageGallerySection`、`IconPicker`

### 優缺比較

| | 星光版（模組化） | 巨笑版（單體） |
|--|--|--|
| **可維護性** | 佳 — 每檔案職責清楚，改一模組不影響他模組 | 差 — 5,584 行難以 review，改動風險高 |
| **開發效率** | 中 — 需在多檔案間跳轉 | 初期快 — 一個檔案搜尋方便，但後期劣化 |
| **Context 共享** | 明確 — AdminContext 定義好共享介面 | 隱式 — 靠 useState + props 向下傳 |
| **Code Splitting** | 天然支持 — 每模組可獨立 lazy load | 無法拆分 — 整包載入 |

**建議**：採用星光版的模組化架構，但保留巨笑版內已完成的子功能元件。

---

## 三、頁面 / 路由差異

### 僅星光版有
| 路由 | 功能 |
|------|------|
| `/app/admin/page.tsx` | 獨立管理頁面（非嵌入 app/page.tsx 內） |
| `/api/admin/monopoly-settings/route.ts` | 大富翁設定 API |
| `/api/cron/w3-fine/route.ts` | W3 罰款自動結算 Cron |

### 僅巨笑版有
| 路由 | 功能 |
|------|------|
| `/api/cron/rotate-vol-password/route.ts` | 志工密碼輪轉 Cron |

### 共有但邏輯不同
| 路由 | 差異 |
|------|------|
| `app/page.tsx` | 星光版用 `next/dynamic` 懶載入重元件；巨笑版靜態 import，多了字體大小切換、開運大富翁入口 |

---

## 四、Tab 元件差異（前台功能）

### 行數對比
| Tab | 星光版 | 巨笑版 | 差距 | 誰較完整 |
|-----|--------|--------|------|----------|
| CommandantTab (大隊長) | 184 行 | **773 行** | 4.2x | **巨笑版** — 罰款追蹤、課程管理、大富翁管理、W4 大隊審核 |
| CaptainTab (小隊長) | 557 行 | **633 行** | +14% | **巨笑版** — 隊務角色分配 (QuestRole)、更完整罰款流程 |
| PeakTrialTab (巔峰試煉) | **470 行** | 268 行 | 1.8x | **星光版** — 更完整的報名/審核/獎勵 UI |
| CourseTab (課程) | **401 行** | 348 行 | +15% | **星光版** — 更多課程互動細節 |
| DailyQuestsTab (日課) | 178 行 | **227 行** | +28% | **巨笑版** — 金幣獎勵欄位 (coins) |
| ShopTab (商店) | 296 行 | 296 行 | 相同 | — |
| RankTab (排行) | 187 行 | 196 行 | +5% | 近乎相同 |
| AchievementsTab (成就) | 131 行 | 128 行 | -2% | 近乎相同 |
| StatsTab (屬性) | 92 行 | 85 行 | -8% | 近乎相同 |
| WeeklyTopicTab (週課) | 320 行 | 319 行 | 相同 | — |

---

## 五、Server Actions 差異

### 行數對比
| Action | 星光版 | 巨笑版 | 誰較完整 |
|--------|--------|--------|----------|
| **combat.ts** | **369 行** | 212 行 | **星光版** — 更詳細戰鬥邏輯（怪物掉落、Mimic、心魔加成） |
| **fines.ts** | 270 行 | **501 行** | **巨笑版** — 三層罰款流程（隊員→小隊長→大會）、SquadFineSubmissions |
| **peakTrials.ts** | 153 行 | **359 行** | **巨笑版** — 完整試煉 CRUD、審核、影片上傳 |
| **quest.ts** | 150 行 | **219 行** | **巨笑版** — 金幣 (coins) 獎勵計算、更多檢查 |
| **course.ts** | 154 行 | **245 行** | **巨笑版** — 完整課程 CRUD、簽到記錄者追蹤 |
| **w4.ts** | 213 行 | **255 行** | **巨笑版** — 多了大隊長審核層 (battalion_approved) |
| **admin.ts** | 755 行 | **926 行** | **巨笑版** — 多了 DailyQuestConfig / ArtifactConfig / AchievementConfig CRUD、圖片庫管理 |
| **gemini.ts** | **320 行** | 297 行 | **星光版** — 更詳細 AI prompt |
| **store.ts** | **171 行** | 168 行 | 近乎相同 |
| **achievements.ts** | 335 行 | 335 行 | 完全相同 |

### 僅星光版有
| 檔案 | 功能 |
|------|------|
| `peak_trial.ts` | 巔峰試煉 v2（與 peakTrials.ts 並存） |
| `player.ts` | 玩家屬性操作（HP、座標、骰子儲存） |
| `skills.ts` | 技能系統 Action |

### 僅巨笑版有
| 檔案 | 功能 |
|------|------|
| `boardGame.ts` | 開運大富翁 — 福報/現金兌換、人生歸零 |

---

## 六、資料庫 Schema 差異

### 欄位命名風格
| 概念 | 星光版 | 巨笑版 |
|------|--------|--------|
| 小隊名稱 | `SquadName` / `squad_name` | `LittleTeamLeagelName` |
| 大隊名稱 | `TeamName` / `team_name` | `BigTeamLeagelName` |
| 隊伍暱稱 | 不支援 | `LittleTeamNickName` / `BigTeamNickName` |
| W4 審核 | pending → squad_approved → approved | pending → squad_approved → **battalion_approved** → approved |

### 僅星光版有的欄位
| 欄位 | 所屬表 | 用途 |
|------|--------|------|
| `IsBlessed` | CharacterStats | 祝福狀態（d7 渾天至寶珠） |
| `DemonDropBoostSeasonal` | CharacterStats | 心魔殘骸累積掉落加成（每次 +0.05） |
| `d7_activated_at` | TeamSettings | d7 啟動時間 |

### 僅巨笑版有的欄位/表
| 欄位/表 | 用途 |
|---------|------|
| `QuestRole` (CharacterStats) | 隊務角色 JSON（副隊長、叮叮隊長等 6 種） |
| `coins` (TemporaryQuest) | 臨時任務金幣獎勵 |
| `BonusQuestConfig` (SystemSettings) | 加分任務規則 JSON |
| `MainQuestSchedule` (SystemSettings) | 主線任務排程 JSON |
| `BoardGame*` 系列 (SystemSettings) | 大富翁相關設定 (7 個 key) |
| `DailyQuestConfig` 表 | DB 驅動定課管理 |
| `ArtifactConfig` 表 | DB 驅動法寶管理 |
| `AchievementConfig` 表 | DB 驅動成就管理 |
| `BoardGameStats` 表 | 大富翁玩家資料 |
| `BoardGameTransactions` 表 | 大富翁交易紀錄 |
| `FinePaymentRecords` 表 | 罰款繳付紀錄 |
| `SquadFineSubmissions` 表 | 小隊罰款上繳 |

### Migration 差異
- **星光版獨有**：RLS 全表啟用、金骰兌換、加分任務規則、效能索引、祝福機制、巔峰試煉 v2、d 系列道具欄位、打卡 RPC、罰款 RPC、戰鬥獎勵修正
- **巨笑版獨有**：DailyQuestConfig/ArtifactConfig/AchievementConfig CRUD 表、SystemSettings KV、課程表、欄位改名、seed.sql

---

## 七、獨特功能對比

### 僅星光版有
| 功能 | 說明 | 價值 |
|------|------|------|
| **Portal 傳送系統** | 地圖傳送門 + 回傳門，PORTAL_DESTINATIONS 定義 | 地圖探險核心玩法 |
| **d7 祝福機制** | 渾天至寶珠啟動後全隊 2 天梵天庇護 | 稀有團隊 Buff |
| **DemonDropBoost** | 心魔殘骸累積掉落加成（每次 +0.05） | 長線成長感 |
| **process_checkin RPC** | 打卡邏輯移入 PostgreSQL RPC（原子性更強） | 資料一致性 |
| **fines RPC** | 罰款計算 RPC | 資料一致性 |
| **RLS 全表啟用** | Row Level Security 遷移 | 安全性 |
| **next/dynamic 懶載入** | 重元件 lazy load | 首屏效能 |
| **Admin 獨立頁面** | `/app/admin/page.tsx` | URL 直接進入後台 |
| **player.ts / skills.ts** | 玩家操作、技能系統 | 更完整角色系統 |
| **MessageBox 圖片支援** | 彈窗可帶 image | 更豐富回饋 |
| **TOPIC_PHASES** | 硬編碼週次日期範圍（W1-W7+） | 精確週期控制 |

### 僅巨笑版有
| 功能 | 說明 | 價值 |
|------|------|------|
| **開運大富翁** | 福報/現金雙幣、匯率、人生歸零 | 額外迷你遊戲 |
| **DB 驅動定課管理** | DailyQuestConfig 表 + 後台 CRUD | 不需改 code 即可調整定課 |
| **DB 驅動法寶管理** | ArtifactConfig 表 + 後台 CRUD + icon | 不需改 code 即可調整法寶 |
| **DB 驅動成就管理** | AchievementConfig 表 + 後台 CRUD | 不需改 code 即可調整成就 |
| **圖片庫管理** | Supabase Storage 瀏覽/上傳/刪除 | 視覺資源集中管理 |
| **IconPicker** | Emoji + 圖片庫統一選擇器 | 定課/法寶/成就圖示設定 |
| **隊務角色分配** | 6 種角色（副隊長、叮叮、樂樂等） | 隊伍管理精細化 |
| **大隊長審核層** | W4 新增 battalion_approved 狀態 | 三層審核更嚴謹 |
| **隊伍暱稱** | LittleTeamNickName / BigTeamNickName | 隊伍個性化 |
| **字體大小切換** | 4 級 (100%-140%) + localStorage | 長輩無障礙 |
| **完整罰款流程** | 隊員→小隊長→大會三層、FinePaymentRecords | 財務追蹤完整 |
| **課程 CRUD** | 後台建立/編輯/刪除課程 | 靈活排課 |
| **金幣獎勵欄位** | 定課 + 臨時任務可設定 coins | 經濟系統更彈性 |
| **志工密碼輪轉** | Cron 自動更換 VolunteerPassword | 安全性 |
| **MainQuestSchedule** | 主線任務排程 JSON | 提前規劃多週課表 |
| **BonusQuestConfig** | 加分任務規則（關鍵字觸發獎勵） | 靈活任務設計 |

---

## 八、元件獨有列表

### 僅星光版
| 元件 | 用途 |
|------|------|
| `AdminContext.tsx` | 後台全局 Context |
| `AdminShell.tsx` | 後台 Layout + 側欄 |
| `modules/ConfigModule.tsx` | 參數設定模組 |
| `modules/CourseModule.tsx` | 課程管理模組 |
| `modules/DashboardModule.tsx` | 統計儀表板模組 |
| `modules/GalleryModule.tsx` | 圖片庫模組 |
| `modules/HomeModule.tsx` | 首頁總覽模組 |
| `modules/LogsModule.tsx` | 操作日誌模組 |
| `modules/MonopolyModule.tsx` | 大富翁設定模組 |
| `modules/PersonnelModule.tsx` | 人員管理模組 |
| `modules/ReviewModule.tsx` | 審核管理模組 |
| `modules/TasksModule.tsx` | 任務管理模組 |

### 僅巨笑版
| 元件 | 用途 |
|------|------|
| `BoardGameView.tsx` | 開運大富翁遊戲介面 |
| `LifeHintCard.tsx` | 任務說明卡片 |
| `PeakTrialScanner.tsx` | 巔峰試煉 QR 掃碼器 |

---

## 九、整合建議

### 架構層：採星光版
- [x] 模組化 Admin（12 個獨立模組 + Context + Shell）
- [x] `next/dynamic` 懶載入重元件
- [x] Admin 獨立頁面路由

### 功能層：採巨笑版
- [x] DB 驅動管理（DailyQuestConfig / ArtifactConfig / AchievementConfig）
- [x] IconPicker（Emoji + 圖片庫）
- [x] 開運大富翁（BoardGameView + Stats + Transactions）
- [x] 隊務角色分配 (QuestRole)
- [x] 大隊長審核層 (battalion_approved)
- [x] 完整罰款流程 (FinePaymentRecords + SquadFineSubmissions)
- [x] 字體大小切換（無障礙）
- [x] 金幣獎勵欄位 (coins)
- [x] 志工密碼輪轉
- [x] 課程 CRUD

### 功能層：採星光版
- [x] Portal 傳送系統
- [x] d7 祝福機制 + DemonDropBoost
- [x] process_checkin RPC（原子性打卡）
- [x] RLS 全表啟用
- [x] 更完整戰鬥系統 (combat.ts 369 行)
- [x] MessageBox 圖片支援
- [x] player.ts / skills.ts

### 欄位命名：需統一
- **建議**：統一採用巨笑版的 `LittleTeamLeagelName / BigTeamLeagelName`（支援暱稱）
- 或重新設計為更簡潔的 `squad_name / battalion_name`（搭配 `squad_nickname / battalion_nickname`）

---

## 十、風險提醒

1. **Migration 衝突**：兩版本 migration 從 20260321 後完全分歧，合併前需手動整理成一套連貫的 migration
2. **欄位命名不同**：所有涉及隊伍名稱的查詢（20+ 處）需統一改名
3. **AdminDashboard 合併**：巨笑版 5,584 行需拆解到星光版的 12 個模組中，工作量大
4. **types/index.ts 合併**：兩版本 interface 差異較大，需逐欄位比對
5. **Combat RPC 合併**：星光版有 fix_combat_rewards_gamegold / fix_checkin_rpc 等修正，需確認巨笑版是否也需要
