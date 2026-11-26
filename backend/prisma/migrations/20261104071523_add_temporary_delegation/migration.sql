
-- CreateTable
CREATE TABLE "delegations" (
    "id" UUID NOT NULL,
    "created_by_id" UUID NOT NULL,
    "manager_id" UUID NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "revoked_at" TIMESTAMP(3),
    "revoked_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delegations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delegation_permissions" (
    "delegation_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,

    CONSTRAINT "delegation_permissions_pkey"
        PRIMARY KEY ("delegation_id", "permission_id")
);

-- CreateIndex
CREATE INDEX "delegations_created_by_id_idx"
ON "delegations"("created_by_id");

-- CreateIndex
CREATE INDEX "delegations_manager_id_idx"
ON "delegations"("manager_id");

-- CreateIndex
CREATE INDEX "delegations_status_starts_at_ends_at_idx"
ON "delegations"("status", "starts_at", "ends_at");

-- CreateIndex
CREATE INDEX "delegation_permissions_permission_id_idx"
ON "delegation_permissions"("permission_id");

-- AddForeignKey
ALTER TABLE "delegations"
ADD CONSTRAINT "delegations_created_by_id_fkey"
FOREIGN KEY ("created_by_id") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delegations"
ADD CONSTRAINT "delegations_manager_id_fkey"
FOREIGN KEY ("manager_id") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delegations"
ADD CONSTRAINT "delegations_revoked_by_id_fkey"
FOREIGN KEY ("revoked_by_id") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delegation_permissions"
ADD CONSTRAINT "delegation_permissions_delegation_id_fkey"
FOREIGN KEY ("delegation_id") REFERENCES "delegations"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delegation_permissions"
ADD CONSTRAINT "delegation_permissions_permission_id_fkey"
FOREIGN KEY ("permission_id") REFERENCES "Permission"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
