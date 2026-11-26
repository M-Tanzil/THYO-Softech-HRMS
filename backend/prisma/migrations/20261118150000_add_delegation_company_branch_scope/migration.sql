-- Add company scope to temporary delegations
ALTER TABLE "delegations"
ADD COLUMN "company_id" UUID NOT NULL;

-- Link delegation to its company
ALTER TABLE "delegations"
ADD CONSTRAINT "delegations_company_id_fkey"
FOREIGN KEY ("company_id")
REFERENCES "Company"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

-- Index company scope
CREATE INDEX "delegations_company_id_idx"
ON "delegations"("company_id");

-- Create selected branch scope for each delegation
CREATE TABLE "delegation_branches" (
    "delegation_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,

    CONSTRAINT "delegation_branches_pkey"
    PRIMARY KEY ("delegation_id", "branch_id"),

    CONSTRAINT "delegation_branches_delegation_id_fkey"
    FOREIGN KEY ("delegation_id")
    REFERENCES "delegations"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE,

    CONSTRAINT "delegation_branches_branch_id_fkey"
    FOREIGN KEY ("branch_id")
    REFERENCES "Branch"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE
);

-- Index branch lookups
CREATE INDEX "delegation_branches_branch_id_idx"
ON "delegation_branches"("branch_id");