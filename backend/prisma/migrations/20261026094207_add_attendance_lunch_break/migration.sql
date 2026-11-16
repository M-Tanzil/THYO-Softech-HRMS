-- AlterTable
ALTER TABLE "attendance_policies" ADD COLUMN     "lunch_break_minutes" INTEGER NOT NULL DEFAULT 30;

-- CreateTable
CREATE TABLE "attendance_lunch_breaks" (
    "id" UUID NOT NULL,
    "attendance_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduled_end_at" TIMESTAMP(3) NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "overrun_minutes" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_lunch_breaks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "attendance_lunch_breaks_employee_id_started_at_idx" ON "attendance_lunch_breaks"("employee_id", "started_at");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_lunch_breaks_employee_id_attendance_id_key" ON "attendance_lunch_breaks"("employee_id", "attendance_id");

-- AddForeignKey
ALTER TABLE "attendance_lunch_breaks" ADD CONSTRAINT "attendance_lunch_breaks_attendance_id_fkey" FOREIGN KEY ("attendance_id") REFERENCES "attendance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_lunch_breaks" ADD CONSTRAINT "attendance_lunch_breaks_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
