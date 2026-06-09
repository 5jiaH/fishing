import { Controller, Get, Render, UseGuards } from '@nestjs/common';
import { AuthenticatedGuard } from '../../services/auth/authenticated.guard';

@Controller('web/account')
export class AccountController {
  constructor() {}

  /**
   * 登录页面
   * @returns
   */
  @Render('account/login')
  @Get('login')
  loginPage() {
    return {};
  }

  /**
   * 用户列表页
   * @returns
   */
  @UseGuards(AuthenticatedGuard)
  @Render('account/auth')
  @Get('auth')
  authPage() {
    return {};
  }
}
