const ITERATIONS = 120_000;

function encode(bytes: Uint8Array) {
  let value = "";
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decode(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function derive(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
  return new Uint8Array(bits);
}

function equal(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a[index] ^ b[index];
  return difference === 0;
}

export async function hashBlogPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2-sha256$${ITERATIONS}$${encode(salt)}$${encode(await derive(password, salt, ITERATIONS))}`;
}

export async function verifyBlogPassword(password: string, stored: string) {
  const [algorithm, iterationsText, saltText, expectedText] = stored.split("$");
  const iterations = Number(iterationsText);
  if (algorithm !== "pbkdf2-sha256" || !Number.isInteger(iterations) || iterations < 100_000 || !saltText || !expectedText) return false;
  try {
    return equal(await derive(password, decode(saltText), iterations), decode(expectedText));
  } catch {
    return false;
  }
}

export async function blogUnlockToken(postId: number, passwordHash: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`steven-blog-unlock-v1:${postId}:${passwordHash}`));
  return encode(new Uint8Array(digest));
}

export function unlockCookieName(postId: number) {
  return `steven_blog_${postId}`;
}

export function safeBlogSlug(slug: string) {
  return /^[a-z0-9-]+$/.test(slug);
}
