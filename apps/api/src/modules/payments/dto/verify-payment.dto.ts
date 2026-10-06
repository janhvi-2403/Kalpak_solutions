import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyPaymentDto {
  @ApiProperty({ example: 'order_O123456789' })
  @IsString()
  @IsNotEmpty()
  razorpay_order_id!: string;

  @ApiProperty({ example: 'pay_P123456789' })
  @IsString()
  @IsNotEmpty()
  razorpay_payment_id!: string;

  @ApiProperty({ example: '9a8b7c6d5e4f...' })
  @IsString()
  @IsNotEmpty()
  razorpay_signature!: string;
}
