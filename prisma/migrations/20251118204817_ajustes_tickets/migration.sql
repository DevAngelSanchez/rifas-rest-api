/*
  Warnings:

  - You are about to drop the column `ownerId` on the `Ticket` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_ownerId_fkey";

-- DropIndex
DROP INDEX "Ticket_ownerId_idx";

-- AlterTable
ALTER TABLE "Ticket" DROP COLUMN "ownerId",
ADD COLUMN     "ownerName" TEXT,
ADD COLUMN     "ownerPhone" TEXT;
