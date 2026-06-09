import { VerificationService } from './service/verification';
import { SharedService } from './service/shared';
import { Module } from '@nestjs/common';
import { UserCurd } from './curd/user.curd';
import { ManagerCurd } from './curd/manager.curd';
import { RoleCurd } from './curd/role.curd';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Scheduled } from 'src/entities/sqlite/scheduled.entity';
import { User } from 'src/entities/mysql/user.entity';
import { Role } from 'src/entities/sqlite/role.entity';
import { LayoutPosition } from 'src/entities/sqlite/layoutPosition.entity';
import { LayoutPositionCurd } from './curd/layoutPosition.curd';
import { Hydrology } from 'src/entities/sqlite/hydrology.entity';
import { Manager } from 'src/entities/sqlite/manager.entity';
import { MYSQL_CONNECTION } from 'src/database/database.constants';

@Module({
  imports: [
    TypeOrmModule.forFeature([User], MYSQL_CONNECTION),
    TypeOrmModule.forFeature([
      Manager,
      Scheduled,
      Hydrology,
      Role,
      LayoutPosition,
    ]),
  ],
  providers: [
    SharedService,
    UserCurd,
    ManagerCurd,
    RoleCurd,
    LayoutPositionCurd,
    VerificationService,
  ],
  exports: [
    SharedService,
    VerificationService,
    UserCurd,
    ManagerCurd,
    RoleCurd,
    LayoutPositionCurd,
  ],
})
export class SharedModule {}
