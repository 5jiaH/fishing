import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Redis from 'ioredis';
import { Repository } from 'typeorm';
import { TideCategory } from 'src/entities/sqlite/tide-category.entity';
import { TidePort } from 'src/entities/sqlite/tide-port.entity';
import { WeatherService } from './weather.service';

const TIDE_API_URL =
  process.env.TIDAL_NMDIS_URL ??
  'https://global-tide.nmdis.org.cn/Api/Service.ashx';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://:123456@127.0.0.1:6379';

const CACHE_PREFIX = 'tidal:nmdis:';

/** markerPoint 聚合单行结构 */
export type TideMarkerPointEnriched = TidePort & {
  tidalData: unknown;
  airQuality: unknown;
  indices: unknown;
  sun: unknown;
};

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

@Injectable()
export class TidalService implements OnModuleDestroy {
  private readonly logger = new Logger(TidalService.name);
  private readonly redis: Redis;

  constructor(
    @InjectRepository(TideCategory)
    private readonly tideCategoryRepo: Repository<TideCategory>,
    @InjectRepository(TidePort)
    private readonly tidePortRepo: Repository<TidePort>,
    private readonly weatherService: WeatherService,
  ) {
    this.redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 2,
      lazyConnect: true,
    });
    this.redis.on('error', (err) => {
      this.logger.warn(`Redis: ${err.message}`);
    });
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }

  private async postApiRequest(
    body: Record<string, unknown>,
  ): Promise<unknown> {
    const payload = JSON.stringify(body);
    const form = `ApiRequest=${encodeURIComponent(payload)}`;
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 25_000);
    try {
      const res = await fetch(TIDE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-Requested-With': 'XMLHttpRequest',
          Origin: 'https://global-tide.nmdis.org.cn',
          Referer: 'https://global-tide.nmdis.org.cn/Site/Site.html',
        },
        body: form,
        signal: ac.signal,
      });
      const text = await res.text();
      if (!res.ok) {
        this.logger.warn(`nmdis tide HTTP ${res.status}`);
        throw new Error(`HTTP ${res.status}`);
      }
      const trimmed = text.trim();
      if (trimmed.startsWith('<')) {
        this.logger.warn('nmdis tide 返回非 JSON');
        throw new Error('non-json response');
      }
      return JSON.parse(text) as unknown;
    } finally {
      clearTimeout(timer);
    }
  }

  private async getCachedJson(
    key: string,
    ttlSec: number,
    fetcher: () => Promise<unknown>,
  ): Promise<unknown> {
    try {
      const hit = await this.redis.get(key);
      if (typeof hit === 'string' && hit.length > 0) {
        return JSON.parse(hit) as unknown;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Redis get ${key}: ${msg}`);
    }

    const data = await fetcher();

    try {
      await this.redis.set(key, JSON.stringify(data), 'EX', ttlSec);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Redis set ${key}: ${msg}`);
    }

    return data;
  }

  /**
   * GetData：按站点与日期取潮汐数据；缓存至当日本地 24:00（凌晨失效）
   */
  async getData(code: string, date: string): Promise<unknown> {
    const key = `${CACHE_PREFIX}data:${code}:${date}`;
    const ttl = secondsUntilNextLocalMidnight();
    return this.getCachedJson(key, ttl, () =>
      this.postApiRequest({
        Server: 'User',
        Command: 'GetData',
        Data: { code, date },
      }),
    );
  }

  /**
   * 区域分类列表（本地库 tide_category）：排除 levelId=0。
   * 未传 country：中国 CN 优先，其余按 sortIndex。
   * 传 country：仅该国家/地区代码（如 CN、US），按 sortIndex。
   */
  async getAreaList(country?: string): Promise<TideCategory[]> {
    const cc = country?.trim();
    const qb = this.tideCategoryRepo
      .createQueryBuilder('c')
      .distinct(true)
      .where('(c.levelId IS NULL OR c.levelId <> :zero)', { zero: 0 });

    if (cc) {
      qb.andWhere('c.country = :country', { country: cc });
      qb.orderBy('c.sortIndex', 'ASC').addOrderBy('c.areaName', 'ASC');
    } else {
      qb.orderBy(`CASE WHEN c.country = :cn THEN 0 ELSE 1 END`, 'ASC')
        .addOrderBy('c.sortIndex', 'ASC')
        .addOrderBy('c.areaName', 'ASC')
        .setParameter('cn', 'CN');
    }

    const rows = await qb.getMany();

    const byId = new Map<string, TideCategory>();
    for (const r of rows) {
      if (!byId.has(r.id)) byId.set(r.id, r);
    }
    return [...byId.values()];
  }

  /**
   * 港口标记点：parentId 为区域分类 id。
   * 返回 areaId 等于该 id 的港口，或 areaId 属于「parentId 为该 id」的子分类的港口。
   */
  async getMarkerPointByGroupId(parentId: string): Promise<TidePort[]> {
    return this.tidePortRepo
      .createQueryBuilder('p')
      .where('p.areaId = :pid', { pid: parentId })
      .orWhere(
        `p.areaId IN (SELECT c.id FROM tide_category c WHERE c.parentId = :pid)`,
        { pid: parentId },
      )
      .orderBy('p.code', 'ASC')
      .getMany();
  }

  private todayYmd(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  /** YYYY-MM-DD → yyyyMMdd（和风 sun） */
  private toSunDate(yyyyMmDd: string): string {
    return yyyyMmDd.replace(/-/g, '');
  }

  /**
   * 标记点列表 + 每站：潮汐 GetData、空气质量、生活指数、日出日落（与 WeatherController 同源逻辑）
   */
  async getMarkerPointWithDetails(parentId: string): Promise<TidePort[]> {
    // const tideDate = date?.trim() || this.todayYmd();
    // const daysVal =
    //   days != null && Number.isFinite(days)
    //     ? Math.min(7, Math.max(1, Math.floor(days)))
    //     : 3;
    // const sunDate = this.toSunDate(tideDate);

    const ports = await this.getMarkerPointByGroupId(parentId);
    // const out: TideMarkerPointEnriched[] = [];

    // for (const p of ports) {
    //   const lat = p.coordY;
    //   const lon = p.coordX;
    //   const locId = (p.zip || '').trim();

    //   const [tidalData, airQuality, indices, sun] = await Promise.all([
    //     this.getData(p.code, tideDate).catch((e) => {
    //       this.logger.warn(`tidal data ${p.code}: ${e}`);
    //       return null;
    //     }),
    //     this.weatherService.getAirQualityDaily(lat, lon).catch((e) => {
    //       this.logger.warn(`airQuality ${p.id}: ${e}`);
    //       return null;
    //     }),
    //     locId
    //       ? this.weatherService.getIndices(daysVal, locId).catch((e) => {
    //           this.logger.warn(`indices ${p.id}: ${e}`);
    //           return null;
    //         })
    //       : Promise.resolve(null),
    //     locId
    //       ? this.weatherService.getSun(locId, sunDate).catch((e) => {
    //           this.logger.warn(`sun ${p.id}: ${e}`);
    //           return null;
    //         })
    //       : Promise.resolve(null),
    //   ]);

    //   const row = Object.assign({}, p, {
    //     tidalData,
    //     airQuality,
    //     indices,
    //     sun,
    //   }) as TideMarkerPointEnriched;
    //   out.push(row);
    // }

    return ports;
  }
}
