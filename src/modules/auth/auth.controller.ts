import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import type { AuthenticatedUser } from './interfaces/jwt-payload.interface';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login',
    description:
      'Authenticates a user with email and password and returns a JWT access token to use for protected endpoints.',
  })
  async login(@Body() body: LoginDto): Promise<LoginResponseDto> {
    return await this.authService.login(body);
  }

  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({
    summary: 'Get current user',
    description: 'Returns the profile of the user owning the JWT in the Authorization header.',
  })
  me(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }
}
