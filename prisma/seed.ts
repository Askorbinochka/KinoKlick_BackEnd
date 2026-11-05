import { PrismaClient, Role, SeatType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';
import { randomUUID } from 'node:crypto';

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Початок наповнення бази даних (seeding)...');

  // Очищення старих даних у правильному порядку
  console.log('🧹 Очищення старих даних...');
  await prisma.ticket.deleteMany();
  await prisma.order.deleteMany();
  await prisma.bookingSeat.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.session.deleteMany();
  await prisma.seat.deleteMany();
  await prisma.hall.deleteMany();
  await prisma.cinema.deleteMany();
  await prisma.movie.deleteMany();
  await prisma.user.deleteMany();

  // 1. Створення користувачів
  console.log('👤 Створення тестових користувачів...');
  const hashedPassword = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@cinoclick.com',
      password: hashedPassword,
      firstName: 'Ольга',
      lastName: 'Адміністратор',
      phone: '+380501112233',
      role: Role.ADMIN,
    },
  });

  const moderator = await prisma.user.create({
    data: {
      email: 'moderator@cinoclick.com',
      password: hashedPassword,
      firstName: 'Іван',
      lastName: 'Модератор',
      phone: '+380502223344',
      role: Role.MODERATOR,
    },
  });

  const user = await prisma.user.create({
    data: {
      email: 'user@cinoclick.com',
      password: hashedPassword,
      firstName: 'Максим',
      lastName: 'Глядач',
      phone: '+380503334455',
      role: Role.USER,
    },
  });

  // 2. Створення кінотеатрів та залів
  console.log('🏢 Створення кінотеатрів, залів та місць...');
  const cinemaKyiv = await prisma.cinema.create({
    data: {
      name: 'Cinoclick Kyiv Center',
      city: 'Київ',
      address: 'Спортивна площа, 1 (ТРЦ Gulliver)',
    },
  });

  const cinemaLviv = await prisma.cinema.create({
    data: {
      name: 'Cinoclick Lviv Forum',
      city: 'Львів',
      address: 'вул. Під Дубом, 7Б (ТРЦ Forum Lviv)',
    },
  });

  // Зал 1 у Києві (5 рядів по 8 місць)
  const hallKyivImax = await prisma.hall.create({
    data: {
      name: 'Зал 1 — IMAX Laser',
      cinemaId: cinemaKyiv.id,
    },
  });

  const imaxSeats = [];
  for (let row = 1; row <= 5; row++) {
    for (let num = 1; num <= 8; num++) {
      imaxSeats.push({
        hallId: hallKyivImax.id,
        row,
        number: num,
        type: row === 5 ? SeatType.VIP : SeatType.STANDARD,
      });
    }
  }
  await prisma.seat.createMany({ data: imaxSeats });

  // Зал 2 у Києві (4 ряди по 6 місць)
  const hallKyivDolby = await prisma.hall.create({
    data: {
      name: 'Зал 2 — Dolby Atmos',
      cinemaId: cinemaKyiv.id,
    },
  });

  const dolbySeats = [];
  for (let row = 1; row <= 4; row++) {
    for (let num = 1; num <= 6; num++) {
      dolbySeats.push({
        hallId: hallKyivDolby.id,
        row,
        number: num,
        type: row === 4 ? SeatType.VIP : SeatType.STANDARD,
      });
    }
  }
  await prisma.seat.createMany({ data: dolbySeats });

  // Зал у Львові (4 ряди по 6 місць)
  const hallLvivPrime = await prisma.hall.create({
    data: {
      name: 'Зал Prime 3D',
      cinemaId: cinemaLviv.id,
    },
  });

  const lvivSeats = [];
  for (let row = 1; row <= 4; row++) {
    for (let num = 1; num <= 6; num++) {
      lvivSeats.push({
        hallId: hallLvivPrime.id,
        row,
        number: num,
        type: row === 4 ? SeatType.VIP : SeatType.STANDARD,
      });
    }
  }
  await prisma.seat.createMany({ data: lvivSeats });

  // 3. Створення фільмів
  console.log('🎬 Додавання фільмів...');
  const movieDune = await prisma.movie.create({
    data: {
      title: 'Дюна: Частина друга',
      description:
        'Пол Атрід об’єднується з Чані та фременами, щоб помститися змовникам, які знищили його родину. Перед ним постає вибір між коханням усього життя та долею всесвіту.',
      posterUrl:
        'https://image.tmdb.org/t/p/original/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg',
      genres: ['Фантастика', 'Пригоди', 'Драма'],
      duration: 166,
      rating: 8.6,
      director: 'Дені Вільнев',
      language: 'Український дубляж',
      ageRestriction: 16,
      trailerUrl: 'https://www.youtube.com/watch?v=Way9Dexny3w',
    },
  });

  const movieOppenheimer = await prisma.movie.create({
    data: {
      title: 'Оппенгеймер',
      description:
        'Історія життя американського фізика Роберта Оппенгеймера, який очолював Мангеттенський проєкт зі створення першої ядерної зброї.',
      posterUrl:
        'https://image.tmdb.org/t/p/original/ptpr0kGAckfQkJeJIt8st5dglvd.jpg',
      genres: ['Біографія', 'Драма', 'Історія'],
      duration: 180,
      rating: 8.9,
      director: 'Крістофер Нолан',
      language: 'Український дубляж',
      ageRestriction: 16,
      trailerUrl: 'https://www.youtube.com/watch?v=uYPbbksJxIg',
    },
  });

  const movieInterstellar = await prisma.movie.create({
    data: {
      title: 'Інтерстеллар',
      description:
        'Коли посуха та пилові бурі загрожують людству вимиранням, група дослідників вирушає крізь червоточину в пошуках нового дому для людей.',
      posterUrl:
        'https://image.tmdb.org/t/p/original/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
      genres: ['Фантастика', 'Драма', 'Пригоди'],
      duration: 169,
      rating: 8.7,
      director: 'Крістофер Нолан',
      language: 'Український дубляж',
      ageRestriction: 12,
      trailerUrl: 'https://www.youtube.com/watch?v=zSWdZVtXT7E',
    },
  });

  const movieDespicable = await prisma.movie.create({
    data: {
      title: 'Нікчемний я 4',
      description:
        'Грю та його родина стикаються з новим ворогом Максимом Ле Малем і змушені тікати, тоді як міньйони отримують нові суперсили.',
      posterUrl:
        'https://image.tmdb.org/t/p/original/wWba3TaojhK7NdycRhoQpsG0cnH.jpg',
      genres: ['Мультфільм', 'Комедія', 'Сімейний'],
      duration: 94,
      rating: 7.2,
      director: 'Кріс Рено',
      language: 'Український дубляж',
      ageRestriction: 0,
      trailerUrl: 'https://www.youtube.com/watch?v=qQlr9-rF32A',
    },
  });

  // 4. Створення сеансів
  console.log('⏰ Створення сеансів...');
  const now = new Date();

  const session1Time = new Date(now);
  session1Time.setHours(18, 0, 0, 0);

  const session2Time = new Date(now);
  session2Time.setHours(21, 15, 0, 0);

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const session3Time = new Date(tomorrow);
  session3Time.setHours(15, 30, 0, 0);

  const session4Time = new Date(tomorrow);
  session4Time.setHours(19, 0, 0, 0);

  const session1 = await prisma.session.create({
    data: {
      startTime: session1Time,
      movieId: movieDune.id,
      hallId: hallKyivImax.id,
      price: 200,
    },
  });

  const session2 = await prisma.session.create({
    data: {
      startTime: session2Time,
      movieId: movieOppenheimer.id,
      hallId: hallKyivDolby.id,
      price: 180,
    },
  });

  await prisma.session.create({
    data: {
      startTime: session3Time,
      movieId: movieDespicable.id,
      hallId: hallKyivImax.id,
      price: 150,
    },
  });

  await prisma.session.create({
    data: {
      startTime: session4Time,
      movieId: movieInterstellar.id,
      hallId: hallLvivPrime.id,
      price: 190,
    },
  });

  // 5. Тестові зайняті місця для сеансу 1 (щоб було видно SOLD та BOOKED)
  console.log('🎟️ Створення тестових бронювань та куплених квитків...');
  const allImaxSeats = await prisma.seat.findMany({
    where: { hallId: hallKyivImax.id },
    orderBy: [{ row: 'asc' }, { number: 'asc' }],
  });

  // Куплені місця (ряд 3, місця 4 і 5)
  const soldSeat1 = allImaxSeats.find((s) => s.row === 3 && s.number === 4);
  const soldSeat2 = allImaxSeats.find((s) => s.row === 3 && s.number === 5);

  if (soldSeat1 && soldSeat2) {
    const order = await prisma.order.create({
      data: {
        userId: user.id,
        totalAmount: 400,
        status: 'PAID',
        customerName: 'Максим Глядач',
        customerEmail: 'user@cinoclick.com',
        customerPhone: '+380503334455',
      },
    });

    await prisma.ticket.createMany({
      data: [
        {
          sessionId: session1.id,
          seatId: soldSeat1.id,
          orderId: order.id,
          price: 200,
          qrCode: randomUUID(),
        },
        {
          sessionId: session1.id,
          seatId: soldSeat2.id,
          orderId: order.id,
          price: 200,
          qrCode: randomUUID(),
        },
      ],
    });
  }

  // Тимчасово заброньовані місця (ряд 4, місце 4 — активне 15 хв)
  const bookedSeat = allImaxSeats.find((s) => s.row === 4 && s.number === 4);
  if (bookedSeat) {
    const booking = await prisma.booking.create({
      data: {
        sessionId: session1.id,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    await prisma.bookingSeat.create({
      data: {
        bookingId: booking.id,
        seatId: bookedSeat.id,
      },
    });
  }

  console.log('✅ Базу успішно наповнено тестовими даними!');
  console.log('---------------------------------------------------------');
  console.log('🔑 Тестові акаунти (пароль для всіх: password123):');
  console.log('  Адмін:      admin@cinoclick.com');
  console.log('  Модератор:  moderator@cinoclick.com');
  console.log('  Користувач: user@cinoclick.com');
  console.log('---------------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Помилка під час seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
