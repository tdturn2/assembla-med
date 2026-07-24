import {
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateCheckInDto {
  @IsOptional()
  @IsString()
  appointmentId?: string;

  @IsOptional()
  @IsString()
  checkInCode?: string;

  @IsOptional()
  @IsString()
  attendeeName?: string;

  @IsOptional()
  @IsString()
  attendeeEmail?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tovAmount?: number;

  @IsOptional()
  @IsString()
  tovType?: string;

  @IsOptional()
  @IsString()
  tovCurrency?: string;

  /** PNG as data URL or raw base64. Sets signature to signed. */
  @IsOptional()
  @IsString()
  @MinLength(8)
  signatureBase64?: string;

  /** If correcting a voided/previous check-in */
  @IsOptional()
  @IsString()
  replacesCheckInId?: string;
}

export class VoidCheckInDto {
  @IsString()
  @MinLength(3)
  reason!: string;
}
