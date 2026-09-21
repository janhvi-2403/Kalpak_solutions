import { IsOptional, IsInt, IsBoolean, IsString, IsEnum, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { NotificationDeliveryChannel } from '@kalpak/database';

export class NotificationListQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  unreadOnly?: boolean;
}

export class TestNotificationDispatchDto {
  @ApiProperty({ enum: ['IN_APP', 'EMAIL', 'WHATSAPP'] })
  @IsEnum(['IN_APP', 'EMAIL', 'WHATSAPP'])
  channel!: NotificationDeliveryChannel;

  @ApiProperty()
  @IsString()
  recipient!: string;

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty()
  @IsString()
  message!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  link?: string;
}
