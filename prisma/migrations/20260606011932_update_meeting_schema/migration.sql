/*
  Warnings:

  - A unique constraint covering the columns `[appointmentId]` on the table `DoctorSlot` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "DoctorSlot" DROP CONSTRAINT "DoctorSlot_appointmentId_fkey";

-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN     "eventId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "DoctorSlot_appointmentId_key" ON "DoctorSlot"("appointmentId");

-- AddForeignKey
ALTER TABLE "DoctorSlot" ADD CONSTRAINT "DoctorSlot_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
