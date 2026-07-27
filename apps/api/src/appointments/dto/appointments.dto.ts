import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  AppointmentStatus,
  AttendeeKind,
  AttendeeRsvpStatus,
  EngagementType,
} from '@prisma/client';

export class AttendeeInputDto {
  @IsEnum(AttendeeKind)
  kind!: AttendeeKind;

  @IsOptional()
  @IsString()
  kolId?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEnum(AttendeeRsvpStatus)
  rsvpStatus?: AttendeeRsvpStatus;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class CreateAppointmentDto {
  @IsString()
  congressId!: string;

  @IsOptional()
  @IsString()
  kolId?: string;

  @IsString()
  @MinLength(2)
  title!: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  roomId?: string;

  @IsDateString()
  startTime!: string;

  @IsDateString()
  endTime!: string;

  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @IsOptional()
  @IsEnum(EngagementType)
  engagementType?: EngagementType;

  @IsOptional()
  @IsBoolean()
  isContracted?: boolean;

  @IsOptional()
  @IsString()
  contractNotes?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendeeInputDto)
  attendees?: AttendeeInputDto[];
}

export class UpdateAppointmentDto {
  @IsOptional()
  @IsString()
  kolId?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(2)
  title?: string;

  @IsOptional()
  @IsString()
  location?: string | null;

  @IsOptional()
  @IsString()
  roomId?: string | null;

  @IsOptional()
  @IsDateString()
  startTime?: string;

  @IsOptional()
  @IsDateString()
  endTime?: string;

  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @IsOptional()
  @IsEnum(EngagementType)
  engagementType?: EngagementType;

  @IsOptional()
  @IsBoolean()
  isContracted?: boolean;

  @IsOptional()
  @IsString()
  contractNotes?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class AddAttendeeDto extends AttendeeInputDto {}
