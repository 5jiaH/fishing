import { Column, Entity, PrimaryColumn } from 'typeorm';

/** 潮汐港口站点（SQLite） */
@Entity('tide_port')
export class TidePort {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  recordTime: string;

  @Column({ type: 'int' })
  state: number;

  @Column({ type: 'varchar', length: 32 })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  enName: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  pyName: string | null;

  @Column({ type: 'double' })
  coordX: number;

  @Column({ type: 'double' })
  coordY: number;

  @Column({ type: 'int' })
  dataType: number;

  @Column({ type: 'varchar', length: 64, comment: '关联 tide_category.id' })
  areaId: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  province: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  city: string;

  @Column({ type: 'varchar', length: 255, default: '', nullable: true })
  region: string;

  @Column({ type: 'varchar', length: 32, default: '' })
  zip: string;

  @Column({ type: 'varchar', length: 16, default: '' })
  adcode: string;
}
