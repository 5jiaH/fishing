/**
 * 远程拉取 .jsx 文本，用 @babel/standalone 转译后在浏览器里得到 React 组件函数。
 *
 * 要求（layout 已引入 babel.min.js，且存在全局 React / ReactDOM / antd / dayjs）：
 * - 远端文件必须是纯 JSX/JS，不能使用 import（浏览器无法按模块解析依赖）。
 * - 必须 `export default` 一个组件（函数、箭头函数或 class）。
 *
 * 安全：等价于执行远程脚本，仅加载你方可信 URL。
 */

const remoteJsxCache = new Map();

/**
 * 把 `export default …` 改成可放进单个 script 片段的形式，并得到变量 __remoteJsxDefault。
 * 允许文件前有注释；不支持 export default 之前的 import。
 * @param {string} source
 */
function prepareExportDefault(source) {
  const idx = source.search(/\bexport\s+default\b/);
  if (idx === -1) {
    throw new Error('[loadJsx] 远端源码须包含 export default 组件');
  }

  const head = source.slice(0, idx);
  const afterExport = source.slice(idx).replace(/^\s*export\s+default\s+/, '');

  const namedFn = /^function\s+(\w+)\b/.exec(afterExport.trimStart());
  if (namedFn) {
    const name = namedFn[1];
    return `${head}${afterExport}\n;var __remoteJsxDefault=${name};`;
  }

  if (/^function\s*\(/.test(afterExport.trimStart())) {
    return `${head}var __remoteJsxDefault=${afterExport.trim()};`;
  }

  const namedClass = /^class\s+(\w+)\b/.exec(afterExport.trimStart());
  if (namedClass) {
    const name = namedClass[1];
    return `${head}${afterExport}\n;var __remoteJsxDefault=${name};`;
  }

  if (/^class\s*\{/.test(afterExport.trimStart())) {
    return `${head}var __remoteJsxDefault=${afterExport.trim()};`;
  }

  return `${head}var __remoteJsxDefault=${afterExport.trim()};`;
}

/**
 * @param {string} url - 完整 URL 或站点内路径，如 /account/auth/usermodal.jsx
 * @param {object} [options]
 * @param {boolean} [options.bustCache=false]
 * @param {Record<string, unknown>} [options.deps] - 额外注入到运行时的全局名（与 React 等合并）
 * @param {object} [options.babel] - 传给 Babel.transform 的额外选项
 * @param {typeof fetch} [options.fetch] - 自定义 fetch（测试用）
 * @param {RequestInit} [options.fetchInit] - 合并进 fetch 的第二个参数
 * @returns {Promise<React.ComponentType>}
 */
export async function loadJsx(url, options = {}) {
  const {
    bustCache = false,
    deps = {},
    babel: babelExtra = {},
    fetch: fetchFn = fetch,
    fetchInit = {},
  } = options;

  const BabelRef = globalThis.Babel;
  if (!BabelRef || typeof BabelRef.transform !== 'function') {
    throw new Error(
      '[loadJsx] 需要先在页面加载 @babel/standalone（global Babel）',
    );
  }

  const cacheKey = url;
  if (!bustCache && remoteJsxCache.has(cacheKey)) {
    return remoteJsxCache.get(cacheKey).then((Comp) => ({
      default: Comp,
    }));
  }

  const promise = (async () => {
    const res = await fetchFn(url, {
      credentials: 'same-origin',
      ...fetchInit,
    });
    if (!res.ok) {
      throw new Error(`[loadJsx] 请求失败 ${res.status}: ${url}`);
    }
    const raw = await res.text();
    const prepared = prepareExportDefault(raw);

    const { code } = BabelRef.transform(prepared, {
      presets: ['react'],
      filename: 'remote.jsx',
      ...babelExtra,
    });

    const scope = {
      React: globalThis.React,
      ReactDOM: globalThis.ReactDOM,
      antd: globalThis.antd,
      dayjs: globalThis.dayjs,
      ...deps,
    };

    const keys = Object.keys(scope);
    const values = Object.values(scope);
    const runner = new Function(
      ...keys,
      `"use strict";\n${code}\nreturn __remoteJsxDefault;`,
    );
    const Comp = runner(...values);

    if (typeof Comp !== 'function') {
      throw new Error('[loadJsx] export default 必须是函数或 class 组件');
    }
    return Comp;
  })().catch((err) => {
    remoteJsxCache.delete(cacheKey);
    throw err;
  });

  if (!bustCache) {
    remoteJsxCache.set(cacheKey, promise);
  }

  return promise.then((Comp) => ({
    default: Comp,
  }));
}

export function clearRemoteJsxCache(url) {
  if (url == null) {
    remoteJsxCache.clear();
    return;
  }
  remoteJsxCache.delete(url);
}

if (typeof globalThis !== 'undefined') {
  globalThis.loadJsx = loadJsx;
  globalThis.clearRemoteJsxCache = clearRemoteJsxCache;
}
