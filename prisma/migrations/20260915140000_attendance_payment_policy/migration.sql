-- Attendance / payment-schedule policy + mid-month employment fields
CREATE TYPE "AttendanceBasis" AS ENUM ('CALENDAR_DAY', 'FIXED_30', 'WORKING_DAY');

ALTER TABLE "Company"
  ADD COLUMN IF NOT EXISTS "attendanceBasis" "AttendanceBasis" NOT NULL DEFAULT 'CALENDAR_DAY',
  ADD COLUMN IF NOT EXISTS "paymentSearchDaysBefore" INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS "paymentSearchDaysAfter" INTEGER NOT NULL DEFAULT 14;

ALTER TABLE "Employee"
  ADD COLUMN IF NOT EXISTS "dateOfExit" TIMESTAMP(3);

ALTER TABLE "PayrollEmployeeLine"
  ADD COLUMN IF NOT EXISTS "attendanceConfirmed" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "attendanceAssumption" TEXT,
  ADD COLUMN IF NOT EXISTS "expectedPaymentDate" TIMESTAMP(3);
