import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { FindOneOptions, Repository, Like } from 'typeorm';

export default class BaseCURD {
  repository: Repository<any>;
  constructor(repository: Repository<any>) {
    this.repository = repository;
  }

  // 创建数据
  async create<T = unknown>(option: T) {
    return await this.repository.insert(option as QueryDeepPartialEntity<T>);
  }

  // 更新数据
  async update<T>({ id, ...option }: T & { id: string | number }) {
    return await this.repository.update(id, option);
  }

  // 删除数据
  async delete(id: string | number) {
    return await this.repository.delete({ id: parseInt(`${id}`) });
  }

  // 查找数据
  async find<T = any>(options?: GlobalItf.baseFind) {
    const { like, ...option } = options || {};
    const responseData: {
      data?: unknown;
      total?: number | string;
      count?: number | string;
    } = {};

    if (like) {
      const likeWhere = {};
      for (const l in like) {
        const item = like[l];
        if (item !== undefined && item !== null) {
          likeWhere[l] = Like(`%${item as string}%`);
        }
      }

      if (option.where) {
        option.where = Object.assign({}, option.where, likeWhere);
      } else {
        option.where = likeWhere;
      }
    }

    if (option.take) {
      responseData.total = await this.repository.count({
        where: option.where,
      });
    }

    const result: T[] = await this.repository.find(option);

    if (responseData.total !== undefined) {
      responseData.data = result;
      responseData.count = result.length;
      return responseData;
    }

    return result;
  }

  // 查找单条数据
  async findOne(id: string | number, options?: FindOneOptions<unknown>) {
    // return await this.repository.findOne(id, options);
  }
}
