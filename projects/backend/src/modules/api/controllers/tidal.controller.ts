import { Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ResponseInterceptor } from 'src/utils/middleware/response';
import { TidalGetDataDto, TidalPointDto } from '../dto/tidal.dto';
import { TidalService } from '../services/tidal.service';
import { TidePort } from 'src/entities/sqlite/tide-port.entity';

@ApiTags('tidal')
@Controller('tidal')
@UseInterceptors(ResponseInterceptor)
export class TidalController {
  constructor(private readonly tidalService: TidalService) {}

  @ApiOperation({ summary: '获取潮汐数据', description: '站点 code + 日期' })
  @Get('data')
  async data(@Query() query: TidalGetDataDto) {
    return this.tidalService.getData(query.code, query.date);
  }

  @ApiOperation({ summary: '获取区域列表' })
  @ApiQuery({ name: 'country', required: false, description: '国家代码，如 CN' })
  @Get('areas')
  async areas(@Query('country') country?: string) {
    return this.tidalService.getAreaList(country);
  }

  @ApiOperation({
    summary: '获取港口标记点',
    description: '按 parentId（tide_category）查询港口列表',
  })
  @Get('point')
  point(@Query() query: TidalPointDto): Promise<TidePort[]> {
    return this.tidalService.getMarkerPointByGroupId(query.parentId);
  }
}
