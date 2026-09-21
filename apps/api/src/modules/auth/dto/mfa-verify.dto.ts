import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MfaVerifyDto {
  @ApiProperty({ example: '123456', description: '6-digit TOTP verification code' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: 'MFA code must be exactly 6 digits' })
  code!: string;
}
