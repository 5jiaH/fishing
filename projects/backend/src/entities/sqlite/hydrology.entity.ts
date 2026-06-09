import { Entity, Column, PrimaryColumn } from 'typeorm';

/** 水文站（SQLite） */
@Entity()
export class Hydrology {
  @PrimaryColumn({
    comment: '水文站编码',
  })
  stcd: string;

  @Column({
    comment: '水文站名',
  })
  stnm: string;

  @Column({
    comment: '类型',
  })
  sttp: string;

  @Column({
    comment: '区',
  })
  areaName: string;

  @Column({
    comment: '城市',
  })
  cityName: string;

  @Column({
    comment: '图片',
    nullable: true,
  })
  img: string;

  @Column({
    comment: '水文站类型',
  })
  sttpName: string;

  @Column({
    comment: '经度',
  })
  lng: string;

  @Column({
    comment: '纬度',
  })
  lat: string;
}
