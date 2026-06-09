import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseFloatPipe,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ResponseInterceptor } from 'src/utils/middleware/response';
import {
  WeatherBasicBatchDto,
  WeatherBasicSingleDto,
  WeatherLocationDto,
} from '../dto/weather.dto';
import {
  WeatherService,
  type WeatherBasicItem,
} from '../services/weather.service';

@ApiTags('weather')
@Controller('weather')
@UseInterceptors(ResponseInterceptor)
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  @ApiOperation({ summary: '10 分钟降雨量', description: '和风 locationId' })
  @Get('minutely/10m')
  minutely10m(@Query() query: WeatherLocationDto) {
    return this.weatherService.getMinutely10m(query.location);
  }

  @ApiOperation({ summary: '空气质量（日）' })
  @ApiParam({ name: 'latitude', type: Number })
  @ApiParam({ name: 'longitude', type: Number })
  @Get('airquality/daily/:latitude/:longitude')
  airqualityDaily(
    @Param('latitude', ParseFloatPipe) latitude: number,
    @Param('longitude', ParseFloatPipe) longitude: number,
  ) {
    return this.weatherService.getAirQualityDaily(latitude, longitude);
  }

  @ApiOperation({
    summary: '基础天气（单点）',
    description: '24h 天气、生活指数、日出日落',
  })
  @Post('basic/one')
  async basicOne(
    @Body() body: WeatherBasicSingleDto,
  ): Promise<WeatherBasicItem> {
    const raw = body.location;
    if (typeof raw !== 'string') {
      throw new BadRequestException('location 须为字符串');
    }
    const loc = raw.trim();
    if (loc.length < 1) {
      throw new BadRequestException('location 须为非空字符串');
    }
    const payload = await this.weatherService.getBasicWeather(loc);
    return { location: loc, ...payload };
  }

  @ApiOperation({
    summary: '基础天气（批量）',
    description: '按 location 数组顺序逐项拉取',
  })
  @Post('basic')
  async basic(@Body() body: WeatherBasicBatchDto): Promise<WeatherBasicItem[]> {
    if (!body || !Array.isArray(body.location)) {
      throw new BadRequestException('location 须为非空字符串数组');
    }
    const locations: string[] = [];
    for (let i = 0; i < body.location.length; i++) {
      const raw = body.location[i];
      if (typeof raw !== 'string' || raw.trim().length < 1) {
        throw new BadRequestException(`location[${i}] 须为非空字符串`);
      }
      locations.push(raw.trim());
    }
    const out: WeatherBasicItem[] = [];
    for (let i = 0; i < locations.length; i++) {
      const location = locations[i];
      try {
        const payload = await this.weatherService.getBasicWeather(location);
        out[i] = { location, ...payload };
      } catch (err) {
        console.error(err);
      }
    }
    return out;
  }
}
