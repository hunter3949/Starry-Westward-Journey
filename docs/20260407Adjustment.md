# 2026-04-07 整合調整紀錄

> 基底：巨笑版（保留全部現有功能）
> 來源：星光版（擷取架構優點與缺失功能）

---

## 一、Admin 後台重構

將單體 `AdminDashboard.tsx`（5,584 行）拆解為模組化架構，減少 37% 程式碼量。

| 檔案 | 行數 | 說明 |
|------|------|------|
| `AdminDashboard.tsx` | 5,584 → 3,514 | 主體瘦身，匯入外部模組 |
| `shared/IconPicker.tsx` | 180 | IconPicker + GalleryPickerButton |
| `modules/QuestConfigSection.tsx` | 284 | 定課管理（DB 驅動 CRUD） |
| `modules/ArtifactConfigSection.tsx` | 347 | 天庭藏寶閣法寶管理 |
| `modules/BonusQuestConfigSection.tsx` | 156 | 加分副本管理 |
| `modules/AchievementConfigSection.tsx` | 283 | 成就殿堂管理 |
| `modules/RoleConfigSection.tsx` | 78 | 角色管理 |
| `modules/BasicParamsSection.tsx` | 111 | 基本參數設定 |
| `modules/CardMottoSection.tsx` | 212 | 金句管理 |
| `modules/QuestRoleSection.tsx` | 166 | 隊務角色管理 |
| `modules/GalleryModule.tsx` | 239 | 圖片庫 |
| `modules/LineRichMenuSection.tsx` | 56 | LINE Rich Menu 設定 |

---

## 二、資料庫強化（9 個 Migration）

| Migration | 行數 | 說明 |
|-----------|------|------|
| `202604070001_enable_rls_all_tables.sql` | 46 | 19 張表啟用 Row Level Security（含巨笑版獨有的 DailyQuestConfig、ArtifactConfig、AchievementConfig、BoardGameStats、BoardGameTransactions） |
| `202604070002_perf_indexes.sql` | 13 | 6 個效能索引（DailyLogs×3、CharacterStats×2、MapEntities×1） |
| `202604070003_exchange_golden_dice.sql` | 21 | 金骰兌換能源骰 RPC |
| `202604070004_is_blessed.sql` | 2 | CharacterStats 加入 `IsBlessed` 欄位 |
| `202604070005_d_items_fields.sql` | 7 | CharacterStats 加入 `DemonDropBoostSeasonal`、TeamSettings 加入 `d7_activated_at` |
| `202604070006_process_checkin_rpc.sql` | 571 | **原子性打卡 RPC**：`process_checkin`（FOR UPDATE 鎖定 + 法寶加成 + 等級 + 金幣 + 屬性成長一次完成）、`process_undo`（復原打卡）、`calculate_level_from_exp` |
| `202604070007_fines_rpc.sql` | 155 | **罰款 RPC**：`record_fine_payment`（原子紀錄）、`check_squad_w3_compliance`（週合規檢查） |
| `202604070008_fix_combat_rewards_gamegold.sql` | 41 | 戰鬥獎勵修正：獎勵寫入 GameGold 而非 Coins |
| `202604070009_peak_trials_v2.sql` | 20 | 巔峰試煉 v2：`PeakTrialsWithCount` View |

所有 SQL 已完成欄位名稱轉換：`SquadName` → `LittleTeamLeagelName`、`TeamName` → `BigTeamLeagelName`。

---

## 三、戰鬥系統升級

`app/actions/combat.ts`：212 行 → 369 行

**新增機制：**
- 道具效果：i3 錦鑭袈裟（死亡護盾）、i4 金剛琢（封印怪物被動）、i9 九轉金丹（全屬性 +50%）
- d 系列道具 Buff：d1 五毒精魄（+20~40% 屬性）、d2 業障石（怪物 -3 等級）
- 掉落表 `DROP_RATES_BY_TYPE`：依怪物類型（普通/心魔/精英）不同掉率
- Streak 被動技能：
  - 孫悟空：ATK +20%/+40%
  - 沙悟淨：DEF +20%/+35% + 無暴擊 + 鄰近隊友 +10% DEF
  - 唐三藏：魅力轉攻擊 + 戰後治癒周圍隊友
  - 白龍馬：額外 AP +1/+2
