import { HttpClient } from "./base";

const client = new HttpClient();

/**
 * GET /api/auth/verificationCode?key=&type=login|register
 * @see api.json「获取验证码」
 */
export async function getVerificationCode(
  key: string,
  type: ApiItf.VerificationType,
): Promise<string> {
  const { data } = await client.request<ApiItf.verification>({
    path: "/api/auth/verificationCode",
    method: "GET",
    data: { key, type },
    responseType: "text",
  });

  return data.code;
}

/** POST /api/auth/login，body: application/x-www-form-urlencoded */
export function login(body: ApiItf.LoginBody) {
  return client.request<ApiItf.login>({
    path: "/api/auth/login",
    method: "POST",
    data: { ...body },
  });
}

/** POST /v1/auth/register，body: application/x-www-form-urlencoded */
export function register(body: ApiItf.RegisterBody) {
  return client.request<Record<string, unknown>>({
    path: "/v1/auth/register",
    method: "POST",
    data: { ...body },
  });
}

export function pickToken(res: Record<string, unknown>): string | undefined {
  const data = res.data;
  if (typeof res.access_token === "string") return res.access_token;
  if (typeof res.token === "string") return res.token;
  if (data && typeof data === "object" && data !== null) {
    const d = data as Record<string, unknown>;
    if (typeof d.token === "string") return d.token;
    if (typeof d.access_token === "string") return d.access_token;
  }
  return undefined;
}
