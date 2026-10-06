import { IsString, IsNotEmpty, IsOptional, IsUUID, Length, Matches, IsBoolean, IsIn, IsEmail } from 'class-validator';

export class CreateDepartmentDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 50)
  @Matches(/^[A-Z0-9_-]+$/i, {
    message: 'Code can only contain letters, numbers, hyphens, and underscores',
  })
  code!: string;

  @IsString()
  @IsOptional()
  @Length(0, 500)
  description?: string;

  @IsUUID()
  @IsOptional()
  headUserId?: string | null;

  @IsString()
  @IsOptional()
  @Length(1, 100)
  pocName?: string;

  @IsEmail()
  @IsOptional()
  pocEmail?: string;

  @IsString()
  @IsOptional()
  @Length(3, 30)
  pocPhone?: string;

  @IsUUID()
  @IsOptional()
  pocUserId?: string | null;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateDepartmentDto {
  @IsString()
  @IsOptional()
  @Length(2, 100)
  name?: string;

  @IsString()
  @IsOptional()
  @Length(2, 50)
  @Matches(/^[A-Z0-9_-]+$/i, {
    message: 'Code can only contain letters, numbers, hyphens, and underscores',
  })
  code?: string;

  @IsString()
  @IsOptional()
  @Length(0, 500)
  description?: string;

  @IsUUID()
  @IsOptional()
  headUserId?: string | null;

  @IsString()
  @IsOptional()
  @Length(1, 100)
  pocName?: string | null;

  @IsEmail()
  @IsOptional()
  pocEmail?: string | null;

  @IsString()
  @IsOptional()
  @Length(3, 30)
  pocPhone?: string | null;

  @IsUUID()
  @IsOptional()
  pocUserId?: string | null;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class DepartmentQueryDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  @IsIn(['ALL', 'ACTIVE', 'INACTIVE'])
  status?: 'ALL' | 'ACTIVE' | 'INACTIVE';
}

export class ToggleDepartmentStatusDto {
  @IsBoolean()
  @IsNotEmpty()
  isActive!: boolean;
}

