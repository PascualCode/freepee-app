-- AlterTable: baja de cuenta con soft delete (no se borra la fila)
ALTER TABLE "User" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "deletedAt" TIMESTAMP(3);
