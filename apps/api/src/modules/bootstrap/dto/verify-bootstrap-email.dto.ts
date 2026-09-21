import { IsNotEmpty, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyBootstrapEmailDto {
  @ApiProperty({ description: 'Temporary single-use bootstrap authorization staging token' })
  @IsString()
  @IsNotEmpty({ message: 'Bootstrap staging token is required' })
  tempToken!: string;

  @ApiProperty({ example: '123456', description: '6-digit email verification code sent to the official email' })
  @IsString()
  @IsNotEmpty({ message: 'Email verification code is required' })
  @Length(6, 64, { message: 'Verification code must be between 6 and 64 characters' })
  code!: string;
}
