import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  AppointmentStatus,
  AttendeeKind,
  EngagementType,
  MeetingRequestStatus,
} from '@prisma/client';

export class MeetingRequestAttendeeInputDto {
  @IsEnum(AttendeeKind)
  kind!: AttendeeKind;

  @IsOptional()
  @IsString()
  kolId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateMeetingRequestDto {
  @IsString()
  congressId!: string;

  @IsOptional()
  @IsEnum(EngagementType)
  engagementType?: EngagementType;

  @IsOptional()
  @IsBoolean()
  isContracted?: boolean;

  @IsOptional()
  @IsBoolean()
  needsCda?: boolean;

  @IsOptional()
  @IsString()
  topic?: string;

  @IsOptional()
  @IsString()
  informalTopicPreset?: string;

  @IsOptional()
  @IsString()
  contractObjective?: string;

  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(480)
  @Type(() => Number)
  requestedDurationMinutes?: number;

  @IsOptional()
  @IsBoolean()
  avNeeded?: boolean;

  @IsOptional()
  @IsString()
  meetingOwnerName?: string;

  @IsOptional()
  @IsEmail()
  meetingOwnerEmail?: string;

  @IsOptional()
  @IsString()
  meetingOwnerPhone?: string;

  @IsOptional()
  @IsString()
  meetingOwnerFunctionalArea?: string;

  @IsOptional()
  @IsString()
  budgetApprover?: string;

  @IsOptional()
  @IsString()
  costCenter?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productTags?: string[];

  @IsOptional()
  @IsString()
  cdaScope?: string;

  @IsOptional()
  @IsString()
  cdaStage?: string;

  @IsOptional()
  @IsString()
  comments?: string;

  @IsOptional()
  @IsString()
  schedulingNotes?: string;

  @IsOptional()
  @IsString()
  contractNotes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MeetingRequestAttendeeInputDto)
  attendees?: MeetingRequestAttendeeInputDto[];
}

export class UpdateMeetingRequestDto {
  @IsOptional()
  @IsEnum(MeetingRequestStatus)
  status?: MeetingRequestStatus;

  @IsOptional()
  @IsEnum(EngagementType)
  engagementType?: EngagementType;

  @IsOptional()
  @IsBoolean()
  isContracted?: boolean;

  @IsOptional()
  @IsBoolean()
  needsCda?: boolean;

  @IsOptional()
  @IsString()
  topic?: string | null;

  @IsOptional()
  @IsString()
  informalTopicPreset?: string | null;

  @IsOptional()
  @IsString()
  contractObjective?: string | null;

  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(480)
  @Type(() => Number)
  requestedDurationMinutes?: number;

  @IsOptional()
  @IsBoolean()
  avNeeded?: boolean;

  @IsOptional()
  @IsString()
  meetingOwnerName?: string | null;

  @IsOptional()
  @IsEmail()
  meetingOwnerEmail?: string | null;

  @IsOptional()
  @IsString()
  meetingOwnerPhone?: string | null;

  @IsOptional()
  @IsString()
  meetingOwnerFunctionalArea?: string | null;

  @IsOptional()
  @IsString()
  budgetApprover?: string | null;

  @IsOptional()
  @IsString()
  costCenter?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productTags?: string[];

  @IsOptional()
  @IsString()
  cdaScope?: string | null;

  @IsOptional()
  @IsString()
  cdaStage?: string | null;

  @IsOptional()
  @IsString()
  comments?: string | null;

  @IsOptional()
  @IsString()
  schedulingNotes?: string | null;

  @IsOptional()
  @IsString()
  contractNotes?: string | null;

  @IsOptional()
  @IsString()
  withdrawnReason?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MeetingRequestAttendeeInputDto)
  attendees?: MeetingRequestAttendeeInputDto[];
}

export class ScheduleMeetingRequestDto {
  @IsDateString()
  startTime!: string;

  @IsDateString()
  endTime!: string;

  @IsOptional()
  @IsString()
  roomId?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  title?: string;

  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;
}
