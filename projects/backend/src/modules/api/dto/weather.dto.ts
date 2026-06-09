import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ArrayNotEmpty, IsString, MinLength } from 'class-validator';

/** 分钟降水等 Query */
export class WeatherLocationDto {
  @ApiProperty({ example: '101010100', description: '和风 locationId' })
  @IsString()
  location: string;
}

/** 基础天气批量 Body */
export class WeatherBasicBatchDto {
  @ApiProperty({
    type: [String],
    example: ['101010100', '101020100'],
    description: '和风 locationId 数组',
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  location: string[];
}

/** 基础天气单点 Body */
export class WeatherBasicSingleDto {
  @ApiProperty({ example: '101010100' })
  @IsString()
  @MinLength(1, { message: 'location 不能为空' })
  location: string;
}
