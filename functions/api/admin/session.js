import { authenticated, clearSessionCookie, createSession, passwordMatches, sessionCookie } from "../_shared/auth.js";
import { json } from "../_shared/catalog.js";
export async function onRequestGet(context) { return json({ authenticated: await authenticated(context.request, context.env) }); }
export async function onRequestPost({ request, env }) { const body = await request.json().catch(() => ({})); if (!await passwordMatches(body.password, env.HFDZ_NAVIGATION_ADMIN_PASSWORD)) return json({ error: "密码不正确。" }, 401); return json({ authenticated: true }, 200, { "set-cookie": sessionCookie(await createSession(env.HFDZ_NAVIGATION_ADMIN_PASSWORD)) }); }
export async function onRequestDelete() { return json({ authenticated: false }, 200, { "set-cookie": clearSessionCookie() }); }
