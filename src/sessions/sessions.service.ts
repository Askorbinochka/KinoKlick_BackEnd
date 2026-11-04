import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateSessionDto } from './dto/create-session.dto.js';
import { QuerySessionDto } from './dto/query-session.dto.js';
import { UpdateSessionDto } from './dto/update-session.dto.js';

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSessionDto) {
    const movie = await this.prisma.movie.findUnique({
      where: { id: dto.movieId },
    });
    if (!movie) {
      throw new NotFoundException(`Фільм з id "${dto.movieId}" не знайдено`);
    }

    const hall = await this.prisma.hall.findUnique({
      where: { id: dto.hallId },
    });
    if (!hall) {
      throw new NotFoundException(`Зал з id "${dto.hallId}" не знайдено`);
    }

    const startTime = new Date(dto.startTime);
    if (isNaN(startTime.getTime())) {
      throw new BadRequestException('Некоректний формат дати startTime');
    }

    return this.prisma.session.create({
      data: {
        startTime,
        movieId: dto.movieId,
        hallId: dto.hallId,
        price: dto.price,
      },
      include: {
        movie: true,
        hall: {
          include: {
            cinema: true,
          },
        },
      },
    });
  }

  async findAll(query?: QuerySessionDto) {
    const where: Prisma.SessionWhereInput = {};

    if (query?.movieId) {
      where.movieId = query.movieId;
    }

    if (query?.hallId) {
      where.hallId = query.hallId;
    }

    if (query?.cinemaId) {
      where.hall = {
        cinemaId: query.cinemaId,
      };
    }

    if (query?.date) {
      const targetDate = new Date(query.date);
      if (!isNaN(targetDate.getTime())) {
        const startOfDay = new Date(targetDate);
        startOfDay.setUTCHours(0, 0, 0, 0);

        const endOfDay = new Date(targetDate);
        endOfDay.setUTCHours(23, 59, 59, 999);

        where.startTime = {
          gte: startOfDay,
          lte: endOfDay,
        };
      }
    }

    return this.prisma.session.findMany({
      where,
      include: {
        movie: true,
        hall: {
          include: {
            cinema: true,
          },
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    });
  }

  async findOne(id: string) {
    const session = await this.prisma.session.findUnique({
      where: { id },
      include: {
        movie: true,
        hall: {
          include: {
            cinema: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException(`Сеанс з id "${id}" не знайдено`);
    }

    return session;
  }

  async getSeats(id: string) {
    const session = await this.prisma.session.findUnique({
      where: { id },
      include: {
        movie: true,
        hall: {
          include: {
            cinema: true,
            seats: {
              orderBy: [{ row: 'asc' }, { number: 'asc' }],
            },
          },
        },
        tickets: {
          select: { seatId: true },
        },
        bookings: {
          where: {
            status: 'PENDING',
            expiresAt: { gt: new Date() },
          },
          include: {
            seats: {
              select: { seatId: true },
            },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException(`Сеанс з id "${id}" не знайдено`);
    }

    const soldSeatIds = new Set(session.tickets.map((t) => t.seatId));
    const bookedSeatIds = new Set(
      session.bookings.flatMap((b) => b.seats.map((s) => s.seatId)),
    );

    const seatsWithStatus = session.hall.seats.map((seat) => {
      let status: 'AVAILABLE' | 'BOOKED' | 'SOLD' = 'AVAILABLE';
      if (soldSeatIds.has(seat.id)) {
        status = 'SOLD';
      } else if (bookedSeatIds.has(seat.id)) {
        status = 'BOOKED';
      }

      const price = seat.type === 'VIP' ? session.price * 1.5 : session.price;

      return {
        id: seat.id,
        row: seat.row,
        number: seat.number,
        type: seat.type,
        status,
        price,
      };
    });

    return {
      session: {
        id: session.id,
        startTime: session.startTime,
        basePrice: session.price,
        movie: session.movie,
        hall: {
          id: session.hall.id,
          name: session.hall.name,
          cinema: session.hall.cinema,
        },
      },
      seats: seatsWithStatus,
    };
  }

  async update(id: string, dto: UpdateSessionDto) {
    await this.findOne(id);

    if (dto.movieId) {
      const movie = await this.prisma.movie.findUnique({
        where: { id: dto.movieId },
      });
      if (!movie) {
        throw new NotFoundException(`Фільм з id "${dto.movieId}" не знайдено`);
      }
    }

    if (dto.hallId) {
      const hall = await this.prisma.hall.findUnique({
        where: { id: dto.hallId },
      });
      if (!hall) {
        throw new NotFoundException(`Зал з id "${dto.hallId}" не знайдено`);
      }
    }

    const data: Prisma.SessionUpdateInput = {};

    if (dto.startTime) {
      const startTime = new Date(dto.startTime);
      if (isNaN(startTime.getTime())) {
        throw new BadRequestException('Некоректний формат дати startTime');
      }
      data.startTime = startTime;
    }

    if (dto.price !== undefined) {
      data.price = dto.price;
    }

    if (dto.movieId) {
      data.movie = { connect: { id: dto.movieId } };
    }

    if (dto.hallId) {
      data.hall = { connect: { id: dto.hallId } };
    }

    return this.prisma.session.update({
      where: { id },
      data,
      include: {
        movie: true,
        hall: {
          include: {
            cinema: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.session.delete({
      where: { id },
    });

    return { message: `Сеанс з id "${id}" успішно видалено` };
  }
}
