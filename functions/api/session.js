import { requireSession, json } from "../_lib/auth.js";

export async function onRequestGet({ request, env }) {
  const payload = await requireSession(request, env);
  if (!payload) return json({ authenticated: false });
  return json({ authenticated: true, email: payload.sub });
}
