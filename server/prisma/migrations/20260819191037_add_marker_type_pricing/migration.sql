-- CreateEnum
CREATE TYPE "MarkerType" AS ENUM ('AIRE_LIBRE', 'PUBLICO', 'PRIVADO');

-- CreateEnum
CREATE TYPE "PriceType" AS ENUM ('GRATIS', 'CONSUMICION', 'PRECIO');

-- AlterTable
ALTER TABLE "Marker"
  ADD COLUMN "type" "MarkerType" NOT NULL,
  ADD COLUMN "priceType" "PriceType",
  ADD COLUMN "amount" DOUBLE PRECISION;
