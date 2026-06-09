import Taro from "@tarojs/taro";

/** 与 api.json 中 localhost 环境一致 */
export const API_BASE_URL = "http://localhost:5001";
/** 登录 token 的本地存储键（Taro 存储，小程序/H5 均可用） */
export const AUTH_TOKEN_STORAGE_KEY = "token";

function readStoredAuthToken(): string | undefined {
  try {
    const raw = Taro.getStorageSync(AUTH_TOKEN_STORAGE_KEY) as unknown;
    if (typeof raw !== "string") return undefined;
    const t = raw
      .trim()
      .replace(/^Bearer\s+/i, "")
      .trim();
    return t || undefined;
  } catch {
    return undefined;
  }
}

export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly body: unknown,
  ) {
    super(`HTTP ${statusCode}`);
    this.name = "HttpError";
  }
}

function encodeForm(
  body: Record<string, string | number | boolean | undefined>,
): string {
  return Object.entries(body)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(
      ([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`,
    )
    .join("&");
}

/**
 * HTTP 请求基类，统一域名与错误处理。
 */
export class HttpClient {
  constructor(protected readonly baseURL: string = API_BASE_URL) {}
  protected normalizePath(path: string): string {
    const base = this.baseURL.replace(/\/$/, "");
    const p = path.startsWith("/") ? path : `/${path}`;
    return `${base}${p}`;
  }

  async request<T = unknown>(options: ApiItf.BaseRequestOptions): Promise<{success : boolean, data: T}> {
    const method = options.method ?? "GET";
    const headers: Record<string, string> = { ...options.headers };

    const hasAuthHeader =
      "Authorization" in headers || "authorization" in headers;
    if (!hasAuthHeader) {
      const token = readStoredAuthToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    let reqData:
      | string
      | Record<string, string | number | boolean | undefined>
      | undefined = options.data as
      | Record<string, string | number | boolean | undefined>
      | undefined;

    let url = this.normalizePath(options.path);

    /* GET：Taro/H5 部分环境下不会把 object data 拼成 query，统一拼到 URL */
    if (
      method === "GET" &&
      reqData &&
      typeof reqData === "object" &&
      !Array.isArray(reqData)
    ) {
      const q = encodeForm(
        reqData as Record<string, string | number | boolean | undefined>,
      );
      if (q) {
        url += (url.includes("?") ? "&" : "?") + q;
      }
      reqData = undefined;
    }

    if (method !== "GET" && options.data) {
      if (options.jsonBody) {
        headers["Content-Type"] = "application/json;charset=UTF-8";
        reqData = JSON.stringify(options.data) as unknown as string;
      } else {
        headers["Content-Type"] = "application/x-www-form-urlencoded";
        reqData = encodeForm(
          options.data as Record<string, string | number | boolean | undefined>,
        );
      }
    }

    const res = await Taro.request<ApiItf.response<T>>({
      url: url,
      method,
      data: reqData,
      header: headers,
      enableCookie: true,
      ...(options.responseType ? { responseType: options.responseType } : {}),
    });

    if (!res.data?.success) {
      throw new HttpError(res.statusCode, res.data);
    }
    return res.data as {success : boolean, data: T};
  }
}
