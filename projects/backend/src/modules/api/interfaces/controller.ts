export type responseTokenItf = {
  access_token: string;
};

export type responseCodeItf = {
  verification?: string;
  time?: string;
  type?: string;
  code: string;
  expire?: number;
};

export type payloadItf = {
  username: string;
  id: number;
};

export type userItf = {
  username: string;
  password: string;
  ip?: string;
  cover?: string;
  disabled?: number;
};

export type menuType = 'directory' | 'route';
export type menuRequestType = {
  id?: string | number;
  title: string;
  route?: string;
  parentId?: string | number;
  type: menuType;
  description?: string;
  isSide: boolean;
};

export type tplType = {
  id?: number | string;
  primary: string;
  polymerization: string;
  sort?: number | string;
  independent_1?: string;
  independent_2?: string;
  independent_3?: string;
  independent_4?: string;
  independent_5?: string;
  relation: string;
};

type findKeyType =
  | 'primary'
  | 'sort'
  | 'independent_1'
  | 'independent_2'
  | 'independent_3'
  | 'independent_4'
  | 'independent_5';
export type findTelType = Partial<Pick<tplType, findKeyType>>;
