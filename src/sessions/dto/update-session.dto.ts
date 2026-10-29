import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

export class UpdateSessionDto {
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @IsOptional()
  @IsUUID()
  movieId?: string;

  @IsOptional()
  @IsUUID()
  hallId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;
}
