-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "role" "Role" NOT NULL DEFAULT 'USER';

-- Rename Comment -> Review
ALTER TABLE "Comment" RENAME TO "Review";
ALTER TABLE "Review" RENAME CONSTRAINT "Comment_pkey" TO "Review_pkey";
ALTER TABLE "Review" RENAME CONSTRAINT "Comment_authorId_fkey" TO "Review_authorId_fkey";
ALTER TABLE "Review" RENAME CONSTRAINT "Comment_markerId_fkey" TO "Review_markerId_fkey";

-- AlterTable: comodidad/higiene sustituyen a rating, text pasa a opcional, se añade updatedAt
ALTER TABLE "Review" DROP COLUMN "rating";
ALTER TABLE "Review" ADD COLUMN "comodidad" INTEGER NOT NULL;
ALTER TABLE "Review" ADD COLUMN "higiene" INTEGER NOT NULL;
ALTER TABLE "Review" ALTER COLUMN "text" DROP NOT NULL;
ALTER TABLE "Review" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL;

-- Un marcador borrado se lleva sus reseñas por delante
ALTER TABLE "Review" DROP CONSTRAINT "Review_markerId_fkey";
ALTER TABLE "Review" ADD CONSTRAINT "Review_markerId_fkey" FOREIGN KEY ("markerId") REFERENCES "Marker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "Review_authorId_markerId_key" ON "Review"("authorId", "markerId");
