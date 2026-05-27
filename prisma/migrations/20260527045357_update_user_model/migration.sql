/*
  Warnings:

  - You are about to drop the column `dateOfBirth` on the `Patient` table. All the data in the column will be lost.
  - You are about to drop the column `gender` on the `Patient` table. All the data in the column will be lost.
  - Added the required column `patientName` to the `Appointment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `relation` to the `Appointment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `address` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "patientName" VARCHAR(100) NOT NULL,
ADD COLUMN     "relation" VARCHAR(100) NOT NULL;

-- AlterTable
ALTER TABLE "Patient" DROP COLUMN "dateOfBirth",
DROP COLUMN "gender";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "address" VARCHAR(300) NOT NULL;
