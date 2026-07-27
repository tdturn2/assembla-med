-- AlterTable
ALTER TABLE "congress_guides" ADD COLUMN     "booth_schedule_markdown" TEXT,
ADD COLUMN     "disclosure_items" JSONB,
ADD COLUMN     "exhibit_hall_hours_markdown" TEXT,
ADD COLUMN     "icw_ad_boards_markdown" TEXT,
ADD COLUMN     "icw_dinners_markdown" TEXT,
ADD COLUMN     "icw_meeting_rooms_markdown" TEXT,
ADD COLUMN     "icw_reception_markdown" TEXT,
ADD COLUMN     "icw_work_room_markdown" TEXT,
ADD COLUMN     "staff_directory_markdown" TEXT;

-- AlterTable
ALTER TABLE "congresses" ADD COLUMN     "company_contact_email" TEXT,
ADD COLUMN     "company_contact_name" TEXT,
ADD COLUMN     "cvent_id" TEXT,
ADD COLUMN     "website_url" TEXT;
