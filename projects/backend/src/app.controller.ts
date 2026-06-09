import { Controller, Get, Redirect, Req, Res, UseGuards } from '@nestjs/common';
import { AuthenticatedGuard } from './modules/web/services/auth/authenticated.guard';

@Controller()
export class AppController {
  @UseGuards(AuthenticatedGuard)
  @Get()
  index(@Req() req, @Res() res) {
    Redirect('/web/index');
  }
}
