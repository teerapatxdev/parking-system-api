import { type ParkingSlotSize } from '../../../database/entities/parking-slot.entity';

export interface IFindCarList {
  slotNumber: number;
  plateNumber: string;
  province: string;
  carSize: ParkingSlotSize;
}
