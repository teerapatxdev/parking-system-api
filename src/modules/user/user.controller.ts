import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserService } from './user.service';
import { User } from '../../database/entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FindUserByIdDto } from './dto/find-user.dto';
import { SuperOnly } from '../../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CurrentUser } from '../../common/decorators/user.decorator';

@ApiBearerAuth()
@ApiTags('User')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('create')
  @SuperOnly()
  async create(@Body() body: CreateUserDto, @CurrentUser() user: AuthenticatedUser): Promise<User> {
    return await this.userService.create(body, user.userId);
  }

  @Get('find-one-by-id/:userId')
  async findOneById(@Param() param: FindUserByIdDto): Promise<User> {
    return await this.userService.findOneById(param.userId);
  }

  @Get('find-list')
  async findList(@CurrentUser() user: AuthenticatedUser): Promise<User[]> {
    return await this.userService.findList(user.role);
  }

  @Patch('update/:userId')
  async update(
    @Param() param: FindUserByIdDto,
    @Body() body: UpdateUserDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<User> {
    return await this.userService.update(param.userId, body, user);
  }

  @Delete('delete/:userId')
  @SuperOnly()
  async delete(@Param() param: FindUserByIdDto, @CurrentUser() user: AuthenticatedUser): Promise<User> {
    return await this.userService.delete(param.userId, user.userId);
  }
}
