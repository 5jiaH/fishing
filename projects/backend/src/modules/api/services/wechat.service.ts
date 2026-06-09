import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'crypto';
import type { Request } from 'express';
import { Repository } from 'typeorm';
import { User } from 'src/entities/mysql/user.entity';
import { MYSQL_CONNECTION } from 'src/database/database.constants';
import { AuthService } from './auth.service';
import { WechatAuthLoginDto } from '../dto/wechat.dto';

const WX_CODE2SESSION = 'https://api.weixin.qq.com/sns/jscode2session';
const WX_ACCESS_TOKEN = 'https://api.weixin.qq.com/cgi-bin/token';
const WX_GET_PHONE = 'https://api.weixin.qq.com/wxa/business/getuserphonenumber';
const TENCENT_GEOCODER = 'https://apis.map.qq.com/ws/geocoder/v1/';

type WxCode2Session = {
  openid?: string;
  session_key?: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
};

type WxAccessToken = {
  access_token?: string;
  expires_in?: number;
  errcode?: number;
  errmsg?: string;
};

type WxPhoneResult = {
  errcode?: number;
  errmsg?: string;
  phone_info?: {
    phoneNumber?: string;
    purePhoneNumber?: string;
    countryCode?: string;
  };
};

type TencentGeocodeResult = {
  status: number;
  message: string;
  result?: {
    address?: string;
    formatted_addresses?: { recommend?: string; rough?: string };
    ad_info?: {
      nation?: string;
      province?: string;
      city?: string;
      district?: string;
    };
  };
};

export type WechatAuthLoginResult = {
  token: string;
  openid: string;
  unionid: string | null;
  isNewUser: boolean;
  phone: string | null;
  user: {
    id: number;
    username: string;
    cover: string | null;
    role: string;
    disabled: number;
  };
};

@Injectable()
export class WechatService {
  private accessTokenCache: { token: string; expiresAt: number } | null = null;

  constructor(
    @InjectRepository(User, MYSQL_CONNECTION)
    private readonly userRepository: Repository<User>,
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  private get appId() {
    return this.configService.get<string>('WECHAT_MINIAPP_APPID', '');
  }

  private get appSecret() {
    return this.configService.get<string>('WECHAT_MINIAPP_SECRET', '');
  }

  private get tencentLbsKey() {
    return this.configService.get<string>(
      'TENCENT_LBS_KEY',
      this.configService.get<string>('QQMAP_KEY', ''),
    );
  }

  private wechatUsername(openid: string) {
    return `wx_${openid}`;
  }

  /**
   * 调用微信 jscode2session
   * @see https://developers.weixin.qq.com/miniprogram/dev/api-backend/open-api/login/auth.code2Session.html
   */
  async code2Session(
    code: string,
  ): Promise<{ openid: string; unionid?: string }> {
    if (!this.appId || !this.appSecret) {
      throw new ServiceUnavailableException(
        '未配置 WECHAT_MINIAPP_APPID / WECHAT_MINIAPP_SECRET',
      );
    }
    const url = new URL(WX_CODE2SESSION);
    url.searchParams.set('appid', this.appId);
    url.searchParams.set('secret', this.appSecret);
    url.searchParams.set('js_code', code);
    url.searchParams.set('grant_type', 'authorization_code');

    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) {
      throw new InternalServerErrorException('微信 jscode2session 请求失败');
    }
    const data = (await res.json()) as WxCode2Session;
    if (data.errcode != null && data.errcode !== 0) {
      throw new BadRequestException(
        data.errmsg ?? `微信接口错误: ${data.errcode}`,
      );
    }
    if (!data.openid) {
      throw new BadRequestException('未返回 openid');
    }
    return { openid: data.openid, unionid: data.unionid };
  }

