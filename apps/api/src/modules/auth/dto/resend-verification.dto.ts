import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResendVerificationDto {
  @ApiProperty({ example: 'alice@acme.com', description: 'Registered user email address' })
  @IsEmail({}, { message: 'A valid email address is required' })
  email!: string;
}
