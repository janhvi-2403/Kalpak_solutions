import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'alice@acme.com', description: 'User account email address' })
  @IsEmail({}, { message: 'A valid email address is required' })
  email!: string;
}
