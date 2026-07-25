-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'NOTA_ATRIBUIDA';
ALTER TYPE "NotificationType" ADD VALUE 'CREDENCIAL_ATRIBUIDA';

-- AlterTable
ALTER TABLE "credentials" ADD COLUMN     "assigneeId" TEXT;

-- AlterTable
ALTER TABLE "notes" ADD COLUMN     "assigneeId" TEXT;

-- AddForeignKey
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
