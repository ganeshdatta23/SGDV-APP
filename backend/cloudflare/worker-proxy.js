/**
 * SGVD-Backend reverse proxy (Cloudflare Worker).
 *
 * Purpose
 *   Give clients a STABLE URL that never changes, while the real backend origin
 *   (currently the Vercel deployment) can change at any time. If the backend URL
 *   moves you only update the ORIGIN var on this Worker — clients keep hitting
 *   the same workers.dev (or custom-domain) URL.
 *
 * Caching policy (decided with the owner)
 *   - GET /sgvd/locations and GET /sgvd/events -> edge-cached for CACHE_TTL
 *     (default 3600s = 1h), fill-based per Cloudflare PoP.
 *   - Everything else -> transparent pass-through, never cached.
 *   - Only GET + only 2xx are cached; requests with an Authorization header are
 *     never served from cache.
 *   - Edge-only: clients are told `no-store` (BROWSER_TTL=0) so the app always
 *     gets edge-fresh data and freshness stays server-controlled.
 *   - Serve-stale-on-error: if the origin is down/erroring on a cached route,
 *     the last good cached copy is served (resilience). Implemented via the
 *     Cache API: entries are retained ~24h and the 1h freshness window is
 *     enforced with an X-Edge-Stored-At stamp.
 *
 * Vars (set in wrangler.jsonc): ORIGIN, CACHE_TTL, CACHE_PATHS, BROWSER_TTL,
 * PROGRAMS_TIMEZONE.
 * Deploy: `cd cloudflare && wrangler deploy`.
 */
const DEFAULT_ORIGIN = "https://sgvd-backend-ten.vercel.app";
const DEFAULT_CACHE_PATHS = "/sgvd/locations,/sgvd/events";
const DEFAULT_PROGRAMS_TIMEZONE = "Asia/Kolkata";
const RETAIN_SECONDS = 86400; // how long the edge keeps an entry for stale fallback

function norm(p) {
  return p.length > 1 && p.endsWith("/") ? p.slice(0, -1) : p;
}

function cacheTtlFor(request, pathname, env) {
  if (request.method !== "GET") return 0; // only GET is cached
  if (request.headers.has("Authorization")) return 0; // never cache authed reads
  const ttl = parseInt((env && env.CACHE_TTL) || "3600", 10);
  const paths = ((env && env.CACHE_PATHS) || DEFAULT_CACHE_PATHS)
    .split(",").map((s) => norm(s.trim())).filter(Boolean);
  return paths.includes(norm(pathname)) ? ttl : 0;
}

function clientCacheControl(env) {
  const b = parseInt((env && env.BROWSER_TTL) || "0", 10);
  return b > 0 ? `public, max-age=${b}` : "no-store";
}

function programsDate(env, now = new Date()) {
  const timeZone = (env && env.PROGRAMS_TIMEZONE) || DEFAULT_PROGRAMS_TIMEZONE;
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  } catch (e) {
    return now.toISOString().slice(0, 10);
  }
}

function buildUpstream(request, env) {
  const origin = (env && env.ORIGIN) || DEFAULT_ORIGIN;
  const originUrl = new URL(origin);
  const incoming = new URL(request.url);
  const upstream = new URL(incoming.pathname + incoming.search, originUrl);
  const headers = new Headers(request.headers);
  headers.set("Host", originUrl.host);
  headers.set("X-Forwarded-Host", incoming.host);
  headers.set("X-Forwarded-Proto", incoming.protocol.replace(":", ""));
  return { upstream: upstream.toString(), headers };
}

async function passThrough(request, env) {
  const { upstream, headers } = buildUpstream(request, env);
  const resp = await fetch(upstream, {
    method: request.method,
    headers,
    body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
    redirect: "manual",
    cf: { cacheEverything: false },
  });
  const h = new Headers(resp.headers);
  h.set("X-Proxied-By", "cloudflare-worker-sgvd");
  return new Response(resp.body, { status: resp.status, statusText: resp.statusText, headers: h });
}

async function cachedRoute(request, env, ctx, ttl) {
  const { upstream, headers } = buildUpstream(request, env);
  const cache = caches.default;
  // Key cached endpoints without client query params. Programs also includes
  // the configured calendar date so events refresh immediately after rollover.
  const keyUrl = new URL(upstream.split("?")[0]);
  if (norm(new URL(request.url).pathname) === "/sgvd/events") {
    keyUrl.searchParams.set("programs_date", programsDate(env));
  }
  const key = new Request(keyUrl.toString(), { method: "GET" });
  const now = Date.now();
  const cc = clientCacheControl(env);
  const log = (state) => console.log(JSON.stringify({ xcache: state, key: key.url }));

  const stored = await cache.match(key);
  if (stored) {
    const ts = parseInt(stored.headers.get("X-Edge-Stored-At") || "0", 10);
    if (ts && now - ts < ttl * 1000) {
      // fresh hit — do not touch origin
      const h = new Headers(stored.headers);
      log("HIT");
      h.set("X-Cache", "HIT");
      h.set("X-Proxied-By", "cloudflare-worker-sgvd");
      h.set("Cache-Control", cc);
      return new Response(stored.body, { status: stored.status, headers: h });
    }
  }

  // miss or stale -> hit origin
  let resp = null;
  try {
    resp = await fetch(upstream, { method: "GET", headers, redirect: "manual" });
  } catch (e) {
    resp = null;
  }

  if (resp && resp.status >= 200 && resp.status < 300) {
    const buf = await resp.arrayBuffer();
    // store a retained copy (we manage the 1h freshness via the stamp)
    const sh = new Headers(resp.headers);
    sh.set("Cache-Control", `public, max-age=${RETAIN_SECONDS}`);
    sh.set("X-Edge-Stored-At", String(now));
    sh.delete("set-cookie");
    ctx.waitUntil(cache.put(key, new Response(buf, { status: resp.status, headers: sh })));
    // serve fresh to client (edge-only)
    const ch = new Headers(resp.headers);
    log(stored ? "REVALIDATED" : "MISS");
    ch.set("X-Cache", stored ? "REVALIDATED" : "MISS");
    ch.set("X-Proxied-By", "cloudflare-worker-sgvd");
    ch.set("Cache-Control", cc);
    return new Response(buf, { status: resp.status, headers: ch });
  }

  // origin failed or non-2xx -> serve stale if we have anything
  if (stored) {
    const h = new Headers(stored.headers);
    log("STALE");
    h.set("X-Cache", "STALE");
    h.set("X-Proxied-By", "cloudflare-worker-sgvd");
    h.set("Cache-Control", cc);
    return new Response(stored.body, { status: stored.status, headers: h });
  }
  if (resp) return resp; // nothing cached: surface origin's non-2xx
  return new Response("Bad Gateway: origin unreachable and no cached copy", { status: 502 });
}

export default {
  async fetch(request, env, ctx) {
    const pathname = new URL(request.url).pathname;
    const ttl = cacheTtlFor(request, pathname, env);
    return ttl > 0 ? cachedRoute(request, env, ctx, ttl) : passThrough(request, env);
  },
};
