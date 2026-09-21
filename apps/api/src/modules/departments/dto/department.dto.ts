import { IsString, IsNotEmpty, IsOptional, IsUUID, Length, Matches } from 'class-validator';

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
  headUserId?: string;
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
}
