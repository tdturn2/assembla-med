-- CreateTable
CREATE TABLE "congress_guides" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "congress_id" TEXT NOT NULL,
    "agenda_markdown" TEXT,
    "floor_plan_url" TEXT,
    "booth_notes" TEXT,
    "logistics_markdown" TEXT,
    "contacts_markdown" TEXT,
    "lodging_markdown" TEXT,
    "safety_markdown" TEXT,
    "disclosures_markdown" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "congress_guides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "congress_guides_congress_id_key" ON "congress_guides"("congress_id");

-- CreateIndex
CREATE INDEX "congress_guides_organization_id_idx" ON "congress_guides"("organization_id");

-- AddForeignKey
ALTER TABLE "congress_guides" ADD CONSTRAINT "congress_guides_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "congress_guides" ADD CONSTRAINT "congress_guides_congress_id_fkey" FOREIGN KEY ("congress_id") REFERENCES "congresses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
