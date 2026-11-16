-- DropIndex
DROP INDEX "attendance_lunch_breaks_employee_id_started_at_idx";

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "wfh_attendance_enabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "attendance" ADD COLUMN     "work_mode" TEXT NOT NULL DEFAULT 'OFFICE';

-- AlterTable
ALTER TABLE "attendance_policies" ADD COLUMN     "wfh_verification_interval_minutes" INTEGER NOT NULL DEFAULT 15;

-- CreateTable
CREATE TABLE "wfh_attendance_verifications" (
    "id" UUID NOT NULL,
    "attendance_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "prompt_number" INTEGER NOT NULL,
    "prompted_at" TIMESTAMP(3) NOT NULL,
    "responded_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wfh_attendance_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wfh_attendance_verifications_attendance_id_prompted_at_idx" ON "wfh_attendance_verifications"("attendance_id", "prompted_at");

-- CreateIndex
CREATE INDEX "wfh_attendance_verifications_employee_id_status_idx" ON "wfh_attendance_verifications"("employee_id", "status");

-- AddForeignKey
ALTER TABLE "wfh_attendance_verifications" ADD CONSTRAINT "wfh_attendance_verifications_attendance_id_fkey" FOREIGN KEY ("attendance_id") REFERENCES "attendance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wfh_attendance_verifications" ADD CONSTRAINT "wfh_attendance_verifications_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
