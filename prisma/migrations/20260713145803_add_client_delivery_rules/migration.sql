/*
  Warnings:

  - You are about to alter the column `price` on the `Delivery` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - A unique constraint covering the columns `[email]` on the table `Client` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `Client` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Delivery` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Lead` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Vertical` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('DISTRIBUTED', 'NOT_DISTRIBUTED');

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "company" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Delivery" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "price" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "distributedAt" TIMESTAMP(3),
ADD COLUMN     "pricePaid" DECIMAL(10,2),
ADD COLUMN     "status" "LeadStatus" NOT NULL DEFAULT 'NOT_DISTRIBUTED',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Vertical" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "DeliveryPostalCode" (
    "id" SERIAL NOT NULL,
    "deliveryId" INTEGER NOT NULL,
    "postalCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryPostalCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryTimeSlot" (
    "id" SERIAL NOT NULL,
    "deliveryId" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryTimeSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeliveryPostalCode_deliveryId_idx" ON "DeliveryPostalCode"("deliveryId");

-- CreateIndex
CREATE INDEX "DeliveryPostalCode_postalCode_idx" ON "DeliveryPostalCode"("postalCode");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryPostalCode_deliveryId_postalCode_key" ON "DeliveryPostalCode"("deliveryId", "postalCode");

-- CreateIndex
CREATE INDEX "DeliveryTimeSlot_deliveryId_idx" ON "DeliveryTimeSlot"("deliveryId");

-- CreateIndex
CREATE UNIQUE INDEX "Client_email_key" ON "Client"("email");

-- CreateIndex
CREATE INDEX "Delivery_clientId_idx" ON "Delivery"("clientId");

-- CreateIndex
CREATE INDEX "Delivery_verticalId_idx" ON "Delivery"("verticalId");

-- CreateIndex
CREATE INDEX "Lead_verticalId_idx" ON "Lead"("verticalId");

-- CreateIndex
CREATE INDEX "Lead_assignedDeliveryId_idx" ON "Lead"("assignedDeliveryId");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "Lead_distributedAt_idx" ON "Lead"("distributedAt");

-- CreateIndex
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");

-- AddForeignKey
ALTER TABLE "DeliveryPostalCode" ADD CONSTRAINT "DeliveryPostalCode_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryTimeSlot" ADD CONSTRAINT "DeliveryTimeSlot_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;
