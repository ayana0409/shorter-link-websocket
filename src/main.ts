import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: '*',
    credentials: true,
  });

  const port = process.env.PORT ?? 3002;
  await app.listen(port, '0.0.0.0');
  console.log(
    `WebSocket server running on ws://localhost:${port}/notifications`,
  );
}
bootstrap();
