-- CreateEnum
CREATE TYPE "CongressStatus" AS ENUM ('planning', 'active', 'completed');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');

-- CreateEnum
CREATE TYPE "SignatureStatus" AS ENUM ('not_required', 'pending', 'signed');

-- CreateTable
CREATE TABLE "congresses" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "start_date" DATE,
    "end_date" DATE,
    "location" TEXT,
    "status" "CongressStatus" NOT NULL DEFAULT 'planning',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "congresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kols" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "institution" TEXT,
    "therapeutic_area" TEXT,
    "region" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kols_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "congress_id" TEXT NOT NULL,
    "kol_id" TEXT,
    "created_by_id" TEXT,
    "title" TEXT NOT NULL,
    "location" TEXT,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'confirmed',
    "notes" TEXT,
    "check_in_code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "check_ins" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "appointment_id" TEXT NOT NULL,
    "checked_in_by_id" TEXT,
    "attendee_name" TEXT,
    "attendee_email" TEXT,
    "checked_in_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "tov_amount" DECIMAL(10,2),
    "tov_type" TEXT,
    "tov_currency" TEXT DEFAULT 'USD',
    "signature_status" "SignatureStatus" NOT NULL DEFAULT 'not_required',
    "signature_key" TEXT,
    "signature_signed_at" TIMESTAMP(3),
    "voided_at" TIMESTAMP(3),
    "void_reason" TEXT,
    "replaces_check_in_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "check_ins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "congresses_organization_id_status_idx" ON "congresses"("organization_id", "status");

-- CreateIndex
CREATE INDEX "kols_organization_id_name_idx" ON "kols"("organization_id", "name");

-- CreateIndex
CREATE INDEX "kols_organization_id_email_idx" ON "kols"("organization_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_check_in_code_key" ON "appointments"("check_in_code");

-- CreateIndex
CREATE INDEX "appointments_organization_id_start_time_idx" ON "appointments"("organization_id", "start_time");

-- CreateIndex
CREATE INDEX "appointments_congress_id_start_time_idx" ON "appointments"("congress_id", "start_time");

-- CreateIndex
CREATE INDEX "appointments_kol_id_start_time_idx" ON "appointments"("kol_id", "start_time");

-- CreateIndex
CREATE INDEX "appointments_created_by_id_start_time_idx" ON "appointments"("created_by_id", "start_time");

-- CreateIndex
CREATE INDEX "check_ins_organization_id_checked_in_at_idx" ON "check_ins"("organization_id", "checked_in_at");

-- CreateIndex
CREATE INDEX "check_ins_appointment_id_checked_in_at_idx" ON "check_ins"("appointment_id", "checked_in_at");

-- AddForeignKey
ALTER TABLE "congresses" ADD CONSTRAINT "congresses_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kols" ADD CONSTRAINT "kols_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_congress_id_fkey" FOREIGN KEY ("congress_id") REFERENCES "congresses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_kol_id_fkey" FOREIGN KEY ("kol_id") REFERENCES "kols"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_checked_in_by_id_fkey" FOREIGN KEY ("checked_in_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_replaces_check_in_id_fkey" FOREIGN KEY ("replaces_check_in_id") REFERENCES "check_ins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
