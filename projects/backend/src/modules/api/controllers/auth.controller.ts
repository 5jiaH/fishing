import { AuthService } from '../services/auth.service';
import { VerificationService } from '../../shared/service/verification';
import { UploadMiddleware } from 'src/utils/middleware/upload';
import { LoginDto, codeDto, RegisterDto } from './../dto/auth.dto';
import {
  Controller,
  Post,
  UseGuards,
  Request,
  Body,
  Get,
  Query,
  UseInterceptors,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ResponseInterceptor } from 'src/utils/middleware/response';
import { FileInterceptor } from '@nestjs/platform-express';
import { userItf } from '../interfaces/controller';
import type { Request as ExpressRequest } from 'express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';

const upload = new UploadMiddleware();

@ApiTags('auth')
@Controller('auth')
@UseInterceptors(ResponseInterceptor)
export class AuthController {
  constructor(
    private verificationService: VerificationService,
    private authService: AuthService,
  ) {}

  @ApiOperation({
    summary: '用户注册',
    description:
      '校验验证码后创建用户并返回 JWT（1h）。须先 GET /auth/verificationCode?type=register&key={username}',
  })
  @Post('register')
  async register(@Body() body: RegisterDto, @Request() request) {
    const ip: string = request.connection.remoteAddress;
    const { code, ...user } = body;
    const params: userItf = { ...user, ip };
    const codeKey = `register.${params.username}`;
    const validateCode = await this.verificationService.validate(codeKey, code);
    if (validateCode) {
      this.verificationService.delete(codeKey);
    } else {
      throw new ForbiddenException('验证码错误');
    }

    return await this.authService
      .register(params)
      .then(async (res) => {
        await this.authService.recordSuccessfulApiLogin(request);
        return this.authService.createJwt(
          { username: params.username },
          { expiresIn: '1h' },
        );
      })
      .catch((error) => {
        return error.message;
      });
  }

  @ApiOperation({
    summary: '用户名密码登录',
    description:
      'Local 策略校验账号 + 验证码，返回 JWT（2h）。须先 GET /auth/verificationCode?type=login&key={username}',
  })
  @UseGuards(AuthGuard('apiLocal'))
  @Post('login')
  async login(@Body() body: LoginDto, @Request() request: ExpressRequest) {
    const { code, ...user } = body;
    const codeKey = `login.${user.username}`;
    const validateCode = await this.verificationService.validate(codeKey, code);
    if (validateCode) {
      this.verificationService.delete(codeKey);
    } else {
      throw new Error('验证码错误');
    }

    const result = await this.authService.findUser(user.username);
    await this.authService.recordSuccessfulApiLogin(request);
    return this.authService.createJwt({ username: result?.username });
  }

  @ApiOperation({
    summary: '获取验证码',
    description: 'Query：type=login|register，key=用户名。开发环境响应含明文 code',
  })
  @Get('verificationCode')
  verificationCode(@Query() req: codeDto): { code: string } {
    const params = { key: `${req.type}.${req.key}` };
    const code = this.verificationService.create(params);
    return { code };
  }

  @ApiOperation({
    summary: '上传文件',
    description: 'multipart 字段 file；允许 .jpg .jpeg .png .md',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: upload.createMulterOptions().storage,
      fileFilter: (req, file, callback) => {
        upload.setAllowedFileTypes(['.jpg', '.jpeg', '.png', '.md']);
        upload.fileFilter(req, file, callback);
      },
    }),
  )
  upload() {
    return 'api';
  }
}
