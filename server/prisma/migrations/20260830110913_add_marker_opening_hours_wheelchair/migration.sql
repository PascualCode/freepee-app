-- Horario de apertura (texto libre) y accesibilidad en silla de ruedas
-- (semáforo de 3 niveles, patrón Wheelmap) — ambos opcionales de verdad,
-- sin backfill (a diferencia de gender, que se hizo obligatorio).

-- CreateEnum
CREATE TYPE "WheelchairAccess" AS ENUM ('COMPLETA', 'PARCIAL', 'NINGUNA');

-- AlterTable
ALTER TABLE "Marker" ADD COLUMN "openingHours" TEXT, ADD COLUMN "wheelchairAccess" "WheelchairAccess";
