import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import * as passport from 'passport';
import { ResponseInterceptor } from 'src/utils/middleware/response';
import { ManagerCurd } from 'src/modules/shared/curd/manager.curd';
import { RoleCurd } from 'src/modules/shared/curd/role.curd';
import { AuthenticatedApiGuard } from '../../services/auth/authenticated.guard';
import { listDto } from '../../dto/account.dto';

@Controller('api/account')
export class AccountApiController {
  constructor(
    private accountCurd: ManagerCurd,
    private roleCurd: RoleCurd,
  ) {}

  /**
   * 登录接口（api）
   * @param req
   * @param res
   */
  @UseInterceptors(ResponseInterceptor)
  @UseGuards(AuthGuard('webLocal'))
  @Post('login')
  async loginApi(@Req() req, @Res() res) {
    const result = await new Promise((resolve, reject) => {
      passport.authenticate(
        'webLocal',
        (err: null | Error, user: AccountItf.userResponse) => {
          if (err) return reject(new ForbiddenException(err.message));
          if (!user) return new UnauthorizedException('Not authenticated');

          req.logIn(user, (err) => {
            if (err) return reject(new ForbiddenException(err.message));
            return resolve({ success: true });
          });
        },
      )(req, res);
    }).catch((err: Error) => {
      return { success: false, message: err.message };
    });
    res.send(result);
  }

  /**
   * 用户列表（API，与页面相同：依赖已登录 session）
   * 前端需携带 cookie：fetch(..., { credentials: 'include' })
   */
  @UseInterceptors(ResponseInterceptor)
  @UseGuards(AuthenticatedApiGuard)
  @Post('auth')
  async authApi(@Body() body: listDto) {
    const skip = Math.max(0, Number(body?.skip) || 0);
    const take = Math.min(100, Math.max(1, Number(body?.take) || 10));
    const result = await this.accountCurd.find({
      skip,
      take,
      order: body?.sort ?? { id: 'DESC' },
      select: [
        'id',
        'username',
        'ip',
        'role',
        'cover',
        'disabled',
        'create_time',
        'update_time',
      ].reduce((t, i) => ((t[i] = true), t), {} as Record<string, boolean>),
    });
    // const list = (result as { data?: unknown[] })?.data;
    // if (Array.isArray(list) && list.length) {
    //   const ids = list
    //     .map((u: { id?: number }) => Number(u?.id))
    //     .filter((id) => Number.isFinite(id));
    //   // const nameMap = await this.monitorProjectCurd.findNamesByUserIds(ids);
    //   // for (const row of list as { id: number; monitorProjectName?: string }[]) {
    //   //   row.monitorProjectName = nameMap.get(row.id) ?? '';
    //   // }
    // }
    return result;
  }

  @UseInterceptors(ResponseInterceptor)
  @UseGuards(AuthenticatedApiGuard)
  @Post('auth/create')
  async authCreate(
    @Body()
    body: {
      username: string;
      password: string;
      ip?: string;
      cover?: string;
      disabled?: number;
    },
  ) {
    if (!body?.username?.trim()) {
      throw new BadRequestException('username required');
    }
    if (!body?.password) {
      throw new BadRequestException('password required');
    }
    await this.accountCurd.register({
      username: body.username.trim(),
      password: body.password,
      ip: body.ip,
      cover: body.cover,
      disabled: body.disabled ?? 0,
      role: 'U',
    });
    return { ok: true };
  }

  @UseInterceptors(ResponseInterceptor)
  @UseGuards(AuthenticatedApiGuard)
  @Post('auth/update')
  async authUpdate(
    @Body()
    body: {
      id: number;
      username?: string;
      password?: string;
      ip?: string;
      cover?: string;
      disabled?: number;
    },
  ) {
    const id = Number(body?.id);
    if (!Number.isFinite(id)) {
      throw new BadRequestException('id required');
    }
    if (body.username !== undefined && !String(body.username).trim()) {
      throw new BadRequestException('username empty');
    }
    await this.accountCurd.updateUser(id, {
      ...(body.username !== undefined
        ? { username: String(body.username).trim() }
        : {}),
      password: body.password,
      ip: body.ip,
      cover: body.cover,
      disabled: body.disabled,
    });
    return { ok: true };
  }

