import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

// Fix BigInt serialization for JSON responses (Prisma returns BigInt for telegramId)
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  await app.listen(process.env.PORT ?? 53000);
}
bootstrap();
