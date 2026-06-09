import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://:123456@127.0.0.1:6379';
const KEY_PREFIX = 'api:access:';

/** 距「本机当前时区」下一次自然日 0 点的秒数，用于 Redis 键当日过期 */
function secondsUntilNextLocalMidnight(): number {
  const now = new Date();
  const end = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    0,
    0,
  );
  return Math.max(1, Math.ceil((end.getTime() - now.getTime()) / 1000));
}

function localCalendarDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function redisSafeIpSegment(ip: string): string {
  return ip.replace(/:/g, '_');
}

@Injectable()
export class ApiAccessCounterService implements OnModuleDestroy {
  private readonly logger = new Logger(ApiAccessCounterService.name);
  private readonly redis: Redis;

  constructor() {
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

  private keyTokenIssued(ip: string): string {
    return `${KEY_PREFIX}token:${localCalendarDate()}:${redisSafeIpSegment(ip)}`;
  }

  private keyRestrictedAnon(ip: string): string {
    return `${KEY_PREFIX}restrictedAnon:${localCalendarDate()}:${redisSafeIpSegment(ip)}`;
  }

  /** 当日该 IP 成功签发 API JWT（login/register）次数 +1，返回新值 */
  async incrementTokenIssuedByIp(ip: string): Promise<number> {
    const key = this.keyTokenIssued(ip);
    try {
      const n = await this.redis.incr(key);
      await this.redis.expire(key, secondsUntilNextLocalMidnight());
      return n;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Redis incr ${key}: ${msg}`);
      throw e;
    }
  }

  async getTokenIssuedCountByIp(ip: string): Promise<number> {
    const key = this.keyTokenIssued(ip);
    try {
      const v = await this.redis.get(key);
      return v ? parseInt(v, 10) : 0;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Redis get ${key}: ${msg}`);
      return 0;
    }
  }

  /** 当日无 JWT 访问 restricted 计数 +1，返回新值 */
  async incrementRestrictedAnonByIp(ip: string): Promise<number> {
    const key = this.keyRestrictedAnon(ip);
    try {
      const n = await this.redis.incr(key);
      await this.redis.expire(key, secondsUntilNextLocalMidnight());
      return n;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Redis incr ${key}: ${msg}`);
      throw e;
    }
  }
}
