import BaseCURD from '../../../utils/classes/curd.service';
import { Hydrology } from 'src/entities/sqlite/hydrology.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MyczStdetailService } from './mycz-stdetail.service';

const EARTH_RADIUS_M = 6371000;

function normalizeSttpQuery(sttp?: string | string[]): string[] {
  if (sttp === undefined || sttp === null) {
    return [];
  }
  const parts = Array.isArray(sttp) ? sttp : [sttp];
  const flat = parts.flatMap((v) =>
    String(v)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );
  return [...new Set(flat)];
}

function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_M * c;
}

export type HydrologyRadarItem = Hydrology & { distanceMeters: number };

export type HydrologyRadarDetailItem = HydrologyRadarItem & {
  /** stDetail 响应中时间最新的一条记录 */
  latest: Record<string, unknown> | null;
  /** /sqc/stDetail 原始 JSON，失败或非 JSON 时为 null */
  detail: unknown;
};

@Injectable()
export class HydrologyService extends BaseCURD {
  constructor(
    @InjectRepository(Hydrology)
    private hydrologyRepository: Repository<Hydrology>,
    private readonly myczStdetail: MyczStdetailService,
  ) {
    super(hydrologyRepository);
  }

  /**
   * 水文站列表；sttp 可多码（OR），每码可命中库中逗号拼接（如 PP,ZQ）
   */
  async findPoints(
    cityName?: string,
    sttp?: string | string[],
  ): Promise<Hydrology[]> {
    const qb = this.hydrologyRepository.createQueryBuilder('h');

    const city = cityName?.trim();
    if (city) {
      qb.andWhere('h.cityName = :cityName', { cityName: city });
    }

    const codes = normalizeSttpQuery(sttp);
    if (codes.length > 0) {
      const clauses = codes.map(
        (_, i) =>
          `(h.sttp = :sttp${i} OR INSTR(',' || h.sttp || ',', ',' || :sttp${i} || ',') > 0)`,
      );
      const params = Object.fromEntries(
        codes.map((c, i) => [`sttp${i}`, c]),
      ) as Record<string, string>;
      qb.andWhere(`(${clauses.join(' OR ')})`, params);
    }

    return qb.getMany();
  }

  /**
   * 以给定经纬度为圆心，半径 2km 内的水文站（Haversine 球面距离）
   */
  async findWithinRadar(
    lat: number,
    lng: number,
    radius = 2000,
  ): Promise<HydrologyRadarItem[]> {
    const kmPerDegLat = 111;
    const cosLat = Math.cos((lat * Math.PI) / 180);
    const latDelta = radius / (1000 * kmPerDegLat);
    const lngDelta =
      radius / (1000 * kmPerDegLat * Math.max(Math.abs(cosLat), 0.01));

    const candidates = await this.hydrologyRepository
      .createQueryBuilder('h')
      .where('CAST(h.lat AS REAL) BETWEEN :latMin AND :latMax', {
        latMin: lat - latDelta,
        latMax: lat + latDelta,
      })
      .andWhere('CAST(h.lng AS REAL) BETWEEN :lngMin AND :lngMax', {
        lngMin: lng - lngDelta,
        lngMax: lng + lngDelta,
      })
      .getMany();

    const withDistance: HydrologyRadarItem[] = [];
    for (const row of candidates) {
      const rowLat = parseFloat(row.lat);
      const rowLng = parseFloat(row.lng);
      if (Number.isNaN(rowLat) || Number.isNaN(rowLng)) {
        continue;
      }
      const distanceMeters = haversineMeters(lat, lng, rowLat, rowLng);
      if (distanceMeters <= radius) {
        withDistance.push({ ...row, distanceMeters });
      }
    }

    withDistance.sort((a, b) => a.distanceMeters - b.distanceMeters);
    return withDistance;
  }

  /**
   * 2km 内水文站 + 各站 nhwx.mycz.cn /sqc/stDetail 详情中时间最新的一条数据
   */
  async findWithinRadarWithDetail(
    lat: number,
    lng: number,
  ): Promise<HydrologyRadarDetailItem[]> {
    const stations = await this.findWithinRadar(lat, lng);
    const batchSize = 4;
    const out: HydrologyRadarDetailItem[] = [];
    for (let i = 0; i < stations.length; i += batchSize) {
      const chunk = stations.slice(i, i + batchSize);
      const batch = await Promise.all(
        chunk.map(async (s) => {
          const types = s.sttp
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean);
          const rows: HydrologyRadarDetailItem[] = [];
          for (const t of types) {
            const { raw, latest } = await this.myczStdetail.fetchStDetail(
              s.stcd,
              t,
            );
            const detail =
              raw && typeof raw === 'object' && raw !== null && 'list' in raw
                ? (raw as { list: unknown }).list
                : raw;
            rows.push({
              ...s,
              latest,
              detail,
              sttp: t,
            });
          }
          return rows;
        }),
      );
      out.push(...batch.flat());
    }
    return out;
  }
}
