-- CreateEnum
CREATE TYPE "EngagementType" AS ENUM ('meeting', 'advisory_board', 'contracted_talk', 'informal', 'other');

-- CreateEnum
CREATE TYPE "AttendeeKind" AS ENUM ('kol', 'staff', 'external');

-- CreateEnum
CREATE TYPE "AttendeeRsvpStatus" AS ENUM ('pending', 'invited', 'accepted', 'declined', 'attending');

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "contract_notes" TEXT,
ADD COLUMN     "engagement_type" "EngagementType" NOT NULL DEFAULT 'meeting',
ADD COLUMN     "is_contracted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "invitations" ADD COLUMN     "engagement_type" "EngagementType" NOT NULL DEFAULT 'meeting',
ADD COLUMN     "is_contracted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "outreach_campaigns" ADD COLUMN     "engagement_type" "EngagementType" NOT NULL DEFAULT 'meeting',
ADD COLUMN     "is_contracted" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "appointment_attendees" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "appointment_id" TEXT NOT NULL,
    "kind" "AttendeeKind" NOT NULL DEFAULT 'kol',
    "kol_id" TEXT,
    "user_id" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "rsvp_status" "AttendeeRsvpStatus" NOT NULL DEFAULT 'pending',
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointment_attendees_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "appointment_attendees_appointment_id_idx" ON "appointment_attendees"("appointment_id");

-- CreateIndex
CREATE INDEX "appointment_attendees_organization_id_appointment_id_idx" ON "appointment_attendees"("organization_id", "appointment_id");

-- CreateIndex
CREATE INDEX "appointment_attendees_kol_id_idx" ON "appointment_attendees"("kol_id");

-- AddForeignKey
ALTER TABLE "appointment_attendees" ADD CONSTRAINT "appointment_attendees_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_attendees" ADD CONSTRAINT "appointment_attendees_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_attendees" ADD CONSTRAINT "appointment_attendees_kol_id_fkey" FOREIGN KEY ("kol_id") REFERENCES "kols"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_attendees" ADD CONSTRAINT "appointment_attendees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
