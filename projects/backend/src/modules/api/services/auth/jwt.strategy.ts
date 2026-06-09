import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/entities/mysql/user.entity';
import { MYSQL_CONNECTION } from 'src/database/database.constants';
import { Repository } from 'typeorm';
import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, `apiJwt`) {
  constructor(
    @InjectRepository(User, MYSQL_CONNECTION)
    private userRepository: Repository<User>,
  ) {
    super({
      secretOrKey: process.env.JWT_SECRET_API,
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // 如果为 true，则不验证令牌的到期。
      ignoreExpiration: false,
      expiresIn: '2h',
    });
  }

  async validate(arg?: any): Promise<any> {
    // eslint-disable-next-line no-useless-catch
    try {
      const result = await this.userRepository.findOne({
        where: { username: arg.username },
      });

      if (!result) {
        throw new UnauthorizedException();
      }

      return true;
    } catch (err) {
      throw err;
    }
  }
}
