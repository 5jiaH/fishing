// auth/auth.service.ts
import { Injectable } from '@nestjs/common';
import { User } from 'src/entities/mysql/user.entity';
import { ManagerCurd } from 'src/modules/shared/curd/manager.curd';
import {
  FindOptionsSelect,
  FindOptionsSelectByString,
  FindOptionsWhere,
} from 'typeorm';

@Injectable()
export class AuthService {
  constructor(private manager: ManagerCurd) {}

  async findUser(
    W: FindOptionsWhere<User> = {},
    S?: FindOptionsSelect<User> | FindOptionsSelectByString<User>,
  ): Promise<any> {
    return await this.manager.findUser(W, S);
  }
}
