import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

import { ApiModule } from './modules/api/api.module';
import { WebModule } from './modules/web/web.module';
import { AppController } from './app.controller';
import { TideCategory } from './entities/sqlite/tide-category.entity';
import { TidePort } from './entities/sqlite/tide-port.entity';
import { mysqlTypeOrmConfig, sqliteTypeOrmConfig } from './database/typeorm.config';
import { MYSQL_CONNECTION } from './database/database.constants';

const env = process.env.NODE_ENV;
const NODE_ENV = env === 'production' ? 'production' : 'development';

@Module({
  imports: [
    ConfigModule.forRoot({
      // 先加载 .env，再由 .env.{NODE_ENV} 覆盖；勿只在 .env 改 MySQL 而 .env.development 仍留 root
      envFilePath: ['.env', `.env.${NODE_ENV}`],
      isGlobal: true,
    }),
    TypeOrmModule.forRoot(sqliteTypeOrmConfig()),
    TypeOrmModule.forRootAsync({
      name: MYSQL_CONNECTION,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: mysqlTypeOrmConfig,
    }),
    TypeOrmModule.forFeature([TideCategory, TidePort]),
    ScheduleModule.forRoot(),
    ApiModule.forRoot(),
    WebModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
