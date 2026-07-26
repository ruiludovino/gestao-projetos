-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "folderId" TEXT;

-- CreateTable
CREATE TABLE "task_folders" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_folders_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "task_folders" ADD CONSTRAINT "task_folders_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_folders" ADD CONSTRAINT "task_folders_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "task_folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "task_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
