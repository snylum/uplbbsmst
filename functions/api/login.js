import { verifyPassword, signJWT, sessionCookieHeader, json } from "../_lib/auth.js";

const SESSION_SECONDS = 60 * 60 * 8; // 8 hours

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch (err) {
    return json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";
  const adminEmail = (env.ADMIN_EMAIL || "").trim().toLowerCase();

  if (!email || !password) {
    return json({ error: "Email and password are required." }, { status: 400 });
  }

  if (!adminEmail || email !== adminEmail) {
    // Do not reveal whether the email matched — generic error only
    return json({ error: "Invalid email or password." }, { status: 401 });
  }

  const ok = await verifyPassword(password, env.ADMIN_PASSWORD_SALT || "", env.ADMIN_PASSWORD_HASH || "");
  if (!ok) {
    return json({ error: "Invalid email or password." }, { status: 401 });
  }

  const token = await signJWT({ sub: email }, env.JWT_SECRET, SESSION_SECONDS);

  return json(
    { ok: true, email },
    { headers: { "Set-Cookie": sessionCookieHeader(token, SESSION_SECONDS) } }
  );
}
