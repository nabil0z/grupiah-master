import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

// Global fix: Make BigInt and Decimal serializable in JSON responses
// Prisma returns BigInt for telegramId and Decimal for balance/amount/reward
// Node.js JSON.stringify() cannot handle these natively
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

// Patch JSON.stringify to handle Prisma Decimal objects
const originalStringify = JSON.stringify;
JSON.stringify = function (value: any, replacer?: any, space?: any) {
  const customReplacer = (key: string, val: any) => {
    // Convert BigInt to string
    if (typeof val === 'bigint') return val.toString();
    // Convert Prisma Decimal to number
    if (val && typeof val === 'object' && val.constructor?.name === 'Decimal') return Number(val);
    // Apply user replacer if provided
    if (typeof replacer === 'function') return replacer(key, val);
    return val;
  };
  return originalStringify(value, customReplacer, space);
} as typeof JSON.stringify;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  await app.listen(process.env.PORT ?? 53000);
}
bootstrap();
