import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

/** 雷达中心点 Query */
export class HydrologyRadarDto {
  @ApiProperty({ example: 31.2, description: '纬度 -90～90' })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @ApiProperty({ example: 121.5, description: '经度 -180～180' })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;
}

/** 水文站列表 Query */
export class HydrologyCollectionDto {
  @ApiPropertyOptional({ description: '城市名筛选' })
  @IsOptional()
  @IsString()
  cityName?: string;

  @ApiPropertyOptional({
    description: '站类，可多选 ?sttp=PP&sttp=ZQ 或 ?sttp=PP,ZQ',
  })
  @IsOptional()
  sttp?: string | string[];
}
