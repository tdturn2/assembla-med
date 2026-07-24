import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateKolDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  institution?: string;

  @IsOptional()
  @IsString()
  therapeuticArea?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateKolDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string | null;

  @IsOptional()
  @IsString()
  institution?: string | null;

  @IsOptional()
  @IsString()
  therapeuticArea?: string | null;

  @IsOptional()
  @IsString()
  region?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class ImportKolsDto {
  @IsString()
  @MinLength(3)
  csv!: string;
}
