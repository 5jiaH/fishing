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

export function baseRequest(baseUrl: string = '', baseInit: RequestInit = {}) {
  return (url: string, init?: RequestInit) => {
    return fetch(baseUrl + url, deepMerge(baseInit, init)).then((res) =>
      res.json(),
    );
  };
}
