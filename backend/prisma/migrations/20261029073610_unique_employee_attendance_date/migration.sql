/*
  Warnings:

  - A unique constraint covering the columns `[employee_id,attendance_date]` on the table `attendance` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "attendance_employee_id_attendance_date_key" ON "attendance"("employee_id", "attendance_date");
