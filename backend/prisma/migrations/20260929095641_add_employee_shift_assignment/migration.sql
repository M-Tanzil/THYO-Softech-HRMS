-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "shift_id" UUID;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "Shift"("id") ON DELETE SET NULL ON UPDATE CASCADE;
