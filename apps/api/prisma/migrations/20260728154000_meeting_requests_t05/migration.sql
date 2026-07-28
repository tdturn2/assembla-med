-- CreateEnum
CREATE TYPE "MeetingRequestStatus" AS ENUM ('submitted', 'scheduling', 'scheduled', 'withdrawn');

-- CreateTable
CREATE TABLE "meeting_requests" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "congress_id" TEXT NOT NULL,
    "created_by_id" TEXT,
    "appointment_id" TEXT,
    "status" "MeetingRequestStatus" NOT NULL DEFAULT 'submitted',
    "engagement_type" "EngagementType" NOT NULL DEFAULT 'meeting',
    "is_contracted" BOOLEAN NOT NULL DEFAULT false,
    "needs_cda" BOOLEAN NOT NULL DEFAULT false,
    "topic" TEXT,
    "informal_topic_preset" TEXT,
    "contract_objective" TEXT,
    "requested_duration_minutes" INTEGER NOT NULL DEFAULT 30,
    "av_needed" BOOLEAN NOT NULL DEFAULT false,
    "meeting_owner_name" TEXT,
    "meeting_owner_email" TEXT,
    "meeting_owner_phone" TEXT,
    "meeting_owner_functional_area" TEXT,
    "budget_approver" TEXT,
    "cost_center" TEXT,
    "product_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cda_scope" TEXT,
    "cda_stage" TEXT,
    "comments" TEXT,
    "scheduling_notes" TEXT,
    "contract_notes" TEXT,
    "withdrawn_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meeting_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meeting_request_attendees" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "meeting_request_id" TEXT NOT NULL,
    "kind" "AttendeeKind" NOT NULL DEFAULT 'kol',
    "kol_id" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "country" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meeting_request_attendees_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "meeting_requests_appointment_id_key" ON "meeting_requests"("appointment_id");

-- CreateIndex
CREATE INDEX "meeting_requests_organization_id_status_idx" ON "meeting_requests"("organization_id", "status");

-- CreateIndex
CREATE INDEX "meeting_requests_congress_id_status_idx" ON "meeting_requests"("congress_id", "status");

-- CreateIndex
CREATE INDEX "meeting_requests_organization_id_congress_id_created_at_idx" ON "meeting_requests"("organization_id", "congress_id", "created_at");

-- CreateIndex
CREATE INDEX "meeting_request_attendees_meeting_request_id_idx" ON "meeting_request_attendees"("meeting_request_id");

-- CreateIndex
CREATE INDEX "meeting_request_attendees_organization_id_meeting_request_id_idx" ON "meeting_request_attendees"("organization_id", "meeting_request_id");

-- CreateIndex
CREATE INDEX "meeting_request_attendees_kol_id_idx" ON "meeting_request_attendees"("kol_id");

-- AddForeignKey
ALTER TABLE "meeting_requests" ADD CONSTRAINT "meeting_requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_requests" ADD CONSTRAINT "meeting_requests_congress_id_fkey" FOREIGN KEY ("congress_id") REFERENCES "congresses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_requests" ADD CONSTRAINT "meeting_requests_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_requests" ADD CONSTRAINT "meeting_requests_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_request_attendees" ADD CONSTRAINT "meeting_request_attendees_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_request_attendees" ADD CONSTRAINT "meeting_request_attendees_meeting_request_id_fkey" FOREIGN KEY ("meeting_request_id") REFERENCES "meeting_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_request_attendees" ADD CONSTRAINT "meeting_request_attendees_kol_id_fkey" FOREIGN KEY ("kol_id") REFERENCES "kols"("id") ON DELETE SET NULL ON UPDATE CASCADE;
