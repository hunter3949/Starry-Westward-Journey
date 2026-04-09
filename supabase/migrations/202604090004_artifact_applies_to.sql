-- 法寶觸發條件欄位
-- applies_to: JSON 陣列，定義此法寶對哪些定課有效
-- 格式：["all"] = 所有定課, ["q1","q1_dawn"] = 特定 ID, ["prefix:t"] = t 開頭, ["prefix:q"] = q 開頭
ALTER TABLE "ArtifactConfig"
  ADD COLUMN IF NOT EXISTS "applies_to" JSONB DEFAULT '["all"]';

-- 設定預設觸發條件
UPDATE "ArtifactConfig" SET "applies_to" = '["all"]' WHERE "id" = 'a1';
UPDATE "ArtifactConfig" SET "applies_to" = '["q1_dawn"]' WHERE "id" = 'a2';
UPDATE "ArtifactConfig" SET "applies_to" = '["q1","q1_dawn"]' WHERE "id" = 'a3';
UPDATE "ArtifactConfig" SET "applies_to" = '["prefix:t"]' WHERE "id" = 'a4';
UPDATE "ArtifactConfig" SET "applies_to" = '["all"]' WHERE "id" = 'a5';
UPDATE "ArtifactConfig" SET "applies_to" = '[]' WHERE "id" = 'a6';
