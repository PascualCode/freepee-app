-- Nullable a nivel de BD: la cuenta real ya existente no tiene username
-- todavía y no se le asigna uno de oficio. El registro nuevo lo exige a
-- nivel de aplicación (server/src/routes/auth.ts), no aquí.
ALTER TABLE "User" ADD COLUMN "username" TEXT;
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
