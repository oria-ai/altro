// Admin auth — password + TOTP 2FA (authenticator app) with recovery codes and
// short-lived signed sessions.
//
// Flow: POST /api/admin {action:"login", password, code?} verifies the password
// and, if 2FA is enrolled, a TOTP (or recovery) code, then returns a signed
// session token. Every other admin action requires that token in the
// `x-admin-token` header — the raw password is never sent again, and once 2FA is
// enrolled the password alone can't reach the data.
//
// The TOTP secret + hashed recovery codes live in R2 (config/admin-2fa.json),
// read back through the authenticated R2 API. Sessions are stateless: an HMAC
// over an expiry, keyed by SESSION_SECRET (falls back to a hash of
// ADMIN_PASSWORD so it works with zero extra config).

const crypto = require("crypto");
const { authenticator } = require("otplib");
const { r2getJson, r2put } = require("./_storage.js");

authenticator.options = { window: 1 }; // tolerate ±1 step (30s) of clock drift

const CONFIG_KEY = "config/admin-2fa.json";
const ISSUER = "Stones Admin";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12h

// ---- config (R2) ----
async function loadAuthConfig() {
  const c = await r2getJson(CONFIG_KEY).catch(() => null);
  return c || { secret: null, recoveryHashes: [], enrolledAt: null };
}
async function saveAuthConfig(cfg) {
  await r2put(CONFIG_KEY, Buffer.from(JSON.stringify(cfg)), "application/json");
  return cfg;
}
const isEnrolled = (cfg) => !!(cfg && cfg.secret);

// ---- sessions (stateless HMAC) ----
const b64url = (buf) => Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
function sessionKey() {
  return process.env.SESSION_SECRET || crypto.createHash("sha256").update("stones-sess:" + (process.env.ADMIN_PASSWORD || "")).digest("hex");
}
function createSession(ttlMs = SESSION_TTL_MS) {
  const payload = b64url(JSON.stringify({ exp: Date.now() + ttlMs }));
  const sig = b64url(crypto.createHmac("sha256", sessionKey()).update(payload).digest());
  return payload + "." + sig;
}
function verifySession(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return false;
  const [payload, sig] = token.split(".");
  const expected = b64url(crypto.createHmac("sha256", sessionKey()).update(payload).digest());
  const a = Buffer.from(sig || ""), b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString());
    return typeof exp === "number" && exp > Date.now();
  } catch { return false; }
}
const requireSession = (req) => verifySession(req.headers["x-admin-token"]);

// ---- password ----
function passwordOk(pw) {
  const real = process.env.ADMIN_PASSWORD || "";
  if (!real || typeof pw !== "string") return false;
  const a = Buffer.from(pw), b = Buffer.from(real);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ---- recovery codes ----
const hashCode = (code) => crypto.createHash("sha256").update(String(code).trim().toLowerCase()).digest("hex");
function newRecoveryCodes(n = 10) {
  return Array.from({ length: n }, () => {
    const h = crypto.randomBytes(5).toString("hex"); // 10 hex chars
    return h.slice(0, 5) + "-" + h.slice(5); // xxxxx-xxxxx
  });
}

// ---- TOTP ----
const newSecret = () => authenticator.generateSecret();
const otpauthUri = (secret) => authenticator.keyuri("admin", ISSUER, secret);
function totpOk(secret, code) {
  if (!secret || !code) return false;
  try { return authenticator.verify({ token: String(code).replace(/\s/g, ""), secret }); }
  catch { return false; }
}

// Verify a second factor against the saved config: TOTP first, else a recovery
// code (which is consumed). Returns { ok, consumedRecovery }.
async function verifySecondFactor(cfg, code) {
  if (totpOk(cfg.secret, code)) return { ok: true, consumedRecovery: false };
  const h = hashCode(code);
  const idx = (cfg.recoveryHashes || []).indexOf(h);
  if (idx >= 0) {
    cfg.recoveryHashes.splice(idx, 1);
    await saveAuthConfig(cfg);
    return { ok: true, consumedRecovery: true };
  }
  return { ok: false, consumedRecovery: false };
}

module.exports = {
  loadAuthConfig, saveAuthConfig, isEnrolled,
  createSession, verifySession, requireSession, passwordOk,
  newSecret, otpauthUri, totpOk, verifySecondFactor,
  newRecoveryCodes, hashCode,
};
