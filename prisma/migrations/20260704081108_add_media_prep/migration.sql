-- CreateTable
CREATE TABLE "MediaPrep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "volumeMl" REAL NOT NULL,
    "pdaGrams" REAL NOT NULL,
    "antibioticMg" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "MediaPrep_createdAt_idx" ON "MediaPrep"("createdAt");
