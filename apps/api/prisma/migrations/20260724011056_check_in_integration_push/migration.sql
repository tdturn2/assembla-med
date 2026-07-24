-- CreateEnum
CREATE TYPE "IntegrationDestination" AS ENUM ('mock', 'cvent');

-- CreateEnum
CREATE TYPE "IntegrationPushStatus" AS ENUM ('pending', 'pushed', 'failed', 'skipped');

-- AlterTable
ALTER TABLE "check_ins" ADD COLUMN     "integration_attempt_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "integration_destination" "IntegrationDestination" NOT NULL DEFAULT 'mock',
ADD COLUMN     "integration_external_id" TEXT,
ADD COLUMN     "integration_idempotency_key" TEXT,
ADD COLUMN     "integration_last_error" TEXT,
ADD COLUMN     "integration_pushed_at" TIMESTAMP(3),
ADD COLUMN     "integration_status" "IntegrationPushStatus" NOT NULL DEFAULT 'pending';

-- CreateTable
CREATE TABLE "mock_integration_records" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "check_in_id" TEXT NOT NULL,
    "payload_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mock_integration_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mock_integration_records_check_in_id_idx" ON "mock_integration_records"("check_in_id");

-- CreateIndex
CREATE UNIQUE INDEX "mock_integration_records_organization_id_idempotency_key_key" ON "mock_integration_records"("organization_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "check_ins_organization_id_integration_status_idx" ON "check_ins"("organization_id", "integration_status");

-- AddForeignKey
ALTER TABLE "mock_integration_records" ADD CONSTRAINT "mock_integration_records_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
