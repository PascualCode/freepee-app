-- CreateEnum
CREATE TYPE "MarkerGender" AS ENUM ('MASCULINO', 'FEMENINO', 'MIXTO', 'PIPICAN');

-- AlterTable
ALTER TABLE "Marker"
  ADD COLUMN "gender" "MarkerGender",
  ADD COLUMN "imageUrl" TEXT;
