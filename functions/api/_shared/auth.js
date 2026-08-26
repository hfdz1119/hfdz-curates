import { json } from "./catalog.js";

const encoder = new TextEncoder();
const SESSION_MAX_AGE = 60 * 60 * 12;

function base64url(bytes) { return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", ""); }
function decodeBase64url(value) { return Uint8Array.from(atob(value.replaceAll("-", "+").replaceAll("_", "/")), (char) => char.charCodeAt(0)); }
async function digest(value) { return new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value))); }
function equal(a, b) { if (a.length !== b.length) return false; let difference = 0; for (let i = 0; i < a.length; i += 1) difference |= a[i] ^ b[i]; return difference === 0; }
async function sign(value, secret) { const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]); return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value))); }
function cookie(request, name) { return request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1); }

export async function passwordMatches(value, secret) { return Boolean(secret && value) && equal(await digest(value), await digest(secret)); }
export async function createSession(secret) { const payload = base64url(encoder.encode(JSON.stringify({ v: 1, exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE }))); return `${payload}.${base64url(await sign(payload, secret))}`; }
export async function authenticated(request, env) {
  const token = cookie(request, "hfdz_manage_session"); const secret = env.HFDZ_NAVIGATION_ADMIN_PASSWORD;
  if (!token || !secret) return false;
  try {
    const [payload, signature] = token.split(".");
    if (!payload || !signature || !equal(decodeBase64url(signature), await sign(payload, secret))) return false;
    return JSON.parse(new TextDecoder().decode(decodeBase64url(payload))).exp > Math.floor(Date.now() / 1000);
  } catch { return false; }
}
export function sessionCookie(token) { return `hfdz_manage_session=${token}; Path=/api/admin; Max-Age=${SESSION_MAX_AGE}; HttpOnly; Secure; SameSite=Strict`; }
export function clearSessionCookie() { return "hfdz_manage_session=; Path=/api/admin; Max-Age=0; HttpOnly; Secure; SameSite=Strict"; }
export async function requireAuth(context) { if (await authenticated(context.request, context.env)) return true; return json({ error: "请先登录管理入口。" }, 401); }
