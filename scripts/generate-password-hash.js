#!/usr/bin/env node
/**
 * Generates ADMIN_PASSWORD_SALT and ADMIN_PASSWORD_HASH values for the
 * Cloudflare Pages environment variables used by /functions/api/login.js.
 *
 * Usage:
 *   node scripts/generate-password-hash.js "YourChosenPassword"
 *
 * Copy the printed ADMIN_PASSWORD_SALT and ADMIN_PASSWORD_HASH values into
 * your Cloudflare Pages project's Environment Variables settings.
 */
const crypto = require("crypto");

const password = process.argv[2];
if (!password) {
  console.error("Usage: node scripts/generate-password-hash.js \"YourChosenPassword\"");
  process.exit(1);
}

const salt = crypto.randomBytes(16).toString("hex");
const hash = crypto.createHash("sha256").update(salt + password).digest("hex");

console.log("Add these as Cloudflare Pages environment variables (Production and Preview):\n");
console.log("ADMIN_PASSWORD_SALT =", salt);
console.log("ADMIN_PASSWORD_HASH =", hash);
console.log("\nAlso set:");
console.log("ADMIN_EMAIL = snylumagbas@gmail.com");
console.log("JWT_SECRET  =", crypto.randomBytes(32).toString("hex"), " (or generate your own random string)");
