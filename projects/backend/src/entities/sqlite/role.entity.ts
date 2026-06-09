import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

/** 用户角色规则（SQLite；uid 对应 MySQL user.id） */
@Entity()
export class Role {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ comment: '用户 ID（MySQL user 表）' })
  uid: number;

  @Column({
    comment: '类型',
  })
  type: string;

  @Column({
    comment: '规则',
  })
  role: string;

  @Column({
    comment: '状态',
  })
  status: 0 | 1;

  @Column({
    comment: '包含/排除',
  })
  include: 0 | 1;

  @Column({
    comment: '描述',
  })
  description: string;
}
