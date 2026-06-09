import { Injectable } from '@nestjs/common';
// import * as qiniu from 'qiniu';
@Injectable()
export class SharedService {
  /**
   * 判断数据类型
   * @param object unknown
   * @returns Boolean
   */
  getType(object: unknown): string {
    return Object.prototype.toString.call(object).slice(8, -1).toLowerCase();
  }

  /**
   * 判断是否null或undefined
   * @param value unknown
   * @returns Boolean
   */
  nuAun(value: unknown): boolean {
    return value === null || value === undefined;
  }

  /**
   * 剔除对象里null 或 undefined 的属性
   * @param object Object
   * @returns Object
   */
  pickEmpty(object: any): object {
    if (this.getType(object) !== 'object') return {};
    const a = Object.entries(object).reduce(
      (result, item: [string, unknown]) => {
        if (!this.nuAun(item[1])) {
          result[item[0]] = item[1];
        }
        return result;
      },
      {},
    );
    return a;
  }

  /**
   * 生成随机数
   * @param size 长度
   * @param isNumber 是否是数字
   * @returns String
   */
  createRandom(size: number, isNumber = true): string {
    let tpl = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (isNumber) tpl = tpl.substring(0, 10);
    let result = '';

    for (let i = 0; i < size; i++) {
      const random = Math.round(Math.random() * 100);
      result += tpl[random % tpl.length];
    }
    return result;
  }

  /*
  qiniuToken() {
    const accessKey = process.env.QINIU_ACCESSKEY || '';
    const secretKey = process.env.QINIU_SECRETKEY || '';
    const expires = parseInt(process.env.QINIU_EXPIRE || '7200');

    const mac = new qiniu.auth.digest.Mac(accessKey, secretKey);
    const options = {
      scope: 'wu-assets',
      expires,
    };
    const putPolicy = new qiniu.rs.PutPolicy(options);
    const token = putPolicy.uploadToken(mac);

    return {
      token,
      expires,
    };
  }
  */
}
