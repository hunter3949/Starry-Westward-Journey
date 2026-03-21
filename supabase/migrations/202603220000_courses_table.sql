-- 動態課程資料表
CREATE TABLE IF NOT EXISTS "Courses" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  date TEXT NOT NULL,
  date_display TEXT NOT NULL,
  time TEXT NOT NULL,
  location TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 匯入原本寫死的兩筆課程
INSERT INTO "Courses" (id, name, date, date_display, time, location, sort_order)
VALUES
  ('class_b', '課後課', '2026-06-23', '2026年6月23日（二）', '19:00–21:40', 'Ticc 國際會議中心 201室', 1),
  ('class_c', '結業',   '2026-07-25', '2026年7月25日（六）', '13:00–17:30', '新莊頤品飯店', 2)
ON CONFLICT (id) DO NOTHING;
