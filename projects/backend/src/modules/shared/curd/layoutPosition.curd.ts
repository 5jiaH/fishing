import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { LayoutPosition } from 'src/entities/sqlite/layoutPosition.entity';
import BaseCURD from 'src/utils/classes/curd.service';

export type LayoutUpsertDto = {
  key: string;
  left: number;
  top: number;
  width: number;
  height: number;
  zIndex: number;
};

@Injectable()
export class LayoutPositionCurd extends BaseCURD {
  constructor(
    @InjectRepository(LayoutPosition)
    private readonly repo: Repository<LayoutPosition>,
  ) {
    super(repo);
  }

  async listByUserIdAndKeyPrefix(
    userId: number,
    prefix: string,
  ): Promise<LayoutPosition[]> {
    return this.repo.find({
      where: { userId, key: Like(`${prefix}%`) },
      order: { id: 'ASC' },
    });
  }

  async upsertForUser(
    userId: number,
    dto: LayoutUpsertDto,
  ): Promise<LayoutPosition> {
    const { key, left, top, width, height, zIndex } = dto;
    const existing = await this.repo.findOne({
      where: { userId, key },
    });
    if (existing) {
      await this.repo.update(existing.id, {
        left,
        top,
        width,
        height,
        zIndex,
      });
      const updated = await this.repo.findOne({ where: { id: existing.id } });
      if (!updated) {
        throw new Error('LayoutPosition update row missing');
      }
      return updated;
    }
    const row = this.repo.create({
      userId,
      key,
      left,
      top,
      width,
      height,
      zIndex,
    });
    return this.repo.save(row);
  }
}
