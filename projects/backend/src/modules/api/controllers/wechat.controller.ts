import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { ResponseInterceptor } from 'src/utils/middleware/response';
import {
  WechatAuthLoginDto,
  WechatCodeDto,
  WechatLocationDto,
} from '../dto/wechat.dto';
import { WechatService } from '../services/wechat.service';
import { AuthService } from '../services/auth.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('wechat')
@Controller('wechat')
@UseInterceptors(ResponseInterceptor)
export class WechatController {
  constructor(
    private readonly wechatService: WechatService,
    private readonly authService: AuthService,
  ) {}

  @ApiOperation({
    summary: '小程序授权登录（推荐）',
    description:
      'wx.login 的 code 换 openid 并签发 JWT。可选 phoneCode（getPhoneNumber）、avatarUrl',
  })
  @Post('auth/login')
  authLogin(@Body() body: WechatAuthLoginDto, @Req() request: Request) {
    return this.wechatService.authLogin(body, request);
  }

  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: '当前登录用户', description: '需 Bearer JWT' })
  @Get('auth/me')
  @UseGuards(AuthGuard('apiJwt'))
  authMe(@Req() request: Request) {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('缺少 Bearer Token');
    }
    const token = authHeader.slice(7).trim();
    const payload = this.authService.verifyApiJwt(token);
    if (!payload.username) {
      throw new UnauthorizedException('无效 Token');
    }
    return this.wechatService.getProfileByUsername(payload.username);
  }

  @ApiOperation({
    summary: '小程序登录（兼容）',
    description: '仅传 code，等价于 auth/login 的精简响应',
  })
  @Post('login')
  login(@Body() body: WechatCodeDto, @Req() request: Request) {
    return this.wechatService.loginWithCode(body.code, request);
  }

  @ApiOperation({
    summary: '逆地理编码',
    description: 'WGS84 坐标转地址，需配置 TENCENT_LBS_KEY 或 QQMAP_KEY',
  })
  @Post('location')
  location(@Body() body: WechatLocationDto) {
    return this.wechatService.resolveLocation(body.latitude, body.longitude);
  }
}
