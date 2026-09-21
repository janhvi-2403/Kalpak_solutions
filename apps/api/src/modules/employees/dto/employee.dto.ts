import { IsString, IsOptional, Length, IsUUID, IsBoolean, IsArray } from 'class-validator';

export class UpdateEmployeeProfileDto {
  @IsUUID()
  @IsOptional()
  departmentId?: string | null;

  @IsString()
  @IsOptional()
  @Length(0, 100)
  designation?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  skills?: string[];

  @IsString()
  @IsOptional()
  @Length(0, 30)
  phone?: string;

  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;
}
