import { Controller, Get, Render, UseGuards } from '@nestjs/common';
import { AuthenticatedGuard } from '../../services/auth/authenticated.guard';

@Controller('web/ability')
export class AbilityController {
  constructor() {}

  @Render('ability/scheduled')
  @UseGuards(AuthenticatedGuard)
  @Get('scheduled')
  scheduled() {}

  @Render('ability/logs')
  @UseGuards(AuthenticatedGuard)
  @Get('logs')
  logs() {
    return {
      api: process.env.SIGNOZ_API,
    };
  }
}
