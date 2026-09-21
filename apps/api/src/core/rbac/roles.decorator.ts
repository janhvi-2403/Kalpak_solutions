import { SetMetadata } from '@nestjs/common';
import { SystemRole } from '@kalpak/types';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: (SystemRole | string)[]) => SetMetadata(ROLES_KEY, roles);
