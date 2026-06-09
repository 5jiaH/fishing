declare namespace GlobalItf {
  // 分页类型
  export type page = {
    page?: string;
    paged?: boolean;
    size?: string;
    status?: string;
    all?: boolean;
    where?: ObjectLiteral;
  };

  type Object<V> = {
    [T: keyof any]: V;
  };
  type where = Object<any>;
  // 基础搜索类型
  export type baseFind = {
    where?: where | where[];
    order?: Object<'ASC' | 'DESC'>;
    like?: Object<unknown>;
    skip?: number;
    take?: number;
    paged?: boolean;
    select?: Record<string, boolean>;
  };

  export type responseToken = {
    access_token: string;
  };

  export type responseCode = {
    verification?: string;
    time?: string;
    type?: string;
    code: string;
    expire?: number;
  };

  export type payload = {
    username: string;
    id: number;
  };
}
