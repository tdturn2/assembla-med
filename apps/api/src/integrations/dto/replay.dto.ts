import {
  IsBoolean,
  IsOptional,
} from 'class-validator';

export class ReplayIntegrationDto {
  /** Demo only: force the mock destination to fail this attempt. */
  @IsOptional()
  @IsBoolean()
  forceFail?: boolean;
}
