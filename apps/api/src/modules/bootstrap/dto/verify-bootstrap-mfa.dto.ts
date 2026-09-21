import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyBootstrapMfaDto {
  @ApiProperty({ description: 'Temporary single-use bootstrap authorization staging token' })
  @IsString()
  @IsNotEmpty({ message: 'Bootstrap staging token is required' })
  tempToken!: string;

  @ApiProperty({ example: '123456', description: '6-digit verification code from authenticator app' })
  @IsString()
  @IsNotEmpty({ message: 'TOTP verification code is required' })
  @Length(6, 6, { message: 'TOTP code must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'TOTP code must contain only 6 digits' })
  totpCode!: string;
}
