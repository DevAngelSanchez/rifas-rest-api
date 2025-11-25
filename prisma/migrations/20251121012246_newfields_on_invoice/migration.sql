-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "amountBss" DECIMAL(65,30),
ADD COLUMN     "amountUsd" DECIMAL(65,30),
ADD COLUMN     "bcvRate" DECIMAL(65,30),
ADD COLUMN     "proofUrl" TEXT,
ALTER COLUMN "reference" DROP NOT NULL;
