-- CreateTable
CREATE TABLE "Batch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "species" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "pdaBatchRef" TEXT,
    "sterilizationMethod" TEXT NOT NULL,
    "inoculationDate" DATETIME NOT NULL,
    "zone" TEXT NOT NULL,
    "outcome" TEXT NOT NULL DEFAULT 'CLEAN',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Consumable" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "stock" REAL NOT NULL DEFAULT 0,
    "threshold" REAL NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "Batch_outcome_idx" ON "Batch"("outcome");

-- CreateIndex
CREATE INDEX "Batch_inoculationDate_idx" ON "Batch"("inoculationDate");

-- CreateIndex
CREATE UNIQUE INDEX "Consumable_name_key" ON "Consumable"("name");
