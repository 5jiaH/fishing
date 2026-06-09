import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard as PassportAuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';

import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * 重写鉴权守卫
 * @param key
 * @returns
 */
@Injectable()
export class AuthGuard extends PassportAuthGuard('apiJwt') {
  constructor(readonly reflector: Reflector) {
    super();
  }
  async canActivate(context: ExecutionContext): Promise<any> {
    const isPublic = this.reflector.get<boolean>(
      IS_PUBLIC_KEY,
      context.getHandler(),
    );
    if (isPublic) return true; // 不需要进行身份验证
    try {
      // 调用父类的 canActivate，正确捕获可能的 401 错误
      return await super.canActivate(context);
    } catch (error) {
      // 直接抛出父类的 401 错误，或自定义逻辑
      throw new UnauthorizedException(error.name);
    }
  }
}
