import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { TicketService } from './ticket.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { Ticket } from '../../database/entities/ticket.entity';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { CarListFilterOptionDto } from './dto/filter-option.dto';
import { PaginationResult } from '../../common/utils/pagination/dto/pagination.dto';
import { IFindCarList } from './interfaces/find-car-list.interface';
import { FindParkingLotByIdDto } from '../parking-lot/dto/find-parking-lot.dto';
import { FindTicketHistoryDto } from './dto/find-ticket-history.dto';
import { IFindTicketHistory } from './interfaces/find-ticket-history.interface';

@ApiBearerAuth()
@ApiTags('Ticket')
@Controller('ticket')
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  @Post('park-car')
  async parkCar(@Body() body: CreateTicketDto): Promise<Ticket> {
    return await this.ticketService.parkCar(body);
  }

  @Patch('leave-car')
  async leaveCar(@Body() body: UpdateTicketDto): Promise<Ticket> {
    return await this.ticketService.leaveCar(body);
  }

  @Get('find-car-list/:parkingLotId')
  async findCarList(
    @Param() param: FindParkingLotByIdDto,
    @Query() filters: CarListFilterOptionDto,
  ): Promise<PaginationResult<Ticket, IFindCarList>> {
    return await this.ticketService.findCarList(param.parkingLotId, filters);
  }

  @Get('find-ticket-history')
  async findTicketHistory(
    @Query() filters: FindTicketHistoryDto,
  ): Promise<PaginationResult<Ticket, IFindTicketHistory>> {
    return await this.ticketService.findTicketHistory(filters);
  }
}
