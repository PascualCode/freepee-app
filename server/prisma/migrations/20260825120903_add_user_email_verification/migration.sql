-- AlterTable
ALTER TABLE "User"
  ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "verificationToken" TEXT,
  ADD COLUMN "verificationTokenExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "User_verificationToken_key" ON "User"("verificationToken");

-- Backfill: en el momento de aplicar esta migración, todas las cuentas
-- existentes son anteriores a la verificación de email -- no se les puede
-- pedir que verifiquen algo que no existía al registrarse (mismo criterio
-- ya usado para "gender"/"username" en migraciones anteriores).
UPDATE "User" SET "emailVerified" = true;
