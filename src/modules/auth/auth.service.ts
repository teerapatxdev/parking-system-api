import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { EntityManager, Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import type { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  private userRepo: Repository<User>;

  constructor(
    private manager: EntityManager,
    private jwtService: JwtService,
  ) {
    this.userRepo = this.manager.getRepository(User);
  }

  async login(body: LoginDto): Promise<LoginResponseDto> {
    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.email = :email', { email: body.email })
      .getOne();

    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const isMatch = await bcrypt.compare(body.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const payload: JwtPayload = {
      sub: user.userId,
      userFullName: user.userFullName,
      phoneNumber: user.phoneNumber,
      email: user.email,
      role: user.userRole,
    };
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      userId: user.userId,
      userFullName: user.userFullName,
      phoneNumber: user.phoneNumber,
      email: user.email,
      role: user.userRole,
    };
  }
}
