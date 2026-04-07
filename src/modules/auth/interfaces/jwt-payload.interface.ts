import { type UserRole } from '../../../database/entities/user.entity';

export interface JwtPayload {
  sub: string;
  userFullName: string;
  phoneNumber: string | null;
  email: string;
  role: UserRole;
}

export interface AuthenticatedUser {
  userId: string;
  userFullName: string;
  phoneNumber: string | null;
  email: string;
  role: UserRole;
}
