import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

export class CreateBookingDto {
  @IsUUID()
  sessionId: string;

  @IsArray()
  @ArrayNotEmpty({ message: 'Потрібно вказати хоча б одне місце для бронювання' })
  @IsUUID('4', { each: true, message: 'Кожен seatId повинен бути валідним UUID' })
  seatIds: string[];
}
