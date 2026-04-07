import { type UserRole } from '../../../database/entities/user.entity';

export class LoginResponseDto {
  accessToken: string;
  userId: string;
  userFullName: string;
  phoneNumber: string | null;
  email: string;
  role: UserRole;
}
