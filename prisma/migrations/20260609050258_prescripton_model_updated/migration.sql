/*
  Warnings:

  - You are about to drop the column `medicines` on the `Prescription` table. All the data in the column will be lost.
  - You are about to drop the column `symptoms` on the `Prescription` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[publicId]` on the table `Prescription` will be added. If there are existing duplicate values, this will fail.
  - The required column `publicId` was added to the `Prescription` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `updatedAt` to the `Prescription` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Prescription" DROP COLUMN "medicines",
DROP COLUMN "symptoms",
ADD COLUMN     "content" JSONB,
ADD COLUMN     "diagnosis" TEXT,
ADD COLUMN     "followUpDate" TIMESTAMP(3),
ADD COLUMN     "publicId" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "PrescriptionMedicine" (
    "id" SERIAL NOT NULL,
    "prescriptionId" INTEGER NOT NULL,
    "medicineName" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "instruction" TEXT,

    CONSTRAINT "PrescriptionMedicine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Prescription_publicId_key" ON "Prescription"("publicId");

-- AddForeignKey
ALTER TABLE "PrescriptionMedicine" ADD CONSTRAINT "PrescriptionMedicine_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
