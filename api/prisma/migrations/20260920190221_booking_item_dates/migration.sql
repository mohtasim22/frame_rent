/*
  Warnings:

  - Added the required column `endDate` to the `booking_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startDate` to the `booking_items` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "booking_items" ADD COLUMN     "endDate" DATE NOT NULL,
ADD COLUMN     "startDate" DATE NOT NULL;

-- CreateIndex
CREATE INDEX "booking_items_gearUnitId_startDate_endDate_idx" ON "booking_items"("gearUnitId", "startDate", "endDate");
