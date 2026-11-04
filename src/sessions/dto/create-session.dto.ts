import { IsDateString, IsNumber, IsUUID, Min } from 'class-validator';

export class CreateSessionDto {
  @IsDateString()
  startTime: string;

  @IsUUID()
  movieId: string;

  @IsUUID()
  hallId: string;

  @IsNumber()
  @Min(0)
  price: number;
}
