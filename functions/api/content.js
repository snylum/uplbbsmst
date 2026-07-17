import { requireSession, json } from "../_lib/auth.js";

const KV_KEY = "site-content";

async function readDefaultContent(request, env) {
  try {
    const url = new URL(request.url);
    const assetUrl = `${url.origin}/content.json`;
    const res = await env.ASSETS.fetch(assetUrl);
    if (res.ok) return await res.json();
  } catch (err) {
    // ignore
  }
  return {};
}

export async function onRequestGet({ request, env }) {
  if (env.CONTENT_KV) {
    const stored = await env.CONTENT_KV.get(KV_KEY, { type: "json" });
    if (stored) return json(stored);
  }
  const fallback = await readDefaultContent(request, env);
  return json(fallback);
}

export async function onRequestPut({ request, env }) {
  const session = await requireSession(request, env);
  if (!session) return json({ error: "Unauthorized." }, { status: 401 });

  if (!env.CONTENT_KV) {
    return json(
      { error: "Content storage (KV namespace CONTENT_KV) is not bound to this deployment." },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch (err) {
    return json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return json({ error: "Content must be a JSON object." }, { status: 400 });
  }

  await env.CONTENT_KV.put(KV_KEY, JSON.stringify(body));
  return json({ ok: true });
}
