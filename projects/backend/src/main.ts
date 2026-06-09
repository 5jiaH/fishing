import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as session from 'express-session';
import * as passport from 'passport';
import * as ejsMate from 'ejs-mate';
import { setupSwagger } from './swagger';
function initSession() {
  return session({
    // store: redisStore,
    secret: process.env.SESSION_SECRET as string,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 3600 * 1000,
      httpOnly: true,
      // sameSite: 'lax', // 或 'none'（跨站需配合 secure）
      // domain: '127.0.0.1', // 明确指定域名（可选）
      // secure: false,
    },
  });
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const expressApp = app.getHttpAdapter().getInstance();

  // 配置视图引擎
  app.setBaseViewsDir(join(__dirname, '..', 'frontend/views'));
  app.useStaticAssets(join(__dirname, '..', 'frontend/assets'));
  app.useStaticAssets(join(__dirname, '..', 'frontend/mixins'));
  app.useStaticAssets(join(__dirname, '..', 'frontend/components'), {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.jsx')) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      }
    },
  });

  expressApp.engine('ejs', ejsMate);
  expressApp.set('view engine', 'ejs');

  app.use(initSession());

  app.use(passport.initialize());
  app.use(passport.session());
  app.enableCors();

  if (process.env.SWAGGER_ENABLED !== 'false') {
    setupSwagger(app);
  }

  await app.listen(process.env.PORT ?? 5001);
}

bootstrap();
