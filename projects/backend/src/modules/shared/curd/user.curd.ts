import BaseCURD from '../../../utils/classes/curd.service';
import { User } from 'src/entities/mysql/user.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MYSQL_CONNECTION } from 'src/database/database.constants';
import {
  FindOptionsSelect,
  FindOptionsSelectByString,
  FindOptionsWhere,
  Repository,
} from 'typeorm';
import { createHash } from 'crypto';

@Injectable()
export class UserCurd extends BaseCURD {
  constructor(
    @InjectRepository(User, MYSQL_CONNECTION)
    private userRepository: Repository<User>,
  ) {
    super(userRepository);
  }

  /**
   * 获取用户信息
   * @param W
   * @param S
   * @returns
   */
  async findUser(
    W: FindOptionsWhere<User> = {},
    S?: FindOptionsSelect<User> | FindOptionsSelectByString<User>,
  ): Promise<any> {
    const where = { ...W };
    if (Object.hasOwn(where, 'password')) {
      where.password = createHash('md5')
        .update(where.password as string)
        .digest('hex');
    }
    const result = await this.userRepository.findOne({ where, select: S });
    return result;
  }

  /**
   * 注册用户
   * @param userInfo
   * @returns
   */
  async register(userInfo: Omit<AccountItf.user, 'id'>): Promise<any> {
    const { username, password, ...query } = userInfo;
    const hash = createHash('md5').update(password).digest('hex');

    return await this.create<Omit<AccountItf.user, 'id'>>({
      username,
      password: hash,
      ...query,
    });
  }

  async updateUser(
    id: number,
    patch: Partial<{
      username: string;
      password: string;
      ip: string;
      cover: string;
      disabled: number;
    }>,
  ) {
    const { password, ...rest } = patch;
    const option: Record<string, unknown> = {};
    for (const k of ['username', 'ip', 'cover', 'disabled'] as const) {
      if (rest[k] !== undefined) option[k] = rest[k];
    }
    if (password !== undefined && String(password).length > 0) {
      option.password = createHash('md5').update(password).digest('hex');
    }
    if (Object.keys(option).length === 0) {
      return { affected: 0 };
    }
    return await this.update({ id, ...option });
  }
}
