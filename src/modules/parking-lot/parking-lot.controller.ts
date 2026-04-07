import { Body, Controller, Delete, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ParkingLotService } from './parking-lot.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CreateParkingLotDto } from './dto/create-parking-lot.dto';
import { UpdateParkingLotDto } from './dto/update-parking-lot.dto';
import { ParkingLot } from '../../database/entities/parking-lot.entity';
import { FindParkingLotByIdDto } from './dto/find-parking-lot.dto';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CurrentUser } from '../../common/decorators/user.decorator';

@ApiBearerAuth()
@ApiTags('Parking Lot')
@Controller('parking-lot')
export class ParkingLotController {
  constructor(private readonly parkingLotService: ParkingLotService) {}

  @Post('create')
  async create(@Body() body: CreateParkingLotDto, @CurrentUser() user: AuthenticatedUser): Promise<ParkingLot> {
    return await this.parkingLotService.create(body, user.userId);
  }

  @Patch('update/:parkingLotId')
  async update(
    @Param() param: FindParkingLotByIdDto,
    @Body() body: UpdateParkingLotDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ParkingLot> {
    return await this.parkingLotService.update(param.parkingLotId, body, user.userId);
  }

  @Delete('delete/:parkingLotId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param() param: FindParkingLotByIdDto, @CurrentUser() user: AuthenticatedUser): Promise<ParkingLot> {
    return await this.parkingLotService.delete(param.parkingLotId, user.userId);
  }
}
