-- Add icon column to ArtifactConfig
ALTER TABLE "ArtifactConfig"
  ADD COLUMN IF NOT EXISTS "icon" TEXT;  -- emoji or public URL; NULL = use static /images/artifacts/{id}.png
