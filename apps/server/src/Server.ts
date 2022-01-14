import 'reflect-metadata';
import path from 'path';
import { Application, Request, Response } from 'express';
import cors from 'cors';
import color from 'kleur';
import compression from 'compression';

import { NestFactory } from '@nestjs/core';
import { HttpServer, ValidationPipe } from '@nestjs/common';
import ApplicationModule from 'modules/Api';

async function bootstrap() {
  const app = await NestFactory.create(ApplicationModule);
  app.useGlobalPipes(new ValidationPipe());

  // Enable CORS
  app.use(cors());

  // Enable compression
  app.use(compression({ filter: shouldCompress }));

  const http = app.getHttpAdapter() as HttpServer<Request, Response>;
  const expressApp = http.getInstance() as Application;

  // Disable information about the server
  expressApp.disable('x-powered-by');

  // Start server
  await app.listen(process.env.PORT!, () => {
    if (process.env.NODE_ENV !== 'production') {
      require('node-notifier').notify({
        title: 'Auctionoton Server',
        message: 'Build complete!',
        icon: path.resolve(__dirname, 'icon-128.png'),
      });
    }

    console.info(
      `[${process.env.NODE_ENV} / ${process.env.APP_ENV}]`,
      `Server started at ${color.cyan(`https://localhost:${process.env.PORT}`)}`,
    );
  });
}

function shouldCompress(req: Request, res: Response) {
  // don't compress responses with this request header
  if (req.headers['x-no-compression']) {
    return false;
  }

  // fallback to standard filter function
  return compression.filter(req, res);
}

bootstrap();
