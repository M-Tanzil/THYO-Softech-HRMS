/*
  Warnings:

  - A unique constraint covering the columns `[employee_id,month,year]` on the table `payroll` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "payroll_employee_id_month_year_key" ON "payroll"("employee_id", "month", "year");
