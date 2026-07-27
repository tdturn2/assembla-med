import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { CongressStatus } from '@prisma/client';

export class DisclosureItemDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== '')
  @IsUrl({ require_tld: false })
  url?: string | null;

  @IsOptional()
  @IsString()
  description?: string | null;
}

export class CreateCongressDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  cventId?: string;

  @IsOptional()
  @IsString()
  companyContactName?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== '')
  @IsEmail()
  companyContactEmail?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== '')
  @IsUrl({ require_tld: false })
  websiteUrl?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsEnum(CongressStatus)
  status?: CongressStatus;
}

export class UpdateCongressDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  cventId?: string | null;

  @IsOptional()
  @IsString()
  companyContactName?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== '')
  @IsEmail()
  companyContactEmail?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== '')
  @IsUrl({ require_tld: false })
  websiteUrl?: string | null;

  @IsOptional()
  @IsDateString()
  startDate?: string | null;

  @IsOptional()
  @IsDateString()
  endDate?: string | null;

  @IsOptional()
  @IsString()
  location?: string | null;

  @IsOptional()
  @IsEnum(CongressStatus)
  status?: CongressStatus;
}

export class UpdateCongressGuideDto {
  @IsOptional()
  @IsString()
  agendaMarkdown?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== '')
  @IsUrl({ require_tld: false })
  floorPlanUrl?: string | null;

  @IsOptional()
  @IsString()
  boothNotes?: string | null;

  @IsOptional()
  @IsString()
  boothScheduleMarkdown?: string | null;

  @IsOptional()
  @IsString()
  exhibitHallHoursMarkdown?: string | null;

  @IsOptional()
  @IsString()
  staffDirectoryMarkdown?: string | null;

  @IsOptional()
  @IsString()
  logisticsMarkdown?: string | null;

  @IsOptional()
  @IsString()
  contactsMarkdown?: string | null;

  @IsOptional()
  @IsString()
  lodgingMarkdown?: string | null;

  @IsOptional()
  @IsString()
  safetyMarkdown?: string | null;

  @IsOptional()
  @IsString()
  disclosuresMarkdown?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DisclosureItemDto)
  disclosureItems?: DisclosureItemDto[] | null;

  @IsOptional()
  @IsString()
  icwDinnersMarkdown?: string | null;

  @IsOptional()
  @IsString()
  icwReceptionMarkdown?: string | null;

  @IsOptional()
  @IsString()
  icwAdBoardsMarkdown?: string | null;

  @IsOptional()
  @IsString()
  icwWorkRoomMarkdown?: string | null;

  @IsOptional()
  @IsString()
  icwMeetingRoomsMarkdown?: string | null;
}
