import { createHash, randomBytes } from "node:crypto";

// The scoped key we hand to a customer's project. They send it to our proxy on every call;
// we look it up to find the resource/installation and meter against it. Format:
//   gai_<productId>_<random>   e.g. gai_gemini_a1b2c3...
const PREFIX_LEN = 16; // chars of the key we store in cleartext for fast lookup/display

export function issueKey(productId: string): { full: string; prefix: string; hash: string } {
  const full = `gai_${productId}_${randomBytes(24).toString("base64url")}`;
  const prefix = full.slice(0, PREFIX_LEN);
  const hash = hashKey(full);
  return { full, prefix, hash };
}

export function hashKey(full: string): string {
  return createHash("sha256").update(full).digest("hex");
}

export function keyPrefix(full: string): string {
  return full.slice(0, PREFIX_LEN);
}
