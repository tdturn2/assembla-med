-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "room_id" TEXT;

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "congress_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sitting" INTEGER,
    "capacity" INTEGER,
    "has_av" BOOLEAN NOT NULL DEFAULT false,
    "av_notes" TEXT,
    "layout" TEXT,
    "supply_list" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rooms_organization_id_congress_id_idx" ON "rooms"("organization_id", "congress_id");

-- CreateIndex
CREATE INDEX "rooms_congress_id_idx" ON "rooms"("congress_id");

-- CreateIndex
CREATE INDEX "appointments_room_id_start_time_idx" ON "appointments"("room_id", "start_time");

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_congress_id_fkey" FOREIGN KEY ("congress_id") REFERENCES "congresses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
