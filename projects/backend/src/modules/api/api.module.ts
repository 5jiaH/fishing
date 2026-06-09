import { APP_PIPE } from '@nestjs/core';
import { Module, SetMetadata } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MODULE_PATH } from '@nestjs/common/constants';

import { SharedModule } from 'src/modules/shared/shared.module';
import { AuthController } from './controllers/auth.controller';
import { HydrologyController } from './controllers/hydrology.controller';
import { TidalController } from './controllers/tidal.controller';
import { WeatherController } from './controllers/weather.controller';
import { WechatController } from './controllers/wechat.controller';
import { DTOPipe } from 'src/utils/middleware/dto';
import { UploadMiddleware } from 'src/utils/middleware/upload';

import { AuthService } from './services/auth.service';
import { ApiAccessCounterService } from './services/api-access-counter.service';
import { HydrologyService } from './services/hydrology.service';
import { TidalService } from './services/tidal.service';
import { WeatherService } from './services/weather.service';
import { WechatService } from './services/wechat.service';
import { MyczStdetailService } from './services/mycz-stdetail.service';
import { User } from 'src/entities/mysql/user.entity';
import { Hydrology } from 'src/entities/sqlite/hydrology.entity';
import { TideCategory } from 'src/entities/sqlite/tide-category.entity';
import { TidePort } from 'src/entities/sqlite/tide-port.entity';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './services/auth/jwt.strategy';
import { LocalStrategy } from './services/auth/local.strategy';
import { TestController } from './controllers/test.controller';
import { TestJwtAfterThreeLoginsGuard } from './services/auth/test-jwt-after-three-logins.guard';
import { MYSQL_CONNECTION } from 'src/database/database.constants';

const MODULE_KEY = 'v1';
@SetMetadata(MODULE_PATH, MODULE_KEY)
@Module({})
export class ApiModule {
  static forRoot() {
    return {
      module: ApiModule,
      imports: [
        SharedModule,
        TypeOrmModule.forFeature([User], MYSQL_CONNECTION),
        TypeOrmModule.forFeature([Hydrology, TideCategory, TidePort]),
        MulterModule.registerAsync({
          useClass: UploadMiddleware,
        }),
        SharedModule,
        PassportModule.register({
          defaultStrategy: process.env.JWT_SECRET_API,
        }),
        JwtModule.registerAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: () => {
            return {
              secret: process.env.JWT_SECRET_API,
              signOptions: { expiresIn: '2h' },
            };
          },
        }),
      ],
      controllers: [
        AuthController,
        HydrologyController,
        TidalController,
        WeatherController,
        WechatController,
        TestController,
      ],
      providers: [
        ApiAccessCounterService,
        AuthService,
        HydrologyService,
        TidalService,
        WeatherService,
        WechatService,
        MyczStdetailService,
        JwtStrategy,
        LocalStrategy,
        TestJwtAfterThreeLoginsGuard,
        {
          provide: APP_PIPE,
          useClass: DTOPipe,
        },
      ],
    };
  }
}
