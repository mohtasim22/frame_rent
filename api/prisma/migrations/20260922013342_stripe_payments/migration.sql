-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PROCESSING', 'PAID', 'REFUNDED', 'FAILED');

-- CreateEnum
CREATE TYPE "DepositStatus" AS ENUM ('NONE', 'HELD', 'CAPTURED', 'RELEASED', 'FAILED');

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "depositIntentId" TEXT,
ADD COLUMN     "depositStatus" "DepositStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "paymentDueBy" TIMESTAMP(3),
ADD COLUMN     "paymentIntentId" TEXT,
ADD COLUMN     "paymentMethodId" TEXT,
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "stripeCustomerId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "bookings_paymentIntentId_key" ON "bookings"("paymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_depositIntentId_key" ON "bookings"("depositIntentId");

-- CreateIndex
CREATE INDEX "bookings_status_paymentDueBy_idx" ON "bookings"("status", "paymentDueBy");

-- CreateIndex
CREATE UNIQUE INDEX "users_stripeCustomerId_key" ON "users"("stripeCustomerId");

