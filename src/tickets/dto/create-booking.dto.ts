import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({
    example: 'd44b6293-214d-4181-8b5c-d9b69359d268',
    description: 'UUID ідентифікатор сеансу',
  })
  @IsUUID()
  sessionId: string;

  @ApiProperty({
    example: [
      'a1111111-2222-3333-4444-555555555555',
      'a2222222-3333-4444-5555-666666666666',
    ],
    description: 'Масив UUID ідентифікаторів обраних місць у залі',
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty({ message: 'Потрібно вказати хоча б одне місце для бронювання' })
  @IsUUID('4', { each: true, message: 'Кожен seatId повинен бути валідним UUID' })
  seatIds: string[];
}
