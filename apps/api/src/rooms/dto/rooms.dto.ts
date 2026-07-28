import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RoomDayHoursDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  day!: number;

  @IsString()
  start!: string;

  @IsString()
  end!: string;
}

export class RoomDateOverrideDto {
  @IsString()
  date!: string;

  @IsOptional()
  @IsBoolean()
  closed?: boolean;

  @IsOptional()
  @IsString()
  start?: string;

  @IsOptional()
  @IsString()
  end?: string;
}

export class RoomOpenHoursDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoomDayHoursDto)
  weekly!: RoomDayHoursDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoomDateOverrideDto)
  overrides?: RoomDateOverrideDto[];
}

export class CreateRoomDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sitting?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  capacity?: number;

  @IsOptional()
  @IsBoolean()
  hasAv?: boolean;

  @IsOptional()
  @IsString()
  avNotes?: string;

  @IsOptional()
  @IsString()
  layout?: string;

  @IsOptional()
  @IsString()
  supplyList?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @ValidateNested()
  @Type(() => RoomOpenHoursDto)
  openHours?: RoomOpenHoursDto | null;
}

export class UpdateRoomDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sitting?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  capacity?: number | null;

  @IsOptional()
  @IsBoolean()
  hasAv?: boolean;

  @IsOptional()
  @IsString()
  avNotes?: string | null;

  @IsOptional()
  @IsString()
  layout?: string | null;

  @IsOptional()
  @IsString()
  supplyList?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @ValidateNested()
  @Type(() => RoomOpenHoursDto)
  openHours?: RoomOpenHoursDto | null;
}
