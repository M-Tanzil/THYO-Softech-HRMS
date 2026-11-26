CREATE TABLE "overtime_requests" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "submitted_by" UUID NOT NULL,
    "requester_role" TEXT NOT NULL,
    "overtime_date" DATE NOT NULL,
    "requested_hours" DECIMAL(5,2) NOT NULL,
    "approved_hours" DECIMAL(5,2),
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "overtime_requests_pkey" PRIMARY KEY ("id"),

    CONSTRAINT "overtime_requests_employee_id_fkey"
        FOREIGN KEY ("employee_id")
        REFERENCES "Employee"("id")
        ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT "overtime_requests_submitted_by_fkey"
        FOREIGN KEY ("submitted_by")
        REFERENCES "User"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE,

    CONSTRAINT "overtime_requests_reviewed_by_fkey"
        FOREIGN KEY ("reviewed_by")
        REFERENCES "User"("id")
        ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "overtime_requests_employee_id_status_idx"
ON "overtime_requests"("employee_id", "status");

CREATE INDEX "overtime_requests_submitted_by_idx"
ON "overtime_requests"("submitted_by");

CREATE INDEX "overtime_requests_reviewed_by_idx"
ON "overtime_requests"("reviewed_by");

CREATE INDEX "overtime_requests_overtime_date_idx"
ON "overtime_requests"("overtime_date");