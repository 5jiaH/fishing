import { Controller, Get, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResponseInterceptor } from 'src/utils/middleware/response';
import { TestJwtAfterThreeLoginsGuard } from '../services/auth/test-jwt-after-three-logins.guard';

@ApiTags('test')
@Controller('test')
@UseInterceptors(ResponseInterceptor)
export class TestController {
  @ApiOperation({ summary: '连通性测试' })
  @Get('test')
  test() {
    return 'test';
  }

  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: '限流测试接口',
    description:
      '同一 IP 当日匿名访问超过 API_GUEST_RESTRICTED_MAX（默认 3）后须 Bearer JWT',
  })
  @Get('restricted')
  @UseGuards(TestJwtAfterThreeLoginsGuard)
  restricted() {
    return 'restricted ok';
  }
}
