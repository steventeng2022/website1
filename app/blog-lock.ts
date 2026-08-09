import { pbkdf2, randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const SCRYPT_N = 16_384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 32;
const MAX_LEGACY_ITERATIONS = 1_000_000;

function encode(bytes: Uint8Array) {
  return Buffer.from(bytes).toString("base64url");
}

function decode(value: string) {
  return Buffer.from(value, "base64url");
}

function deriveScrypt(password: string, salt: Uint8Array) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: 32 * 1024 * 1024 }, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

function deriveLegacyPbkdf2(password: string, salt: Uint8Array, iterations: number) {
  return new Promise<Buffer>((resolve, reject) => {
    pbkdf2(password, salt, iterations, KEY_LENGTH, "sha256", (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

function equal(a: Uint8Array, b: Uint8Array) {
  const first = Buffer.from(a);
  const second = Buffer.from(b);
  return first.length === second.length && timingSafeEqual(first, second);
}

export async function hashBlogPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await deriveScrypt(password, salt);
  return `scrypt-v1$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${encode(salt)}$${encode(hash)}`;
}

export async function verifyBlogPassword(password: string, stored: string) {
  try {
    const parts = stored.split("$");
    if (parts[0] === "scrypt-v1") {
      const [, nText, rText, pText, saltText, expectedText] = parts;
      if (Number(nText) !== SCRYPT_N || Number(rText) !== SCRYPT_R || Number(pText) !== SCRYPT_P || !saltText || !expectedText) return false;
      return equal(await deriveScrypt(password, decode(saltText)), decode(expectedText));
    }

    // v20-v22 compatibility: verify existing PBKDF2 hashes through node:crypto,
    // which does not have the Workers Web Crypto 10,000-iteration ceiling.
    if (parts[0] === "pbkdf2-sha256") {
      const [, iterationsText, saltText, expectedText] = parts;
      const iterations = Number(iterationsText);
      if (!Number.isInteger(iterations) || iterations < 10_000 || iterations > MAX_LEGACY_ITERATIONS || !saltText || !expectedText) return false;
      return equal(await deriveLegacyPbkdf2(password, decode(saltText), iterations), decode(expectedText));
    }

    return false;
  } catch {
    return false;
  }
}

export async function verifyAnyBlogPassword(password: string, records: { password_hash: string }[]) {
  for (const record of records) {
    if (await verifyBlogPassword(password, record.password_hash)) return true;
  }
  return false;
}

export async function blogUnlockToken(postId: number, records: { id: number; password_hash: string }[]) {
  const version = [...records].sort((a, b) => a.id - b.id).map((record) => `${record.id}:${record.password_hash}`).join("|");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`steven-blog-unlock-v2:${postId}:${version}`));
  return encode(new Uint8Array(digest));
}

export function unlockCookieName(postId: number) {
  return `steven_blog_${postId}`;
}

export function safeBlogSlug(slug: string) {
  return /^[a-z0-9-]+$/.test(slug);
}
