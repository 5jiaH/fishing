function deepMerge(target, source) {
  const result = { ...target };
  for (const key in source) {
    if (source[key] instanceof Object && key in target) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

class BaseRequest {
  request;
  constructor(baseInput, baseInit) {
    this.request = this.init(baseInput, baseInit);
  }

  static core(input, init = {}) {
    const params = JSON.parse(JSON.stringify(init));
    if (params.body) {
      params.body = JSON.stringify(params.body);
    }

    return fetch(input, params).then((res) => {
      if (res.status === 401) {
        location.href = '/web/index/empty';
        throw Error('401');
      }

      return res.json();
    });
  }

  init(baseInput, baseInit) {
    return (input, init) => {
      const url = `${baseInput || ''}${input}`;
      const params = deepMerge({ ...init, credentials: 'include' }, baseInit);
      return BaseRequest.core(url, deepMerge(init, params));
    };
  }

  get() {
    return BaseRequest.get(...arguments);
  }

  post() {
    return BaseRequest.post(...arguments);
  }

  static get(input, init) {
    return BaseRequest.core(input, init);
  }

  static post(input, init) {
    return BaseRequest.core(
      input,
      deepMerge(init || {}, {
        method: 'post',
        headers: { 'Content-type': 'application/json' },
      }),
    );
  }
}

class BaseRequest2 {
  request;
  constructor(baseInput, baseInit) {
    this.request = this.init(baseInput, baseInit);
  }

  deepMerge(target, source) {
    const result = { ...target };
    for (const key in source) {
      if (source[key] instanceof Object && key in target) {
        result[key] = this.deepMerge(target[key], source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }

  core(input, init = {}) {
    const params = JSON.parse(JSON.stringify(init));
    if (params.body) {
      params.body = JSON.stringify(params.body);
    }

    return fetch(input, params).then((res) => {
      if (res.status === 401) {
        location.href = '/web/index/empty';
        throw Error('401');
      }

      return res.json();
    });
  }

  init(baseInput, baseInit) {
    return (input, init) => {
      const url = `${baseInput || ''}${input}`;
      const params = this.deepMerge(
        { ...init, credentials: 'include' },
        baseInit,
      );
      return BaseRequest.core(url, this.deepMerge(init, params));
    };
  }

  get(input, init) {
    return BaseRequest.core(input, init);
  }

  post(input, init) {
    return BaseRequest.core(
      input,
      this.deepMerge(init || {}, {
        method: 'post',
        headers: { 'Content-type': 'application/json' },
      }),
    );
  }
}

export default new BaseRequest2();
