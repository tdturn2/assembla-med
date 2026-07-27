import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

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
}
