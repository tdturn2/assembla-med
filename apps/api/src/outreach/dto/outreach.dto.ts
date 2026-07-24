import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { EngagementType } from '@prisma/client';

export class CreateTemplateDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @MinLength(2)
  subject!: string;

  @IsString()
  @MinLength(2)
  bodyHtml!: string;
}

export class UpdateTemplateDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  subject?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  bodyHtml?: string;
}

export class CreateCampaignDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  templateId!: string;

  @IsOptional()
  @IsString()
  congressId?: string;

  @IsArray()
  @IsString({ each: true })
  kolIds!: string[];

  @IsOptional()
  @IsEnum(EngagementType)
  engagementType?: EngagementType;

  @IsOptional()
  @IsBoolean()
  isContracted?: boolean;
}

export class RespondInvitationDto {
  @IsIn(['accepted', 'declined'])
  response!: 'accepted' | 'declined';

  @IsOptional()
  @IsString()
  message?: string;
}
