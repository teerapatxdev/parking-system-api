export interface IFindParkingLotDetail {
  parkingLotName: string;
  totalSlots: number;
  totalAvailableSlots: ITotalAvailableSlots;
}

export interface ITotalAvailableSlots {
  small: number;
  medium: number;
  large: number;
}

export interface IQueryParkingSlotDetail {
  parkingLotName: string;
  totalSlots: number;
  availableSmallSlots: number;
  availableMediumSlots: number;
  availableLargeSlots: number;
}
