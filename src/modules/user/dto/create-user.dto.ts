import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { EUserRole } from '../../../database/entities/user.entity';

export class CreateUserDto {
  @ApiProperty({ example: 'Test User', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  userFullName: string;

  @ApiProperty({ example: 'test.user@parking.co', maxLength: 255 })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({ example: 'test.user123!', minLength: 8, maxLength: 72 })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(72)
  password: string;

  @ApiProperty({ example: '0812345678', maxLength: 20, required: false })
  @IsOptional()
  @IsString()
  @Matches(/^[0-9+\-() ]+$/, { message: 'phoneNumber must contain only digits and phone symbols' })
  @MaxLength(20)
  phoneNumber?: string | null;

  @ApiProperty({ enum: EUserRole, default: EUserRole.ADMIN, required: false })
  @IsOptional()
  @IsEnum(EUserRole)
  userRole?: EUserRole;
}