- 怪物 HP 以有效等級重算（非原始數值）
- 怪物 10% 暴擊機率（沙悟淨可阻擋）
- **GameGold 貨幣分離**：戰鬥獎勵 → GameGold（非 Coins）
- 20% 隊伍金幣加成（原子 RPC）

---

## 四、新增 Server Actions

| 檔案 | 行數 | 說明 |
|------|------|------|
| `app/actions/player.ts` | 47 | `saveEnergyDice`、`saveHP`、`savePosition`、`saveWorldMap` — 地圖/傳送門用 |
| `app/actions/skills.ts` | 187 | 5 個角色技能：筋斗雲（孫悟空）、九齒釘耙（豬八戒）、騰雲送骰（白龍馬）、般若真言（唐三藏）、捐贈骰子 |
| `app/actions/quest.ts` | +40 | 新增 `processUndoTransaction`（呼叫 `process_undo` RPC 復原打卡） |

---

## 五、Portal 傳送系統

**lib/constants.tsx 新增：**
- `BAJIE_FULL_DICE_THRESHOLD = 30`（豬八戒天賦觸發閾值）
- `PORTAL_DESTINATIONS`：6 大區域傳送目標
- `getZoneEntryPoint()`：動態計算各區入口座標
- 8 個傳送門地形類型（`portal` + 6 個 `portal_return_*`）加入 `TERRAIN_TYPES`
- 阻擋地形 `roots_yggdrasil` 加入 `impassable: true`

---

## 六、d7 祝福機制

**types/index.ts 新增欄位：**
- `CharacterStats.IsBlessed?: boolean` — 梵天庇護狀態（經驗 ×2）
- `CharacterStats.DemonDropBoostSeasonal?: number` — 心魔殘骸累積掉落加成
- `TeamSettings.d7_activated_at?: string` — d7 渾天至寶珠啟動時間

搭配 Migration `202604070004` + `202604070005` 在資料庫層建立對應欄位。

---

## 七、前台效能與 UI 強化

**app/page.tsx 調整：**
- `next/dynamic` 懶載入 `WorldMap` 和 `AdminDashboard`（降低首屏 bundle）
- `MessageBox` 新增 `image?: string` prop（彈窗可帶圖片）
- `modalMessage` state 新增 `image` 欄位

---

## 結論

本次整合以巨笑版為基底，從星光版引入 6 大類改進，共計 **29 個新建/修改檔案**，TypeScript 編譯零錯誤。

### 整合數據

| 指標 | 數值 |
|------|------|
| 新建檔案 | 24 個（12 Admin 模組 + 9 Migration + 3 Server Action） |
| 修改檔案 | 5 個（AdminDashboard、combat.ts、quest.ts、types/index.ts、lib/constants.tsx、app/page.tsx） |
| AdminDashboard 瘦身 | 5,584 → 3,514 行（-37%） |
| combat.ts 升級 | 212 → 369 行（+74%） |
| 新增 SQL 總行數 | 876 行 |
| TypeScript 錯誤 | 0 |

### 架構改善

- **可維護性**：後台從單體拆為 12 個獨立模組，每個 <350 行
- **資料一致性**：打卡邏輯從分段讀寫改為 PostgreSQL RPC 原子操作
- **安全性**：19 張表啟用 RLS + 罰款操作原子化
- **效能**：6 個資料庫索引 + WorldMap/AdminDashboard 懶載入
- **遊戲深度**：完整戰鬥系統（掉落表、技能、道具效果）+ Portal 傳送 + d7 祝福

### 後續步驟

1. 對 Supabase 執行 `supabase/migrations/20260407*.sql`（共 9 個檔案）
2. 確認傳送門圖片素材存在於 `/assets/terrains/The Sanctuary/`
3. 前端整合角色技能 UI（skills.ts 的 5 個技能尚無對應按鈕）
4. 前端整合 processUndoTransaction 復原按鈕
