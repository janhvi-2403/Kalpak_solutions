import {
  BusinessType,
  PurposeOfUse,
  AssignmentStrategy,
  ClosureAuthority,
  NotificationChannel,
  PlatformAccess,
} from '@kalpak/types';
import { IsEnum, IsOptional, IsBoolean, IsInt, Min, Max, IsDateString } from 'class-validator';

export class UpdateTenantPolicyDto {
  @IsOptional()
  @IsEnum(BusinessType)
  businessType?: BusinessType;

  @IsOptional()
  @IsEnum(PurposeOfUse)
  purposeOfUse?: PurposeOfUse;

  @IsOptional()
  @IsBoolean()
  allowCustomerToRaise?: boolean;

  @IsOptional()
  @IsBoolean()
  allowEmployeeOnBehalf?: boolean;

  @IsOptional()
  @IsEnum(AssignmentStrategy)
  assignmentStrategy?: AssignmentStrategy;

  @IsOptional()
  @IsEnum(ClosureAuthority)
  closureAuthority?: ClosureAuthority;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(90)
  tolerableOpenDays?: number;

  @IsOptional()
  @IsEnum(NotificationChannel)
  notificationChannels?: NotificationChannel;

  @IsOptional()
  @IsEnum(PlatformAccess)
  platformAccess?: PlatformAccess;

  @IsOptional()
  @IsBoolean()
  pushNotifications?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  maxUsersQuota?: number;

  @IsOptional()
  @IsDateString()
  subscriptionEndsAt?: string | null;
}
