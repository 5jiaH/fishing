import BaseRequest from './request.js';

/**
 * 登录请求
 * @param {password : string, username : string} e
 * @returns
 */
export function loginRequest(e) {
  return BaseRequest.post('/api/account/login', {
    body: e,
  });
}

/**
 * 删除用户
 * @param {*} id
 * @returns
 */
export function useDelete(id) {
  return BaseRequest.post('/api/account/auth/delete', {
    body: { id },
  });
}

/**
 * 获取用户列表
 * @param {*} body
 * @returns
 */
export function useList(body) {
  return BaseRequest.post('/api/account/auth', {
    body,
  });
}

/**
 * 更新用户
 * @param {*} body
 * @returns
 */
export function useUpdate(body) {
  return BaseRequest.post('/api/account/auth/update', {
    body,
  });
}

/**
 * 创建用户
 * @param {*} body
 * @returns
 */
export function useCreate(body) {
  return BaseRequest.post('/api/account/auth/create', {
    body,
  });
}

/** 用户权限 role 表 */
export function roleList(body) {
  return BaseRequest.post('/api/account/role', { body });
}

export function roleCreate(body) {
  return BaseRequest.post('/api/account/role/create', { body });
}

export function roleUpdate(body) {
  return BaseRequest.post('/api/account/role/update', { body });
}

export function roleDelete(body) {
  return BaseRequest.post('/api/account/role/delete', { body });
}

/** 保存用户可访问的监控项目（projectName 为逗号分隔） */
export function monitorProjectSave(body) {
  return BaseRequest.post('/api/account/auth/monitor-project', { body });
}
