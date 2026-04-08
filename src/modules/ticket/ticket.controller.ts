import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { TicketService } from './ticket.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { Ticket } from '../../database/entities/ticket.entity';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { CarListFilterOptionDto } from './dto/filter-option.dto';
import { PaginationResult } from '../../common/utils/pagination/dto/pagination.dto';
import { IFindCarList } from './interfaces/find-car-list.interface';
import { FindParkingLotByIdDto } from '../parking-lot/dto/find-parking-lot.dto';
import { FindTicketHistoryDto } from './dto/find-ticket-history.dto';
import { IFindTicketHistory } from './interfaces/find-ticket-history.interface';
import { Public } from '../../common/decorators/public.decorator';

@ApiBearerAuth()
@ApiTags('Ticket')
@Controller('ticket')
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  @Public()
  @Post('park-car')
  @ApiOperation({
    summary: 'Park a car',
    description:
      'Assigns an incoming car (plate number, province, size) to an available slot in the given parking lot ' +
      'and creates a ticket. The system picks the smallest free slot that fits the car size. ' +
      'Covers requirement (2): "park the car".',
  })
  async parkCar(@Body() body: CreateTicketDto): Promise<Ticket> {
    return await this.ticketService.parkCar(body);
  }

  @Public()
  @Patch('leave-car')
  @ApiOperation({
    summary: 'Leave the slot',
    description:
      'Closes an active ticket for a parked car, frees the slot, and records the leave time. ' +
      'Covers requirement (3): "leave the slot".',
  })
  async leaveCar(@Body() body: UpdateTicketDto): Promise<Ticket> {
    return await this.ticketService.leaveCar(body);
  }

  @Get('find-car-list/:parkingLotId')
  @ApiOperation({
    summary: 'List currently parked cars (filterable by car size)',
    description:
      'Returns the list of cars currently parked in the given lot, with their plate number, province, ' +
      'car size and the slot they occupy. Supports filtering by `carSize` query param. ' +
      'Covers requirement (5): "get plate number list by car size" and (6): "get allocated slot number list by car size" — ' +
      'just call this endpoint with `?carSize=SMALL|MEDIUM|LARGE`.',
  })
  async findCarList(
    @Param() param: FindParkingLotByIdDto,
    @Query() filters: CarListFilterOptionDto,
  ): Promise<PaginationResult<Ticket, IFindCarList>> {
    return await this.ticketService.findCarList(param.parkingLotId, filters);
  }

  @Get('find-ticket-history')
  @ApiOperation({
    summary: 'Ticket history (audit log)',
    description:
      'Returns historical ticket records (both active and closed) for auditing — who parked, when they arrived, ' +
      'when they left, in which slot. Extra endpoint added per requirement (7).',
  })
  async findTicketHistory(
    @Query() filters: FindTicketHistoryDto,
  ): Promise<PaginationResult<Ticket, IFindTicketHistory>> {
    return await this.ticketService.findTicketHistory(filters);
  }
}