  @UseInterceptors(ResponseInterceptor)
  @UseGuards(AuthenticatedApiGuard)
  @Post('auth/delete')
  async authDelete(@Body() body: { id: number }) {
    const id = Number(body?.id);
    if (!Number.isFinite(id)) {
      throw new BadRequestException('id required');
    }
    await this.accountCurd.delete(id);
    return { ok: true };
  }

  /** role 表分页列表，可按 uid 过滤 */
  @UseInterceptors(ResponseInterceptor)
  @UseGuards(AuthenticatedApiGuard)
  @Post('role')
  async roleList(
    @Body()
    body: {
      skip?: number;
      take?: number;
      uid?: number;
      sort?: Record<string, 'ASC' | 'DESC'>;
    },
  ) {
    return await this.roleCurd.listRoles({
      skip: body?.skip,
      take: body?.take,
      uid: body?.uid,
      sort: body?.sort,
    });
  }

  /**
   * 创建 role；若 uid+type+include 已存在则仅追加 role 片段（逗号分隔、去重）
   */
  @UseInterceptors(ResponseInterceptor)
  @UseGuards(AuthenticatedApiGuard)
  @Post('role/create')
  async roleCreate(
    @Body()
    body: {
      uid: number;
      type: string;
      include: 0 | 1;
      role: string;
      status?: 0 | 1;
      description?: string;
    },
  ) {
    const uid = Number(body?.uid);
    if (!Number.isFinite(uid)) {
      throw new BadRequestException('uid required');
    }
    if (!String(body?.type ?? '').trim()) {
      throw new BadRequestException('type required');
    }
    const inc = Number(body?.include);
    if (inc !== 0 && inc !== 1) {
      throw new BadRequestException('include must be 0 or 1');
    }
    if (body?.role === undefined || body?.role === null) {
      throw new BadRequestException('role required');
    }
    const includeFlag: 0 | 1 = inc === 0 ? 0 : 1;
    return await this.roleCurd.createOrAppendRole({
      uid,
      type: String(body.type).trim(),
      include: includeFlag,
      role: String(body.role),
      status: body.status,
      description: body.description,
    });
  }

  @UseInterceptors(ResponseInterceptor)
  @UseGuards(AuthenticatedApiGuard)
  @Post('role/update')
  async roleUpdate(
    @Body()
    body: {
      id: number;
      uid?: number;
      type?: string;
      include?: 0 | 1;
      role?: string;
      status?: 0 | 1;
      description?: string;
    },
  ) {
    const id = Number(body?.id);
    if (!Number.isFinite(id)) {
      throw new BadRequestException('id required');
    }
    if (body.uid !== undefined && !Number.isFinite(Number(body.uid))) {
      throw new BadRequestException('uid invalid');
    }
    let includePatch: 0 | 1 | undefined;
    if (body.include !== undefined) {
      const inc = Number(body.include);
      if (inc !== 0 && inc !== 1) {
        throw new BadRequestException('include must be 0 or 1');
      }
      includePatch = inc === 0 ? 0 : 1;
    }
    await this.roleCurd.updateRole(id, {
      uid: body.uid !== undefined ? Number(body.uid) : undefined,
      type: body.type !== undefined ? String(body.type).trim() : undefined,
      include: includePatch,
      role: body.role,
      status: body.status,
      description: body.description,
    });
    return { ok: true };
  }

  @UseInterceptors(ResponseInterceptor)
  @UseGuards(AuthenticatedApiGuard)
  @Post('role/delete')
  async roleDelete(@Body() body: { id: number }) {
    const id = Number(body?.id);
    if (!Number.isFinite(id)) {
      throw new BadRequestException('id required');
    }
    return await this.roleCurd.deleteRole(id);
  }
}
