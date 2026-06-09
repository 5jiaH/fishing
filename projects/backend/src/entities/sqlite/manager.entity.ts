import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/** 后台管理员（SQLite） */
@Entity()
export class Manager {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({
    comment: '用户名',
  })
  username: string;

  @Column({
    comment: '密码',
  })
  password: string;

  @Column({
    nullable: true,
    comment: 'IP地址',
  })
  ip: string;

  @Column({
    nullable: true,
    comment: '头像',
  })
  cover: string;

  @Column({
    default: 1,
    comment: '使用状态',
  })
  disabled: number;

  @CreateDateColumn()
  create_time: Date;

  @UpdateDateColumn()
  update_time: Date;

  @Column({
    comment: '角色',
  })
  role: 'A' | 'U';
}
