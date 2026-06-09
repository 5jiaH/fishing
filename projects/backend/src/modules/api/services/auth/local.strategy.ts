import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/entities/mysql/user.entity';
import { MYSQL_CONNECTION } from 'src/database/database.constants';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, `apiLocal`) {
  constructor(
    @InjectRepository(User, MYSQL_CONNECTION)
    private userRepository: Repository<User>,
  ) {
    super({
      usernameField: 'username',
      passwordField: 'password',
    });
  }

  async validate(username: string, password: string): Promise<any> {
    try {
      const hash = createHash('md5').update(password).digest('hex');
      const result = await this.userRepository.findOne({
        where: { username, password: hash },
      });
      return !!result;
    } catch (err) {
      throw err;
    }
  }
}
