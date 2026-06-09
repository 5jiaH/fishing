import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsUrl, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

/** 小程序 wx.login 的 code */
export class WechatCodeDto {
  @ApiProperty({ description: 'wx.login() 返回的临时 code' })
  @IsString()
  @MinLength(1, { message: 'code 不能为空' })
  code: string;
}

/** 小程序授权登录 Body */
export class WechatAuthLoginDto {
  @ApiProperty({ description: 'wx.login() 返回的 code，必填' })
  @IsString()
  @MinLength(1, { message: 'code 不能为空' })
  code: string;

  @ApiPropertyOptional({ description: 'getPhoneNumber 组件返回的 code' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  phoneCode?: string;

  @ApiPropertyOptional({ description: '用户头像 URL，写入 user.cover' })
  @IsOptional()
  @IsUrl({}, { message: 'avatarUrl 须为有效 URL' })
  avatarUrl?: string;
}

/** 小程序 wx.getLocation 坐标 */
export class WechatLocationDto {
  @ApiProperty({ example: 39.9, description: '纬度 WGS84' })
  @Type(() => Number)
  @IsNumber()
  latitude: number;

  @ApiProperty({ example: 116.4, description: '经度 WGS84' })
  @Type(() => Number)
  @IsNumber()
  longitude: number;
}
