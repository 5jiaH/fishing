import { Controller, Get, Render, Req, UseGuards } from '@nestjs/common';
import { AuthenticatedGuard } from '../../services/auth/authenticated.guard';
import { RoleCurd } from 'src/modules/shared/curd/role.curd';

@Controller('web/index')
export class IndexController {
  constructor(private readonly roleCurd: RoleCurd) {}

  /**
   * 基座
   * @param req
   * @returns
   */
  @Render('index/index')
  @UseGuards(AuthenticatedGuard)
  @Get()
  async index(@Req() req) {
    const user = req.user as AccountItf.user;
    const roles = await this.roleCurd.listRolesByUid(user.id, 1);
    return { user, roles };
  }

  /**
   * 鉴权失效过渡页
   * @param req
   */
  @Render('index/empty')
  @Get('empty')
  empty() {}

  /**
   * 概述页
   * @param req
   * @returns
   */
  @Render('index/overview')
  @UseGuards(AuthenticatedGuard)
  @Get('overview')
  overview(@Req() req) {
    const user = req.user as AccountItf.user;
    return { user };
  }

  /**
   * 用户管理页面
   * @param req
   * @returns
   */
  @Render('account/user')
  @UseGuards(AuthenticatedGuard)
  @Get('user')
  user(@Req() req) {
    const user = req.user as AccountItf.user;
    return { user };
  }
}
