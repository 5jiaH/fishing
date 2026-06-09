import { Column, Entity, PrimaryColumn } from 'typeorm';

/** 潮汐港口区域分类（SQLite） */
@Entity('tide_category')
export class TideCategory {
  @PrimaryColumn({ type: 'varchar', length: 64, comment: '区域 ID' })
  id: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  recordTime: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  areaName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  areaEnName: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  pyName: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  parentId: string | null;

  @Column({ type: 'int', nullable: true })
  levelId: number;

  @Column({ type: 'int', nullable: true })
  sortIndex: number;

  @Column({ type: 'varchar', length: 32, nullable: true })
  country: string;
}
