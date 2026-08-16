-- AlterTable
ALTER TABLE "credentials" ADD COLUMN     "categoryId" TEXT;

-- CreateTable
CREATE TABLE "credential_categories" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#64748b',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credential_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "credential_categories_projectId_name_key" ON "credential_categories"("projectId", "name");

-- CreateIndex
CREATE INDEX "credentials_categoryId_idx" ON "credentials"("categoryId");

-- AddForeignKey
ALTER TABLE "credential_categories" ADD CONSTRAINT "credential_categories_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "credential_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
