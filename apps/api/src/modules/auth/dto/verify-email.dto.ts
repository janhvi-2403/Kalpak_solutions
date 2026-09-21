import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailDto {
  @ApiProperty({ description: 'Expiring single-use email verification token' })
  @IsString()
  @IsNotEmpty({ message: 'Verification token is required' })
  @MinLength(16, { message: 'Verification token is invalid or malformed' })
  token!: string;
}
