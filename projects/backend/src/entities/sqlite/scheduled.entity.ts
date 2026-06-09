import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/** 定时任务（SQLite） */
@Entity()
export class Scheduled {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    comment: '项目名称',
  })
  name: string;

  @Column({
    comment: '执行命令',
    nullable: true,
  })
  command: string;

  @Column({
    comment: '定时表达式 (cron格式)',
    nullable: true,
  })
  cronExpression: string;

  @Column({
    comment: '是否启用',
    default: true,
  })
  enabled: boolean;

  @Column({
    comment: '任务状态 (running, stopped, error)',
    default: 'stopped',
  })
  status: string;

  @Column({
    nullable: true,
    comment: '任务描述',
  })
  description: string;

  @Column({
    comment: '创建者ID',
  })
  owner: number;

  @Column({
    comment: '最后执行时间',
    nullable: true,
  })
  lastExecuted: Date;

  @Column({
    comment: '执行次数',
    default: 0,
  })
  executionCount: number;

  @Column({
    comment: '最后更新',
    type: 'bigint',
  })
  lastUpdate: number;

  @CreateDateColumn()
  create_time: Date;

  @UpdateDateColumn()
  update_time: Date;
}
