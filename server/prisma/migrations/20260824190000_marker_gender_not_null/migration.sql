-- Backfill: los marcadores creados antes de que "gender" existiera se
-- quedaron con NULL (ver migración 20260823180000_add_marker_gender_image).
-- Se asume MIXTO -- mismo valor usado para los marcadores sembrados de
-- Cáceres, cabinas únicas accesibles/unisex -- como el más neutro de los
-- cuatro para datos legados sin información real de género.
UPDATE "Marker" SET "gender" = 'MIXTO' WHERE "gender" IS NULL;

-- AlterTable
ALTER TABLE "Marker" ALTER COLUMN "gender" SET NOT NULL;
