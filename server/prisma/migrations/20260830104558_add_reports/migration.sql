-- Reportar un marcador o una reseña (nunca ambos a la vez) — moderación
-- humana vía Prisma Studio, sin endpoint de administración (ver CLAUDE.md).

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('SITIO_CERRADO', 'INFORMACION_INCORRECTA', 'CONTENIDO_INAPROPIADO', 'OTRO');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDIENTE', 'RESUELTO', 'DESCARTADO');

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "reason" "ReportReason" NOT NULL,
    "details" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDIENTE',
    "reporterId" TEXT NOT NULL,
    "markerId" TEXT,
    "reviewId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_markerId_fkey" FOREIGN KEY ("markerId") REFERENCES "Marker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;
