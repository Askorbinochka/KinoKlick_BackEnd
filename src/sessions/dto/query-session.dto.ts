import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class QuerySessionDto {
  @IsOptional()
  @IsUUID()
  movieId?: string;

  @IsOptional()
  @IsUUID()
  cinemaId?: string;

  @IsOptional()
  @IsUUID()
  hallId?: string;

  @IsOptional()
  @IsDateString()
  date?: string;
}
