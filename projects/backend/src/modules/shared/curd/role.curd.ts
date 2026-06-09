import BaseCURD from '../../../utils/classes/curd.service';
import { Role } from 'src/entities/sqlite/role.entity';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

/**
 * role 字段为多段字符串，逗号分隔；合并时去重（顺序：先已有，再新增）。
 */
export function mergeCommaRoleSegments(
  existing: string | null | undefined,
  append: string,
): string {
  const parse = (s: string) =>
    s
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const seg of [...parse(existing ?? ''), ...parse(append)]) {
    if (seen.has(seg)) continue;
    seen.add(seg);
    out.push(seg);
  }
  return out.join(',');
}

@Injectable()
export class RoleCurd extends BaseCURD {
  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
  ) {
    super(roleRepository);
  }

  async listRoles(params: {
    skip?: number;
    take?: number;
    uid?: number;
    sort?: Record<string, 'ASC' | 'DESC'>;
  }) {
    const skip = Math.max(0, Number(params.skip) || 0);
    const take = Math.min(100, Math.max(1, Number(params.take) || 10));
    const uid = params.uid;
    const where =
      uid != null && Number.isFinite(Number(uid)) ? { uid: Number(uid) } : {};

    const [data, total] = await this.roleRepository.findAndCount({
      where,
      order: params.sort ?? { id: 'DESC' },
      skip,
      take,
    });

    const rows = data.map((r) => ({
      id: r.id,
      uid: r.uid,
      type: r.type,
      role: r.role,
      status: r.status,
      include: r.include,
      description: r.description,
    }));

    return { data: rows, total, count: rows.length };
  }

  /** 指定用户下 status 为 的全部角色规则行 */
  async listRolesByUid(uid: number, status?: 0 | 1) {
    const data = await this.roleRepository.find({
      where: { uid, status },
      order: { id: 'ASC' },
    });
    return data.map((r) => ({
      id: r.id,
      uid,
      type: r.type,
      role: r.role,
      status: r.status,
      include: r.include,
      description: r.description,
    }));
  }

  /**
   * 若已存在相同 uid + type + include，则把 body.role 片段追加到已有 role（判重）；
   * 否则新建一行。
   */
  async createOrAppendRole(data: {
    uid: number;
    type: string;
    include: 0 | 1;
    role: string;
    status?: 0 | 1;
    description?: string;
  }): Promise<{ id: number; appended: boolean }> {
    const existing = await this.roleRepository.findOne({
      where: {
        type: data.type,
        include: data.include,
        uid: data.uid,
      },
    });

    if (existing) {
      const merged = mergeCommaRoleSegments(existing.role, data.role);
      const patch: Partial<Role> = { role: merged };
      if (data.status !== undefined) patch.status = data.status;
      if (data.description !== undefined) patch.description = data.description;
      await this.roleRepository.update(existing.id, patch);
      return { id: existing.id, appended: true };
    }

    const row = this.roleRepository.create({
      type: data.type,
      include: data.include,
      role: mergeCommaRoleSegments('', data.role),
      status: data.status ?? 1,
      description: data.description ?? '',
      uid: data.uid,
    });
    const saved = await this.roleRepository.save(row);
    return { id: saved.id, appended: false };
  }

  async updateRole(
    id: number,
    patch: Partial<{
      uid: number;
      type: string;
      role: string;
      status: 0 | 1;
      include: 0 | 1;
      description: string;
    }>,
  ) {
    const row = await this.roleRepository.findOne({
      where: { id },
    });
    if (!row) {
      throw new NotFoundException('role not found');
    }
    if (patch.type !== undefined) row.type = patch.type;
    if (patch.include !== undefined) row.include = patch.include;
    if (patch.status !== undefined) row.status = patch.status;
    if (patch.description !== undefined) row.description = patch.description;
    if (patch.role !== undefined) {
      row.role = mergeCommaRoleSegments('', patch.role);
    }
    if (patch.uid !== undefined) {
      row.uid = patch.uid;
    }
    await this.roleRepository.save(row);
    return row;
  }

  async deleteRole(id: number) {
    await this.roleRepository.delete({ id });
    return { ok: true };
  }
}
