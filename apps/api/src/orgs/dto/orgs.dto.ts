import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { MembershipRole } from '@prisma/client';

export class CreateOrganizationDto {
  @IsString()
  @MinLength(2)
  name!: string;
}

export class AddMemberDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsEnum(MembershipRole)
  role?: MembershipRole;
}

export class UpdateMemberRoleDto {
  @IsEnum(MembershipRole)
  role!: MembershipRole;
}
