import { requireSession, json } from "../_lib/auth.js";

const LIST_KEY = "contact-messages";
const MAX_STORED = 200;

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch (err) {
    return json({ error: "Invalid request body." }, { status: 400 });
  }

  const name = (body.name || "").toString().slice(0, 200).trim();
  const email = (body.email || "").toString().slice(0, 200).trim();
  const subject = (body.subject || "").toString().slice(0, 200).trim();
  const message = (body.message || "").toString().slice(0, 4000).trim();

  if (!name || !email || !message) {
    return json({ error: "Name, email, and message are required." }, { status: 400 });
  }
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return json({ error: "Please provide a valid email address." }, { status: 400 });
  }

  if (!env.CONTENT_KV) {
    // No storage bound — accept the request but note it could not be persisted.
    return json({ ok: true, stored: false });
  }

  const entry = {
    name,
    email,
    subject,
    message,
    receivedAt: new Date().toISOString(),
  };

  const existingRaw = await env.CONTENT_KV.get(LIST_KEY, { type: "json" });
  const existing = Array.isArray(existingRaw) ? existingRaw : [];
  existing.unshift(entry);
  const trimmed = existing.slice(0, MAX_STORED);
  await env.CONTENT_KV.put(LIST_KEY, JSON.stringify(trimmed));

  return json({ ok: true, stored: true });
}

export async function onRequestGet({ request, env }) {
  const session = await requireSession(request, env);
  if (!session) return json({ error: "Unauthorized." }, { status: 401 });
  if (!env.CONTENT_KV) return json([]);
  const existingRaw = await env.CONTENT_KV.get(LIST_KEY, { type: "json" });
  return json(Array.isArray(existingRaw) ? existingRaw : []);
}
