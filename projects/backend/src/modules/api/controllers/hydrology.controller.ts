import { Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Hydrology } from 'src/entities/sqlite/hydrology.entity';
import { ResponseInterceptor } from 'src/utils/middleware/response';
import {
  HydrologyCollectionDto,
  HydrologyRadarDto,
} from '../dto/hydrology.dto';
import {
  HydrologyRadarDetailItem,
  HydrologyService,
} from '../services/hydrology.service';

@ApiTags('hydrology')
@Controller('hydrology')
@UseInterceptors(ResponseInterceptor)
export class HydrologyController {
  constructor(private readonly hydrologyService: HydrologyService) {}

  @ApiOperation({
    summary: '水文站列表',
    description: '可按 cityName、sttp 筛选；sttp 支持多值 OR',
  })
  @Get('collection')
  collection(@Query() query: HydrologyCollectionDto): Promise<Hydrology[]> {
    return this.hydrologyService.findPoints(query.cityName, query.sttp);
  }

  @ApiOperation({ summary: '雷达范围水文站', description: '距经纬度 2km 内站点' })
  @Get('radar')
  async radar(@Query() query: HydrologyRadarDto) {
    return this.hydrologyService.findWithinRadar(query.lat, query.lng);
  }

  @ApiOperation({
    summary: '雷达详情',
    description: '2km 内站点及各站最新 stDetail 记录',
  })
  @Get('radarDetail')
  async radarDetail(
    @Query() query: HydrologyRadarDto,
  ): Promise<HydrologyRadarDetailItem[]> {
    return this.hydrologyService.findWithinRadarWithDetail(
      query.lat,
      query.lng,
    );
  }
}
