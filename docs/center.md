# 大會管理後台 功能文件

入口：登入頁最下方點擊「大會中樞入口」，輸入管理員密碼（預設 `123`，定義於 `lib/constants.tsx` 的 `ADMIN_PASSWORD`）。

---

## 一、全域修行設定

### 雙週加分主題名稱
- 顯示目前的主題任務標題（對應 `SystemSettings.TopicQuestTitle`）
- 管理員可直接編輯並點擊儲存，系統以 upsert 方式寫回 `SystemSettings`
- 下方顯示**歷史主題紀錄**（來自 `TopicHistory` 資料表，依時間排序）

---

## 二、動態難度與共業系統（DDA）

顯示目前共業狀態（`SystemSettings.WorldState` + `WorldStateMsg`）。

| 按鈕 | 對應 Action | 說明 |
|------|------------|------|
| 執行每週業力結算 | `onTriggerSnapshot` → `app/actions/admin.ts` | 對全體玩家執行週快照、更新 WorldState、重置相關欄位 |
| 執行 w3 週罰款結算 | `onCheckW3Compliance` | 掃描本週未完成 w3（品質陪伴）的玩家，每人 TotalFines +NT$200 |
| 全服自動抽籤 | `onAutoDrawAllSquads` | 為尚未抽出本週定課的小隊自動代抽，寫入 `TeamSettings.mandatory_quest_id` |

> 以上三個操作均會寫入 `AdminActivityLog` 留存紀錄。

---

## 三、戰隊名冊管理

### 登入模式切換
| 模式 | 說明 |
|------|------|
| 🌐 自由註冊模式（`open`）| 任何人可自行填表完成角色創建 |
| 🔐 名單驗證模式（`roster`）| 僅允許已預先匯入名冊的 Email 進行角色綁定 |

切換後即時更新 `SystemSettings.RegistrationMode`。

### 批量匯入名冊（CSV）
將學員名單貼入文字框後點擊「批量匯入名冊」，系統解析後寫入 `Rosters` 資料表。

**CSV 格式**（若含表頭行會自動略過）：
```
email, 姓名, 生日(YYYY-MM-DD), 大隊名稱, 小隊名稱, 是否小隊長(true/false), 是否大隊長(true/false)
```

**範例**：
```
user1@gmail.com,王小明,1960-03-15,第一大隊,第一小隊,true,false
user2@gmail.com,李大華,1985-07-22,第一大隊,第一小隊,false,false
```

匯入後，學員以 Email 進行角色綁定時，系統自動從 `Rosters` 帶入隊伍、小隊、職務資訊。

---

## 四、臨時加分任務管理

管理員可新增、啟停、刪除「臨時任務」，玩家端的「日課」分頁即時反映。

### 新增臨時任務
| 欄位 | 說明 |
|------|------|
| 主標題 | 固定顯示，如「特殊仙緣任務」 |
| 任務名稱（sub）| 顯示於副標題，如「跟父母三道菜」 |
| 任務說明（desc）| 選填，補充說明文字 |
| 加分額度 | 完成後給予的修為點數 |

### 任務清單操作
- **啟用 / 暫停**：切換 `temporaryquests.active`，暫停中的任務不顯示於玩家端
- **刪除**：永久移除該任務紀錄

---

## 五、傳愛分數終審（w4）

顯示已通過小隊長初審、等待管理員最終裁決的 w4 申請。

| 欄位 | 說明 |
|------|------|
| 申請者姓名 | 提交申請的玩家 |
| 所屬小隊、訪談對象、訪談日期 | 申請內容摘要 |
| 小隊長備註 | 初審意見 |
| 訪談描述 | 申請者自填說明 |
| 終審備註（選填）| 管理員核准或駁回時附加的說明 |

| 操作 | 結果 |
|------|------|
| ✅ 核准入帳 | 申請狀態更新為 `approved`，對應的 w4 修為獎勵發放至玩家帳戶 |
| ❌ 駁回 | 申請狀態更新為 `rejected`，修為不發放 |

---

## 六、志工掃碼授權

設定一組「志工密碼」，讓報到志工無需管理員帳號，可於主頁「課程」分頁輸入此密碼後開啟 QR Code 掃碼介面。

- 密碼儲存於 `SystemSettings.VolunteerPassword`
- 目前狀態顯示：已設定 / 尚未設定

---

## 七、LINE 機器人選單設定

點擊「設定 LINE 定課選單」後，系統呼叫 `/api/admin/setup-richmenu`，自動產生選單圖片並透過 LINE API 設為預設 Rich Menu，需約 10–20 秒。

需要 `LINE_CHANNEL_ACCESS_TOKEN` 環境變數已設定才能正常運作。

---

## 八、親證故事存檔

顯示從 LINE 群組 webhook 收到的「#親證故事」訊息（儲存於 `testimonies` 資料表）。

| 欄位 | 說明 |
|------|------|
| 發布者姓名 | 從訊息解析（`parsed_name`）或 LINE 顯示名（`display_name`）|
| 類別標籤 | 解析結果（`parsed_category`）|
| 內容摘要 | 最多顯示三行 |
| 日期 | 親證日期（`parsed_date`）及訊息接收時間 |

---

## 九、修行者修為榜預覽

以修為（`Exp`）降序顯示全體玩家排名，每筆顯示：
- 排名、姓名、角色（Role）
- 修為點數
- 累計罰金（`TotalFines`）

---

## 十、管理操作日誌

記錄所有管理員操作，來源為 `AdminActivityLog` 資料表。

| 操作類型 | 對應事件 |
|---------|---------|
| 新增臨時任務 | `temp_quest_add` |
| 切換臨時任務狀態 | `temp_quest_toggle` |
| 刪除臨時任務 | `temp_quest_delete` |
| 匯入名冊 | `roster_import` |
| 自動分配大小隊 | `auto_assign_squads` |
| 全服自動抽籤 | `auto_draw_quests` |
| 每週業力結算 | `weekly_snapshot` |
| w3 週罰款結算 | `w3_compliance` |
| w4 終審核准 | `w4_final_approve` |
| w4 終審駁回 | `w4_final_reject` |
| 更新主題名稱 | `topic_title_update` |

失敗的操作以紅色背景標示，成功操作顯示綠色標籤。
