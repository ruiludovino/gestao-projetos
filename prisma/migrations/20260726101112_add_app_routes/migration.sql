-- CreateTable
CREATE TABLE "app_routes" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_routes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "app_routes_projectId_idx" ON "app_routes"("projectId");

-- AddForeignKey
ALTER TABLE "app_routes" ADD CONSTRAINT "app_routes_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_routes" ADD CONSTRAINT "app_routes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
