import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { CongressStatus } from '@prisma/client';

export class CreateCongressDto {
  @IsString()
  @MinLength(2)
  name!: string;

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
}
