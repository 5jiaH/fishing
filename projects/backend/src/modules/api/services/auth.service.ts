import { userItf } from './../interfaces/controller';
import BaseCURD from '../../../utils/classes/curd.service';
import { User } from 'src/entities/mysql/user.entity';
import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MYSQL_CONNECTION } from 'src/database/database.constants';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import type { Request } from 'express';
import { ApiAccessCounterService } from './api-access-counter.service';

@Injectable()
export class AuthService extends BaseCURD {
  constructor(
    @InjectRepository(User, MYSQL_CONNECTION)
    private userRepository: Repository<User>,
    @Inject(JwtService)
    private readonly jwtService: JwtService,
    private readonly apiAccessCounter: ApiAccessCounterService,
  ) {
    super(userRepository);
  }

  /** 与登录计数 Map 使用的键一致，避免 ::1 与 127.0.0.1 分成两档 */
  normalizeIpKey(raw: string): string {
    let s = String(raw || '').trim();
    if (!s) return 'unknown';
    s = s.replace(/^::ffff:/i, '');
    if (s === '::1' || s === '0:0:0:0:0:0:0:1') {
      return '127.0.0.1';
    }
    return s;
  }

  getClientIp(request: Request): string {
    const xff = request.headers['x-forwarded-for'];
    const fromHeader =
      typeof xff === 'string'
        ? xff.split(',')[0].trim()
        : Array.isArray(xff)
          ? String(xff[0] || '').trim()
          : '';
    const raw = fromHeader || request.ip || request.socket?.remoteAddress || '';
    return this.normalizeIpKey(raw);
  }

  async recordSuccessfulApiLogin(request: Request): Promise<void> {
    const ip = this.getClientIp(request);
    await this.apiAccessCounter.incrementTokenIssuedByIp(ip);
  }

  async getSuccessfulApiLoginCountByIp(ip: string): Promise<number> {
    return this.apiAccessCounter.getTokenIssuedCountByIp(
      this.normalizeIpKey(ip),
    );
  }

  /** 无 JWT 访问 restricted 等接口时 +1，返回当前累计次数（按自然日，Redis） */
  async bumpRestrictedAnonymousHitByIp(ip: string): Promise<number> {
    return this.apiAccessCounter.incrementRestrictedAnonByIp(
      this.normalizeIpKey(ip),
    );
  }

  tryVerifyApiBearerAuthHeader(
    authHeader: string | undefined,
  ): { ok: true } | { ok: false } {
    if (!authHeader?.startsWith('Bearer ')) {
      return { ok: false };
    }
    const token = authHeader.slice(7).trim();
    if (!token) {
      return { ok: false };
    }
    try {
      this.verifyApiJwt(token);
      return { ok: true };
    } catch {
      return { ok: false };
    }
  }

  verifyApiJwt(token: string): { username?: string } {
    return this.jwtService.verify(token, {
      secret: process.env.JWT_SECRET_API,
    });
  }

  async findUser(username: string) {
    return await this.userRepository.findOne({
      select: ['id', 'cover', 'create_time', 'username', 'disabled'],
      where: { username },
    });
  }

  // 注册
  async register(userInfo: userItf): Promise<any> {
    const { username, password, ...query } = userInfo;
    const hash = createHash('md5').update(password).digest('hex');
    return this.userRepository.insert({
      username,
      password: hash,
      ...query,
    });
  }

  /**
   * 根据Payload生成Token
   * @param payload 用户信息
   * @param options
   * @returns Token
   */
  createJwt(payload: any, options?: JwtSignOptions) {
    return this.jwtService.sign(payload, options);
  }

  /**
   * 根据Token生成Payload
   * @param token
   * @param option
   * @returns
   */
  getPayload(
    token: string,
    option?: { complete?: boolean | undefined; json?: boolean | undefined },
  ) {
    return this.jwtService.decode(token, option);
  }

  async login() {
    return this;
  }
}
