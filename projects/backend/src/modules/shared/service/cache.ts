import { Injectable } from '@nestjs/common';
import { createCache } from 'cache-manager';
import { createKeyv } from 'cacheable';

@Injectable()
export class MemoryStorageService {
  private cache;
  constructor() {
    const memoryStore = createKeyv();
    this.cache = createCache({
      stores: [memoryStore],
    });
  }

  /**
   * 设置缓存
   * @param key 缓存键名
   * @param value 缓存值
   * @param ttl 过期时间
   * @returns Promise<void>
   */
  setValue(key: string, value: any, ttl = 0): Promise<void> {
    return new Promise((resolve, reject) => {
      this.cache.set(key, value, { ttl }, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * 获取缓存
   * @param key 缓存键名
   * @returns Promise<unknown>
   */
  async getValue(key: string): Promise<unknown> {
    return await this.cache.get(key, (error, result) => {
      return error || result;
    });
  }

  /**
   * 删除缓存
   * @param key 缓存键名
   * @returns Promise<void>
   */
  deleteValue(key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.cache.del(key, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }
}
