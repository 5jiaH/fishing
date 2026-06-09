import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import * as dayjs from 'dayjs';

const QWEATHER_BASE =
  process.env.QWEATHER_HOST ?? 'https://m84wcuq363.re.qweatherapi.com';
const QWEATHER_API_KEY =
  process.env.QWEATHER_API_KEY ?? '3b900ade52b94e1c98b2ab38c84569cb';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://:123456@127.0.0.1:6379';
const CACHE_PREFIX = 'weather:qweather:';

/** 24 小时逐时预报：上游约小时级更新 */
const TTL_24H_SEC = 60 * 60;

/** 分钟级降水：短临，与 10 分钟粒度一致 */
const TTL_MINUTELY_SEC = 10 * 60;

/** 日级天文数据（固定日期）：基本不变 */
const TTL_SUN_SEC = 7 * 24 * 60 * 60;

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

export type WeatherBasicPayload = {
  weather: unknown;
  indices: unknown;
  sun: unknown;
};

/** 和风成功且有数据可缓存：仅 code 为 200（含字符串），排除 204 暂无数据、4xx/402 等 */
function isQweatherOkToCache(data: unknown): boolean {
  if (data == null || typeof data !== 'object') return false;
  const c = (data as Record<string, unknown>).code;
  return c === 200 || c === '200';
}

function isBasicPayloadOkToCache(p: WeatherBasicPayload): boolean {
  return (
    isQweatherOkToCache(p.weather) &&
    isQweatherOkToCache(p.indices) &&
    isQweatherOkToCache(p.sun)
  );
}

export type WeatherBasicItem = { location: string } & WeatherBasicPayload;

@Injectable()
export class WeatherService implements OnModuleDestroy {
  private readonly logger = new Logger(WeatherService.name);
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

  private buildUrl(
    path: string,
    query?: Record<string, string | number>,
  ): string {
    const url = new URL(path.replace(/^\//, ''), `${QWEATHER_BASE}/`);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        url.searchParams.set(k, String(v));
      }
    }
    return url.toString();
  }

  private async fetchJson(
    path: string,
    query?: Record<string, string | number>,
  ): Promise<unknown> {
    const url = this.buildUrl(path, query);
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 25_000);

    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'X-QW-Api-Key': QWEATHER_API_KEY,
        },
        signal: ac.signal,
      });
      const text = await res.text();

      if (!res.ok) {
        this.logger.warn(`QWeather HTTP ${res.status} ${path}`);
        throw new Error(`HTTP ${res.status}`);
      }
      const trimmed = text.trim();
      if (trimmed.startsWith('<')) {
        this.logger.warn(`QWeather 非 JSON: ${path}`);
        throw new Error('non-json response');
      }
      return JSON.parse(trimmed) as unknown;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`QWeather ${path}: ${msg}`);
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * 缓存命中时也会校验 isValid，无效则删键并重新拉取（自愈历史脏数据）。
   * 仅 isValid 为真时 set，避免 204/4xx/402 等「空」或错误体长期占坑。
   */
  private async getCachedJson<T = unknown>(
    key: string,
    ttlSec: number,
    fetcher: () => Promise<T>,
    isValid: (d: T) => boolean = () => true,
  ): Promise<T> {
    try {
      const hit = await this.redis.get(key);
      if (typeof hit === 'string' && hit.length > 0) {
        const parsed = JSON.parse(hit) as T;
        if (isValid(parsed)) {
          return parsed;
        }
        try {
          await this.redis.del(key);
        } catch (delE) {
          const m = delE instanceof Error ? delE.message : String(delE);
          this.logger.warn(`Redis del ${key}: ${m}`);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Redis get ${key}: ${msg}`);
    }

    const data = await fetcher();

    if (isValid(data)) {
      try {
        await this.redis.set(key, JSON.stringify(data), 'EX', ttlSec);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        this.logger.warn(`Redis set ${key}: ${msg}`);
      }
    }

    return data;
  }

  /** 24 小时天气预报 */
  get24h(location: string): Promise<unknown> {
    return this.getCachedJson(
      `${CACHE_PREFIX}24h:${location}`,
      TTL_24H_SEC,
      () => this.fetchJson('/v7/weather/24h', { location }),
      isQweatherOkToCache,
    );
  }

  /** 未来天气预报 */
  getDay(location: string, days = '3d'): Promise<unknown> {
    return this.getCachedJson(
      `${CACHE_PREFIX}24h:${location}`,
      3 * 24 * 60 * 60,
      () => this.fetchJson(`v7/grid-weather/${days}`, { location }),
      isQweatherOkToCache,
    );
  }

  /** 未来 2 小时每 10 分钟降水 */
  getMinutely10m(location: string): Promise<unknown> {
    return this.getCachedJson(
      `${CACHE_PREFIX}minutely10m:${location}`,
      TTL_MINUTELY_SEC,
      () => this.fetchJson('/v7/minutely/10m', { location }),
      isQweatherOkToCache,
    );
  }

  /** 空气质量日预报（经纬度）：按自然日失效 */
  getAirQualityDaily(latitude: number, longitude: number): Promise<unknown> {
    const path = `/airquality/v1/daily/${latitude}/${longitude}`;
    return this.getCachedJson(
      `${CACHE_PREFIX}airDaily:${latitude}:${longitude}`,
      secondsUntilNextLocalMidnight(),
      () => this.fetchJson(path),
      isQweatherOkToCache,
    );
  }

  /** 天气生活指数：日级产品，按自然日失效 */
  getIndices(days: string, location: string): Promise<unknown> {
    return this.getCachedJson(
      `${CACHE_PREFIX}indices:${days}:${location}`,
      secondsUntilNextLocalMidnight(),
      () => this.fetchJson(`/v7/indices/${days}`, { location, type: 4 }),
      isQweatherOkToCache,
    );
  }

  /** 日出日落：给定日期结果固定 */
  getSun(location: string, date: string): Promise<unknown> {
    return this.getCachedJson(
      `${CACHE_PREFIX}sun:${location}:${date}`,
      TTL_SUN_SEC,
      () => this.fetchJson('/v7/astronomy/sun', { location, date }),
      isQweatherOkToCache,
    );
  }

  /**
   * 基础天气：空气质量（日）+ 生活指数 + 日出日落。
   * 合并为一条 JSON 写入 Redis（键含 location/date/days/经纬度），TTL 与「日级」接口一致（本地自然日过午夜失效）。
   */
  getBasicWeather(location: string): Promise<WeatherBasicPayload> {
    const date = dayjs().format('YYYYMMDD');
    const key = `${CACHE_PREFIX}basic:${location}:${date}:1d`;
    const ttl = secondsUntilNextLocalMidnight();
    return this.getCachedJson<WeatherBasicPayload>(
      key,
      ttl,
      async () => {
        const [weather, indices, sun] = await Promise.all([
          this.get24h(location),
          this.getIndices('1d', location),
          this.getSun(location, date),
        ]);
        return { weather, indices, sun };
      },
      isBasicPayloadOkToCache,
    );
  }
}
