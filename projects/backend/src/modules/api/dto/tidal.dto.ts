import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
} from 'class-validator';

/** 潮汐数据 Query */
export class TidalGetDataDto {
  @ApiProperty({ description: '港口/站点 code' })
  @IsString()
  code: string;

  @ApiProperty({ example: '2026-06-04', description: '日期 YYYY-MM-DD' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date 须为 YYYY-MM-DD',
  })
  date: string;
}

/** 港口标记点 Query */
export class TidalPointDto {
  @ApiProperty({ description: '区域分类 parentId（tide_category.id）' })
  @IsString()
  @MinLength(1)
  parentId: string;

  @ApiPropertyOptional({ description: '日期 YYYY-MM-DD，默认当天' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date 须为 YYYY-MM-DD',
  })
  date?: string;

  @ApiPropertyOptional({ description: '生活指数天数 1～7，默认 3' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7)
  days?: number;
}
