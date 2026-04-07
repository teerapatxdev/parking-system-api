import { type ParkingSlotSize } from '../../../database/entities/parking-slot.entity';

export interface IFindTicketHistory {
  ticketId: string;
  parkingLotId: string;
  parkingLotName: string;
  slotNumber: number;
  carSize: ParkingSlotSize;
  entryTime: Date;
  exitTime: Date | null;
  durationMinutes: number | null;
}
