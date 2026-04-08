import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ParkingLotService } from './parking-lot.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateParkingLotDto } from './dto/create-parking-lot.dto';
import { UpdateParkingLotDto } from './dto/update-parking-lot.dto';
import { ParkingLot } from '../../database/entities/parking-lot.entity';
import { FindParkingLotByIdDto } from './dto/find-parking-lot.dto';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { IFindParkingLotDetail, IFindParkingLotListItem } from './interfaces/find-parking-lot.interface';
import { PaginationResult } from '../../common/utils/pagination/dto/pagination.dto';
import { FindParkingLotListDto } from './dto/find-parking-lot-list.dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiBearerAuth()
@ApiTags('Parking Lot')
@Controller('parking-lot')
export class ParkingLotController {
  constructor(private readonly parkingLotService: ParkingLotService) {}

  @Post('create')
  @ApiOperation({
    summary: 'Create a new parking lot',
    description:
      'Creates a parking lot together with its parking slots in one request. ' +
      'You specify the lot name, location and the number/size of slots to provision. ' +
      'Covers requirement (1): "create parking lot".',
  })
  async create(@Body() body: CreateParkingLotDto, @CurrentUser() user: AuthenticatedUser): Promise<ParkingLot> {
    return await this.parkingLotService.create(body, user.userId);
  }

  @Patch('update/:parkingLotId')
  @ApiOperation({
    summary: 'Update parking lot metadata',
    description:
      'Update fields of an existing parking lot (e.g. name, location). Slot configuration is not changed here.',
  })
  async update(
    @Param() param: FindParkingLotByIdDto,
    @Body() body: UpdateParkingLotDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ParkingLot> {
    return await this.parkingLotService.update(param.parkingLotId, body, user.userId);
  }

  @Delete('delete/:parkingLotId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a parking lot',
    description: 'Soft-deletes a parking lot. The lot must have no actively parked cars.',
  })
  async delete(@Param() param: FindParkingLotByIdDto, @CurrentUser() user: AuthenticatedUser): Promise<ParkingLot> {
    return await this.parkingLotService.delete(param.parkingLotId, user.userId);
  }

  @Public()
  @Get('find-list')
  @ApiOperation({
    summary: 'List all parking lots',
    description:
      'Returns a paginated list of parking lots with summary info (total slots, available slots, etc.). ' +
      'Useful for showing an overview of every lot in the system.',
  })
  async findList(
    @Query() filters: FindParkingLotListDto,
  ): Promise<PaginationResult<ParkingLot, IFindParkingLotListItem>> {
    return await this.parkingLotService.findAll(filters);
  }

  @Public()
  @Get('find-one-by-id/:parkingLotId')
  @ApiOperation({
    summary: 'Get parking lot status (detail)',
    description:
      'Returns the full status of a single parking lot: every slot, its size, and whether it is currently occupied. ' +
      'Covers requirement (4): "get status of parking lot".',
  })
  async findOneById(@Param() param: FindParkingLotByIdDto): Promise<IFindParkingLotDetail> {
    return await this.parkingLotService.findOneById(param.parkingLotId);
  }
}
