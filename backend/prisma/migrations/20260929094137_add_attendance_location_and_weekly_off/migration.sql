-- AlterTable
ALTER TABLE "Branch" ADD COLUMN     "allowed_radius_meters" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "latitude" DECIMAL(10,7),
ADD COLUMN     "longitude" DECIMAL(10,7),
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata';

-- AlterTable
ALTER TABLE "Shift" ADD COLUMN     "weekly_off_days" TEXT[] DEFAULT ARRAY['SUNDAY']::TEXT[];
