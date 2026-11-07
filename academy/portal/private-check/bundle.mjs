// ../../../academy-dependency-review/node_modules/@better-auth/utils/dist/password.node.mjs
import { randomBytes, scrypt } from "node:crypto";
var config = {
  N: 16384,
  r: 16,
  p: 1,
  dkLen: 64
};
function generateKey(password, salt) {
  return new Promise((resolve, reject) => {
    scrypt(password.normalize("NFKC"), salt, config.dkLen, {
      N: config.N,
      r: config.r,
      p: config.p,
      maxmem: 128 * config.N * config.r * 2
    }, (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });
}
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${(await generateKey(password, salt)).toString("hex")}`;
}
async function verifyPassword(hash, password) {
  const [salt, key] = hash.split(":");
  if (!salt || !key) throw new Error("Invalid password hash");
  return (await generateKey(password, salt)).toString("hex") === key;
}

// ../../../academy-dependency-review/node_modules/better-auth/dist/crypto/password.mjs
var hashPassword$1 = hashPassword;
var verifyPassword$1 = async ({ hash, password }) => {
  return verifyPassword(hash, password);
};

// private-check/fixture.json
var fixture_default = {
  password: "Synthetic-Academy-CPU-only-2026!",
  hash: "99d0dc831de50d927453b019967d146c:ce0c894de580e8941c4ad69864b18cfb0f0fe7a83d8821dd46e5316c8d9bb9bce3a2fc70561b361c64b6695dca4b866cb61cfb6c6b845cd23f71a7c54b2e9f32"
};

// private-check/worker.mjs
var ORIGIN = "https://irenic-academy-dev.krystal-146.workers.dev";
var headers = { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow", "Content-Security-Policy": "default-src 'none'; form-action 'self'; frame-ancestors 'none'" };
var page = (message) => new Response(`<!doctype html><title>Academy private performance check</title><h1>Academy private performance check</h1><p>${message}</p><p>Synthetic data only. No database, email, accounts, or courses.</p><form method="post" action="/hash"><button>Test one password hash</button></form><form method="post" action="/verify"><button>Test one password verification</button></form>`, { headers });
var worker_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.origin !== ORIGIN || !ctx.access) return new Response("Forbidden", { status: 403 });
    let identity;
    try {
      identity = await ctx.access.getIdentity();
    } catch {
      return new Response("Forbidden", { status: 403 });
    }
    if (identity?.email !== "krystal@irenix.org") return new Response("Forbidden", { status: 403 });
    if (request.method === "GET" && url.pathname === "/") return page("Ready. Each button performs one operation. CPU time must be read from Cloudflare logs; no browser timing is used.");
    if (request.method !== "POST" || request.headers.get("Origin") !== ORIGIN) return new Response("Forbidden", { status: 403 });
    if (!["/hash", "/verify"].includes(url.pathname)) return new Response("Not found", { status: 404 });
    const operation = url.pathname.slice(1);
    console.log(JSON.stringify({ check: "academy-scrypt-1", operation, phase: "start" }));
    try {
      const ok = operation === "hash" ? (await hashPassword$1(fixture_default.password)).includes(":") : await verifyPassword$1({ hash: fixture_default.hash, password: fixture_default.password });
      console.log(JSON.stringify({ check: "academy-scrypt-1", operation, phase: "complete", ok }));
      return page(ok ? `${operation} completed. Review Cloudflare CPU time before accepting free-plan suitability.` : `${operation} failed.`);
    } catch {
      console.log(JSON.stringify({ check: "academy-scrypt-1", operation, phase: "error" }));
      return new Response("Synthetic hashing operation failed. Review Cloudflare logs.", { status: 500, headers });
    }
  }
};
export {
  worker_default as default
};
