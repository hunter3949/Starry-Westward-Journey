# 版本更新說明 — 2026/03/28（續）

**基礎版本**：接續 `Change_Neo_Ver.20260328_1.md`
**更新日期**：2026-03-28
**編輯者**：Neo Huang

---

## 本次更新內容

### 一、後台開運大富翁模組 UI 微調

#### a. 換匯比率設定 — 賣匯開關版面

- 原：賣匯標籤與開關同行（`justify-between`）
- 改：賣匯標籤置中獨立一行，開關按鈕在下方置中（`flex-col items-center`）
- 整張換匯比率設定卡片內容全部置中對齊（`text-center`）

#### b. 人生歸零卡片

- 標題「人生歸零」左對齊，開關按鈕靠右（`justify-between`），與卡片邊緣撐滿

---

### 二、大隊長指揮部 — 所轄小隊名單強化（`CommandantTab.tsx`）

#### a. 資料擴充

| 層次 | 變更 |
|------|------|
| `BattalionSquadMember` 介面 | 新增 `exp?: number \| null` 欄位 |
| `app/page.tsx` 查詢 | SELECT 加入 `Exp` 欄位，member mapping 寫入 `exp: r.Exp` |

#### b. 表頭列

名單展開後，成員列表上方新增灰色表頭：

```
姓名 ｜ 任務角色 ｜ 狀態 ｜ 等級 ｜ 修為
```

#### c. 任務角色標籤化

- 原：純文字顯示（或「—」）
- 改：解析 `QuestRole` 欄位（支援 JSON 陣列 `["總召","財務"]` 或純字串）
- 每個角色獨立顯示為天藍色標籤（`text-sky-300 bg-sky-500/10 rounded-lg`）
- 多角色並排 `flex-wrap gap-1`

#### d. 修為分數

- 新增最右欄顯示成員 `Exp`（以千位分隔，紫藍色 `text-indigo-400`）
- 隊長標籤（玫紅）移至姓名欄右側，縮小至 8px

---

## 異動檔案清單

| 檔案 | 說明 |
|------|------|
| `components/Admin/AdminDashboard.tsx` | 賣匯開關改直列置中；人生歸零 toggle justify-between；卡片整體 text-center |
| `components/Tabs/CommandantTab.tsx` | `BattalionSquadMember` 新增 exp；名單加表頭；任務角色改多標籤；修為分數顯示 |
| `app/page.tsx` | `BattalionSquadMember` 新增 exp；SELECT 加 Exp；member mapping 寫入 exp |