import { type EUserRole } from '../../../database/entities/user.entity';

export interface JwtPayload {
  sub: string;
  userFullName: string;
  phoneNumber: string | null;
  email: string;
  role: EUserRole;
}

export interface AuthenticatedUser {
  userId: string;
  userFullName: string;
  phoneNumber: string | null;
  email: string;
  role: EUserRole;
}
