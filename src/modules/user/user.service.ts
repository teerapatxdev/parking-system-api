import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { EntityManager, Not, Repository } from 'typeorm';
import { User, EUserRole } from '../../database/entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

@Injectable()
export class UserService {
  private userRepo: Repository<User>;
  constructor(private manager: EntityManager) {
    this.userRepo = this.manager.getRepository(User);
  }

  async create(body: CreateUserDto, currentUserId: string): Promise<User> {
    const existing = await this.userRepo.findOne({
      where: [{ email: body.email }, ...(body.phoneNumber ? [{ phoneNumber: body.phoneNumber }] : [])],
    });
    if (existing) {
      if (existing.email === body.email) {
        throw new ConflictException('Email already exists.');
      }
      throw new ConflictException('Phone number already exists.');
    }

    const passwordHash = await bcrypt.hash(body.password, 10);

    const user = this.userRepo.create({
      userFullName: body.userFullName,
      email: body.email,
      passwordHash,
      phoneNumber: body.phoneNumber ?? null,
      userRole: body.userRole,
      createdBy: currentUserId,
      updatedBy: currentUserId,
    });

    return await this.userRepo.save(user);
  }

  async update(userId: string, body: UpdateUserDto, currentUser: AuthenticatedUser): Promise<User> {
    if (currentUser.role !== EUserRole.SUPER && currentUser.userId !== userId) {
      throw new ForbiddenException('You are not allowed to update other users.');
    }

    const user = await this.userRepo.findOneBy({ userId });
    if (!user) {
      throw new NotFoundException(`User id ${userId} not found.`);
    }

    if (body.userRole !== undefined && currentUser.role !== EUserRole.SUPER) {
      throw new ForbiddenException('Only SUPER users can change user roles.');
    }

    if (user.userRole === EUserRole.SUPER && body.userRole !== undefined && body.userRole !== EUserRole.SUPER) {
      const remainingSuperCount = await this.userRepo.count({
        where: { userRole: EUserRole.SUPER },
      });
      if (remainingSuperCount <= 1) {
        throw new ConflictException('Cannot demote the last SUPER user.');
      }
    }

    if (body.email || body.phoneNumber) {
      const orConditions: Array<{ email?: string; phoneNumber?: string }> = [];
      if (body.email) orConditions.push({ email: body.email });
      if (body.phoneNumber) orConditions.push({ phoneNumber: body.phoneNumber });

      const duplicate = await this.userRepo.findOne({
        where: orConditions.map((cond) => ({ ...cond, userId: Not(userId) })),
      });
      if (duplicate) {
        if (body.email && duplicate.email === body.email) {
          throw new ConflictException('Email already exists.');
        }
        throw new ConflictException('Phone number already exists.');
      }
    }

    const passwordHash = body.password ? await bcrypt.hash(body.password, 10) : user.passwordHash;

    return await this.userRepo.save({
      ...user,
      userFullName: body.userFullName ?? user.userFullName,
      email: body.email ?? user.email,
      phoneNumber: body.phoneNumber ?? user.phoneNumber,
      userRole: body.userRole ?? user.userRole,
      passwordHash,
      updatedBy: currentUser.userId,
    });
  }

  async delete(userId: string, currentUserId: string): Promise<User> {
    const user = await this.userRepo.findOneBy({ userId });
    if (!user) {
      throw new NotFoundException(`User id ${userId} not found.`);
    }

    if (user.userRole === EUserRole.SUPER) {
      const remainingSuperCount = await this.userRepo.count({
        where: { userRole: EUserRole.SUPER },
      });
      if (remainingSuperCount <= 1) {
        throw new ConflictException('Cannot delete the last SUPER user.');
      }
    }

    return await this.userRepo.save({ ...user, deletedAt: new Date(), deletedBy: currentUserId });
  }

  async findOneById(userId: string): Promise<User> {
    const user = await this.userRepo.findOneBy({ userId });
    if (!user) {
      throw new NotFoundException(`User id ${userId} not found.`);
    }
    return user;
  }

  async findList(userRole: EUserRole): Promise<User[]> {
    return await this.userRepo.find({
      select: {
        userFullName: true,
        email: true,
        phoneNumber: true,
        userRole: true,
        createdAt: true,
        createdBy: true,
        updatedAt: true,
        updatedBy: true,
      },
      where: userRole === EUserRole.ADMIN ? { userRole: EUserRole.ADMIN } : {},
    });
  }
}
