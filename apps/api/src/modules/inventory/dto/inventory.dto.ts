import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InventoryTransactionType } from '@kalpak/database';

export class CreateSparePartDto {
  @ApiProperty({ example: 'SP-BRG-6204' })
  @IsString()
  partNumber!: string;

  @ApiProperty({ example: 'Deep Groove Ball Bearing 6204-2RS' })
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'BEARINGS' })
  @IsString()
  category!: string;

  @ApiPropertyOptional({ default: 'PIECE' })
  @IsOptional()
  @IsString()
  unitOfMeasure?: string = 'PIECE';

  @ApiProperty({ example: 1250.0 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  unitPrice!: number;

  @ApiPropertyOptional({ example: 850.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  costPrice?: number;

  @ApiPropertyOptional({ default: 5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minStockAlert?: number = 5;

  @ApiPropertyOptional({ type: [String], example: ['VMC-850', 'CNC-LATHE-200'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  compatibleModels?: string[];

  @ApiPropertyOptional({ description: 'Optional initial stock count' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  initialStock?: number;

  @ApiPropertyOptional({ description: 'Storage location ID for initial stock' })
  @IsOptional()
  @IsUUID()
  initialLocationId?: string;
}

export class UpdateSparePartDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unitOfMeasure?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  unitPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  costPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minStockAlert?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  compatibleModels?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateStorageLocationDto {
  @ApiProperty({ example: 'Central Warehouse Pune' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'WH-PUN-01' })
  @IsString()
  code!: string;

  @ApiPropertyOptional({ default: 'WAREHOUSE' })
  @IsOptional()
  @IsString()
  type?: string = 'WAREHOUSE';

  @ApiPropertyOptional({ example: 'Plot 42, MIDC Bhosari, Pune - 411026' })
  @IsOptional()
  @IsString()
  address?: string;
}

export class AdjustStockDto {
  @ApiProperty()
  @IsUUID()
  partId!: string;

  @ApiProperty()
  @IsUUID()
  locationId!: string;

  @ApiProperty({ enum: InventoryTransactionType })
  @IsEnum(InventoryTransactionType)
  transactionType!: InventoryTransactionType;

  @ApiProperty({ example: 10, description: 'Positive to add stock, negative to reduce' })
  @IsNumber()
  @Type(() => Number)
  quantityDelta!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  unitCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class TransferStockDto {
  @ApiProperty({ description: 'Spare Part ID to transfer' })
  @IsUUID()
  partId!: string;

  @ApiProperty({ description: 'Source warehouse or service van ID' })
  @IsUUID()
  fromLocationId!: string;

  @ApiProperty({ description: 'Destination warehouse or service van ID' })
  @IsUUID()
  toLocationId!: string;

  @ApiProperty({ example: 5, description: 'Quantity to transfer' })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quantity!: number;

  @ApiPropertyOptional({ example: 'Pre-dispatch van stocking for morning field route' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ConsumePartDto {
  @ApiProperty()
  @IsUUID()
  ticketId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  workOrderId?: string;

  @ApiProperty()
  @IsUUID()
  partId!: string;

  @ApiPropertyOptional({ description: 'Storage location to deduct from' })
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quantity!: number;

  @ApiPropertyOptional({ description: 'Override unit price if needed' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  unitPrice?: number;

  @ApiPropertyOptional({ default: false, description: 'If true, billed at ₹0 with warranty badge' })
  @IsOptional()
  @IsBoolean()
  isWarrantyCovered?: boolean = false;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ListPartsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  lowStockOnly?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;
}
