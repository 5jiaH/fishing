import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { AccountController } from './controllers/page/account.controller';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './services/auth.service';
import { SessionSerializer } from './services/auth/session.serializer';
import { LocalStrategy } from './services/auth/passport-local';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IndexController } from './controllers/page/index.controller';
import { AbilityController } from './controllers/page/ability.controller';
import { ApiController } from './controllers/page/api.controller';
import { ManagerCurd } from '../shared/curd/manager.curd';
import { MonitorService } from './services/monitor.service';
import { AccountApiController } from './controllers/api/account.controller';
import { Manager } from 'src/entities/sqlite/manager.entity';

// const MODULE_KEY = 'web';
// @SetMetadata(MODULE_PATH, ['web', 'api'])
@Module({
  imports: [
    SharedModule,
    PassportModule.register({ session: true }),
    TypeOrmModule.forFeature([Manager]),
  ],
  controllers: [
    AccountController,
    IndexController,
    AbilityController,
    ApiController,
    AccountApiController,
  ],
  providers: [
    AuthService,
    LocalStrategy,
    SessionSerializer,
    ManagerCurd,
    MonitorService,
  ],
})
export class WebModule {}
