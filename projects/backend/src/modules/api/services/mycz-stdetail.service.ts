import { Injectable, Logger } from '@nestjs/common';
import * as dayjs from 'dayjs';

const DEFAULT_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36 NetType/WIFI MicroMessenger/7.0.20.1781(0x6700143B) WindowsWechat(0x63090a13) UnifiedPCWindowsWechat(0xf2541721) XWEB/18787 Flue';

/** 与 nhwx.mycz.cn /sqc/stDetail 接口约定的时间片段格式：YYYY-MM-DD+HH */
function toStDetailDateParam(d: dayjs.Dayjs): string {
  return `${d.format('YYYY-MM-DD')}+${d.format('HH')}`;
}

const TIME_KEYS = ['TM', 'tm', 'INTV', 'intv', 'DT', 'dt', 'time', 'Time'];

function parseDetailTime(v: unknown): number {
  if (v == null || v === '') {
    return NaN;
  }
  // eslint-disable-next-line @typescript-eslint/no-base-to-string
  const s = String(v).replace(/\+/g, ' ');
  const t = Date.parse(s);
  return Number.isNaN(t) ? NaN : t;
}

function walkValues(
  root: unknown,
  visit: (o: Record<string, unknown>) => void,
  depth = 0,
): void {
  if (depth > 14 || root == null) {
    return;
  }
  if (Array.isArray(root)) {
    for (const el of root) {
      walkValues(el, visit, depth + 1);
    }
    return;
  }
  if (typeof root !== 'object') {
    return;
  }
  visit(root as Record<string, unknown>);
  for (const v of Object.values(root)) {
    walkValues(v, visit, depth + 1);
  }
}

/**
 * 从 stDetail JSON 中找出带时间字段的对象里时间最新的一条（与 crawler 同源接口，解析逻辑在服务端重写）
 */
function pickLatestRecordFromStDetailJson(
  json: unknown,
): Record<string, unknown> | null {
  let bestRow: Record<string, unknown> | null = null;
  let bestT = Number.NEGATIVE_INFINITY;
  walkValues(json, (o) => {
    for (const key of TIME_KEYS) {
      if (!(key in o)) {
        continue;
      }
      const t = parseDetailTime(o[key]);
      if (Number.isNaN(t)) {
        continue;
      }
      if (bestRow === null || t > bestT) {
        bestT = t;
        bestRow = { ...o };
      }
      break;
    }
  });
  return bestRow;
}

export type MyczStDetailResult = {
  raw: any;
  latest: Record<string, unknown> | null;
};

@Injectable()
export class MyczStdetailService {
  private readonly logger = new Logger(MyczStdetailService.name);

  /**
   * 请求 nhwx.mycz.cn /sqc/stDetail（逻辑对齐 lib/crawler.mycz.cn.detail.js，未引用该文件）
   */
  async fetchStDetail(
    stcd: string,
    sttp: string,
    options?: { startDate?: string; endDate?: string; hour?: string },
  ): Promise<MyczStDetailResult> {
    const host = process.env.MYCZ_STDETAIL_HOST ?? 'nhwx.mycz.cn';
    const hour = options?.hour ?? '';

    const startDate =
      options?.startDate ??
      toStDetailDateParam(dayjs().subtract(2, 'day').hour(0));
    const endDate = options?.endDate ?? toStDetailDateParam(dayjs());
    const path = sttp === 'PP' ? 'oneDetail' : 'stDetail';

    // 水文
    // https://nhwx.mycz.cn/sqc/stDetail?stcd=81203200&startDate=2026-03-28+00&endDate=2026-03-30+17&hour=
    // 雨量
    // https://nhwx.mycz.cn/sqc/oneDetail?stcd=81213558&startDate=2026-03-28+00&endDate=2026-03-30+17
    const pathStr =
      `/sqc/${path}?stcd=${encodeURIComponent(stcd)}` +
      `&startDate=${startDate}` +
      `&endDate=${endDate}` +
      `&hour=${encodeURIComponent(hour)}`;

    const url = `https://${host}${pathStr}`;
    // https://nhwx.mycz.cn/sqc/stDetail?stcd=81203200&startDate=2026-03-28+00&endDate=2026-03-30+17&hour=

    const headers: Record<string, string> = {
      'User-Agent': process.env.MYCZ_STDETAIL_UA ?? DEFAULT_UA,
      'X-Requested-With': 'XMLHttpRequest',
      Referer: `https://${host}/sqc/info.html?stcd=${encodeURIComponent(stcd)}`,
      Host: host,
      Cookie: 'PHPSESSID=9gfd63r5ln1pvo0k0n6ldgdsi2',
    };

    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 20_000);

    try {
      const res = await fetch(url, { headers, signal: ac.signal });
      const text = await res.text();

      if (!res.ok) {
        this.logger.warn(`stDetail HTTP ${res.status} stcd=${stcd}`);
        return { raw: null, latest: null };
      }

      const trimmed = text.trim();
      if (trimmed.startsWith('<') || trimmed.startsWith('<!')) {
        this.logger.warn(`stDetail 返回非 JSON（可能被拦截）stcd=${stcd}`);
        return { raw: null, latest: null };
      }
      let json: unknown;
      try {
        json = JSON.parse(text) as unknown;
      } catch {
        this.logger.warn(`stDetail JSON 解析失败 stcd=${stcd}`);
        return { raw: null, latest: null };
      }
      const latest = pickLatestRecordFromStDetailJson(json);
      return { raw: json, latest };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`stDetail 请求异常 stcd=${stcd} ${msg}`);
      return { raw: null, latest: null };
    } finally {
      clearTimeout(timer);
    }
  }
}
