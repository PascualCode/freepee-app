-- Columna generada (STORED) a partir de latitude/longitude, mantenida en
-- sincronia automaticamente por Postgres en cada INSERT/UPDATE.
ALTER TABLE "Marker"
  ADD COLUMN "location" geography(Point, 4326)
  GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography) STORED;

-- CreateIndex
CREATE INDEX "Marker_location_idx" ON "Marker" USING GIST ("location");
