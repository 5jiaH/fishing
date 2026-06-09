import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { SharedService } from './shared';
import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://:123456@127.0.0.1:6379';
const VERIFICATION_KEY_PREFIX = 'api:verification:';

type CreateVerificationParams = {
  key: string;
  ttl?: number;
  isNumber?: boolean;
  size?: number;
};

@Injectable()
export class VerificationService implements OnModuleDestroy {
  private readonly logger = new Logger(VerificationService.name);
  private readonly redis: Redis;

  constructor(private shareService: SharedService) {
    this.redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 2,
      lazyConnect: true,
    });
    this.redis.on('error', (err) => {
      this.logger.warn(`Redis: ${err.message}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }

  private storeKey(key: string): string {
    return `${VERIFICATION_KEY_PREFIX}${key}`;
  }

  /**
   * 生成验证码
   * @param params.key 验证码类型
   * @param params.ttl 验证码有效期
   * @param params.isNumber 是否只返回数字
   * @returns
   */
  create({
    key,
    ttl = 0,
    isNumber = false,
    size = 5,
  }: CreateVerificationParams): string {
    const code = this.shareService.createRandom(size, isNumber);
    const redisKey = this.storeKey(key);
    const write =
      ttl > 0
        ? this.redis.set(redisKey, code, 'PX', ttl)
        : this.redis.set(redisKey, code);
    write.catch((e) => {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Redis set ${redisKey}: ${msg}`);
    });
    return code;
  }

  /**
   * 验证验证码
   * @param key 验证码类型
   * @param code 验证码
   * @returns Boolean
   */
  async validate(key: string, code: string): Promise<boolean> {
    const redisKey = this.storeKey(key);
    let storeCode: string | null;
    try {
      storeCode = await this.redis.get(redisKey);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Redis get ${redisKey}: ${msg}`);
      return false;
    }
    return code === storeCode;
  }

  /**
   * 删除验证码
   * @param key
   */
  delete(key: string): void {
    const redisKey = this.storeKey(key);
    this.redis.del(redisKey).catch((e) => {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Redis del ${redisKey}: ${msg}`);
    });
  }
}