  private async getAccessToken(): Promise<string> {
    const cached = this.accessTokenCache;
    if (cached && Date.now() < cached.expiresAt - 60_000) {
      return cached.token;
    }
    if (!this.appId || !this.appSecret) {
      throw new ServiceUnavailableException(
        '未配置 WECHAT_MINIAPP_APPID / WECHAT_MINIAPP_SECRET',
      );
    }
    const url = new URL(WX_ACCESS_TOKEN);
    url.searchParams.set('grant_type', 'client_credential');
    url.searchParams.set('appid', this.appId);
    url.searchParams.set('secret', this.appSecret);

    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) {
      throw new InternalServerErrorException('微信 access_token 请求失败');
    }
    const data = (await res.json()) as WxAccessToken;
    if (data.errcode != null && data.errcode !== 0) {
      throw new BadRequestException(
        data.errmsg ?? `微信 access_token 错误: ${data.errcode}`,
      );
    }
    if (!data.access_token) {
      throw new BadRequestException('未返回 access_token');
    }
    const ttl = Math.max(300, Number(data.expires_in) || 7200);
    this.accessTokenCache = {
      token: data.access_token,
      expiresAt: Date.now() + ttl * 1000,
    };
    return data.access_token;
  }

  /**
   * 手机号快速验证 / 实时验证组件 code 换手机号
   * @see https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/user-info/phone-number/getPhoneNumber.html
   */
  async getPhoneByCode(phoneCode: string): Promise<string | null> {
    const accessToken = await this.getAccessToken();
    const url = `${WX_GET_PHONE}?access_token=${encodeURIComponent(accessToken)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: phoneCode }),
    });
    if (!res.ok) {
      throw new InternalServerErrorException('微信 getPhoneNumber 请求失败');
    }
    const data = (await res.json()) as WxPhoneResult;
    if (data.errcode != null && data.errcode !== 0) {
      throw new BadRequestException(
        data.errmsg ?? `微信手机号接口错误: ${data.errcode}`,
      );
    }
    return (
      data.phone_info?.phoneNumber ??
      data.phone_info?.purePhoneNumber ??
      null
    );
  }

  /**
   * 登记或更新小程序用户（username = wx_{openid}，供 JWT 校验）
   * @returns 是否为新注册用户
   */
  private async ensureWechatUserRecord(
    openid: string,
    profile?: { cover?: string; ip?: string },
  ): Promise<boolean> {
    const username = this.wechatUsername(openid);
    const existing = await this.userRepository.findOne({ where: { username } });
    if (existing) {
      const patch: Partial<User> = {};
      if (profile?.cover && profile.cover !== existing.cover) {
        patch.cover = profile.cover;
      }
      if (profile?.ip) {
        patch.ip = profile.ip;
      }
      if (Object.keys(patch).length > 0) {
        await this.userRepository.update(existing.id, patch);
      }
      return false;
    }
    const password = createHash('md5').update(randomBytes(32)).digest('hex');
    try {
      await this.userRepository.insert({
        username,
        password,
        role: 'U',
        ...(profile?.cover ? { cover: profile.cover } : {}),
        ...(profile?.ip ? { ip: profile.ip } : {}),
      });
      return true;
    } catch (e) {
      if ((e as { code?: string })?.code === 'ER_DUP_ENTRY') {
        return false;
      }
      throw e;
    }
  }

  private toPublicUser(user: User) {
    return {
      id: user.id,
      username: user.username,
      cover: user.cover ?? null,
      role: user.role,
      disabled: user.disabled,
    };
  }

  /**
   * 小程序授权登录：code 换 openid → 创建/更新用户 → 签发 JWT（与 /auth 同源）
   */
  async authLogin(
    dto: WechatAuthLoginDto,
    request?: Request,
  ): Promise<WechatAuthLoginResult> {
    const { openid, unionid } = await this.code2Session(dto.code);
    const ip = request ? this.authService.getClientIp(request) : undefined;
    const cover = dto.avatarUrl?.trim() || undefined;

    const isNewUser = await this.ensureWechatUserRecord(openid, { cover, ip });

    let phone: string | null = null;
    if (dto.phoneCode?.trim()) {
      phone = await this.getPhoneByCode(dto.phoneCode.trim());
    }

    const username = this.wechatUsername(openid);
    const user = await this.userRepository.findOne({ where: { username } });
    if (!user) {
      throw new InternalServerErrorException('用户登记失败');
    }
    if (user.disabled !== 1) {
      throw new UnauthorizedException('账号已禁用');
    }

    const token = this.authService.createJwt(
      { username },
      { expiresIn: '2h' },
    ) as string;

    if (request) {
      await this.authService.recordSuccessfulApiLogin(request);
    }

    return {
      token,
      openid,
      unionid: unionid ?? null,
      isNewUser,
      phone,
      user: this.toPublicUser(user),
    };
  }

  /** @deprecated 请使用 authLogin；保留兼容旧路径 POST /wechat/login */
  async loginWithCode(code: string, request?: Request) {
    const result = await this.authLogin({ code }, request);
    return {
      token: result.token,
      openid: result.openid,
      unionid: result.unionid,
    };
  }

  /** 根据 JWT 中的 username 返回当前小程序用户信息 */
  async getProfileByUsername(username: string) {
    const user = await this.userRepository.findOne({
      where: { username },
      select: ['id', 'username', 'cover', 'role', 'disabled', 'create_time'],
    });
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }
    const openid = username.startsWith('wx_') ? username.slice(3) : null;
    return {
      ...this.toPublicUser(user),
      openid,
      create_time: user.create_time,
    };
  }

  /**
   * 将 WGS84 坐标转为可读地址。需配置 TENCENT_LBS_KEY 或 QQMAP_KEY（与小程序「腾讯位置服务」同 key 类型）
   * 未配置 key 时仅回传原坐标
   * @see https://lbs.qq.com/service/webService/webServiceGuide/webServiceGcoder
   */
  async resolveLocation(
    latitude: number,
    longitude: number,
  ): Promise<{
    latitude: number;
    longitude: number;
    address: string | null;
    ad_info: {
      nation: string;
      province: string;
      city: string;
      district: string;
    } | null;
  }> {
    const key = this.tencentLbsKey;
    if (!key) {
      return {
        latitude,
        longitude,
        address: null,
        ad_info: null,
      };
    }
    const url = new URL(TENCENT_GEOCODER);
    url.searchParams.set('location', `${latitude},${longitude}`);
    url.searchParams.set('key', key);
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) {
      throw new InternalServerErrorException('逆地址解析请求失败');
    }
    const data = (await res.json()) as TencentGeocodeResult;
    if (data.status !== 0) {
      throw new BadRequestException(
        data.message || `地址解析错误: status=${data.status}`,
      );
    }
    const r = data.result;
    const recommend = r?.formatted_addresses?.recommend;
    const ad = r?.ad_info;
    return {
      latitude,
      longitude,
      address: recommend ?? r?.address ?? null,
      ad_info: ad
        ? {
            nation: ad.nation ?? '',
            province: ad.province ?? '',
            city: ad.city ?? '',
            district: ad.district ?? '',
          }
        : null,
    };
  }
}
