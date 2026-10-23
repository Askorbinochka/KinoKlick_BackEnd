import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateMovieDto } from './dto/create-movie.dto.js';
import { UpdateMovieDto } from './dto/update-movie.dto.js';

@Injectable()
export class MoviesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMovieDto) {
    return this.prisma.movie.create({
      data: dto,
    });
  }

  async findAll(query?: { genre?: string; search?: string }) {
    const where: Prisma.MovieWhereInput = {};

    if (query?.genre) {
      where.genres = {
        has: query.genre,
      };
    }

    if (query?.search) {
      where.OR = [
        {
          title: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
        {
          description: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
      ];
    }

    return this.prisma.movie.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const movie = await this.prisma.movie.findUnique({
      where: { id },
      include: {
        sessions: {
          orderBy: {
            startTime: 'asc',
          },
        },
      },
    });

    if (!movie) {
      throw new NotFoundException(`Фільм з id "${id}" не знайдено`);
    }

    return movie;
  }

  async update(id: string, dto: UpdateMovieDto) {
    await this.findOne(id);

    return this.prisma.movie.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.movie.delete({
      where: { id },
    });

    return { message: `Фільм з id "${id}" успішно видалено` };
  }
}
