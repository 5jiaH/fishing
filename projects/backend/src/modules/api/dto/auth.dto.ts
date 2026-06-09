import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

/** 获取验证码 Query */
export class codeDto {
  @ApiProperty({ description: '用户名，与 type 组成 Redis 键' })
  @IsString()
  key: string;

  @ApiProperty({ enum: ['login', 'register'], description: '验证码场景' })
  @IsString()
  type: 'login' | 'register';
}

/** 用户注册 Body */
export class RegisterDto {
  @ApiProperty({ description: '登录名，唯一' })
  @IsString()
  username: string;

  @ApiProperty({ description: '明文密码（服务端 MD5 入库）' })
  @IsString()
  password: string;

  @ApiProperty({ description: '须先 GET /auth/verificationCode 获取' })
  @IsString()
  code: string;

  @ApiPropertyOptional({ description: '头像 URL' })
  @IsString()
  @IsOptional()
  cover: string;
}

/** 用户名密码登录 Body */
export class LoginDto {
  @ApiProperty()
  @IsString()
  username: string;

  @ApiProperty()
  @IsString()
  password: string;

  @ApiProperty({ description: '须先 GET /auth/verificationCode 获取' })
  @IsString()
  code: string;
}
