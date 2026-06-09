import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

function parseGuestRestrictedMax(
  raw: string | undefined,
  fallback: number,
): number {
  if (raw === undefined || raw === '') return fallback;
  const n = parseInt(String(raw).trim(), 10);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
}

/**
 * 满足任一条件时须携带有效 Bearer JWT，否则 403：
 * 1）同一 IP 上 /auth/login（或注册发 token）成功满 3 次；
 * 2）同一 IP 对本路由无有效 JWT 的访问已超过 API_GUEST_RESTRICTED_MAX 次（由 .env 配置，默认 3）。
 */
@Injectable()
export class TestJwtAfterThreeLoginsGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const header = request.headers?.authorization as string | undefined;
    if (this.authService.tryVerifyApiBearerAuthHeader(header).ok) {
      return true;
    }
    const ip = this.authService.getClientIp(request);
    if ((await this.authService.getSuccessfulApiLoginCountByIp(ip)) >= 3) {
      throw new ForbiddenException(
        '该 IP 已成功获取 Token 满 3 次，请在 Header 携带 Authorization: Bearer <token>',
      );
    }
    const guestMax = parseGuestRestrictedMax(
      this.config.get<string>('API_GUEST_RESTRICTED_MAX'),
      3,
    );
    const anonymousHits =
      await this.authService.bumpRestrictedAnonymousHitByIp(ip);
    if (anonymousHits > guestMax) {
      throw new ForbiddenException(
        `匿名访问本接口已超过 ${guestMax} 次，请在 Header 携带 Authorization: Bearer <token>`,
      );
    }
    return true;
  }
}
