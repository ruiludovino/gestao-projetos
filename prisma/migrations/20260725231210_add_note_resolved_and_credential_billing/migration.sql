-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MENSAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL');

-- AlterTable
ALTER TABLE "credentials" ADD COLUMN     "billingCycle" "BillingCycle",
ADD COLUMN     "cost" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "notes" ADD COLUMN     "isResolved" BOOLEAN NOT NULL DEFAULT false;
