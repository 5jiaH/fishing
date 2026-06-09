import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

/** 用户布局坐标（SQLite；userId 对应 MySQL user.id） */
@Entity()
@Index(['userId', 'key'], { unique: true })
export class LayoutPosition {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({})
  key: string;

  @Column({ comment: '用户 ID（MySQL user 表）' })
  userId: number;

  @Column({})
  left: number;

  @Column({})
  top: number;

  @Column({})
  width: number;

  @Column({})
  height: number;

  @Column({})
  zIndex: number;
}
