import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
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
  @ApiOperation({
    summary: 'Create a user',
    description: 'Creates a new user account. Restricted to users with the SUPER role.',
  })
  async create(@Body() body: CreateUserDto, @CurrentUser() user: AuthenticatedUser): Promise<User> {
    return await this.userService.create(body, user.userId);
  }

  @Get('find-one-by-id/:userId')
  @ApiOperation({
    summary: 'Get user by id',
    description: 'Returns a single user by their userId.',
  })
  async findOneById(@Param() param: FindUserByIdDto): Promise<User> {
    return await this.userService.findOneById(param.userId);
  }

  @Get('find-list')
  @ApiOperation({
    summary: 'List users',
    description: 'Returns the list of users visible to the current caller (filtered by role).',
  })
  async findList(@CurrentUser() user: AuthenticatedUser): Promise<User[]> {
    return await this.userService.findList(user.role);
  }

  @Patch('update/:userId')
  @ApiOperation({
    summary: 'Update a user',
    description: 'Update fields of an existing user. Permission rules are enforced based on the caller role.',
  })
  async update(
    @Param() param: FindUserByIdDto,
    @Body() body: UpdateUserDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<User> {
    return await this.userService.update(param.userId, body, user);
  }

  @Delete('delete/:userId')
  @SuperOnly()
  @ApiOperation({
    summary: 'Delete a user',
    description: 'Soft-deletes a user account. Restricted to users with the SUPER role.',
  })
  async delete(@Param() param: FindUserByIdDto, @CurrentUser() user: AuthenticatedUser): Promise<User> {
    return await this.userService.delete(param.userId, user.userId);
  }
}
