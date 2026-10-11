import { getStore } from '@netlify/blobs';
import { equal } from '../../commerce/core.mjs';
import { requestAdminKey, sessionCookie, clearSessionCookie } from '../../commerce/admin-session.mjs';
export default async (request) => {
  const key = process.env.SHOP_ADMIN_KEY || '';
  const reply = (body, status = 200, cookie) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...(cookie ? { 'Set-Cookie': cookie } : {}) } });
  if (request.method === 'GET') return reply({ authenticated: key.length >= 32 && equal(requestAdminKey(request, key), key) });
  if (request.method !== 'POST' || request.headers.get('origin') !== new URL(request.url).origin) return reply({ error: 'Request origin not allowed.' }, 403);
  if (new URL(request.url).searchParams.get('action') === 'logout') return reply({ authenticated: false }, 200, clearSessionCookie());
  const store = getStore({ name: 'shop-admin-login-v1', consistency: 'strong' });
  const ip = request.headers.get('x-nf-client-connection-ip') || 'local';
  const rateKey = `attempts/${encodeURIComponent(ip)}/${Math.floor(Date.now() / 900000)}`;
  const found = await store.getWithMetadata(rateKey, { type: 'json' });
  if ((found?.data?.count || 0) >= 10) return reply({ error: 'Too many sign-in attempts. Try again in 15 minutes.' }, 429);
  try { await store.setJSON(rateKey, { count: (found?.data?.count || 0) + 1 }, found ? { onlyIfMatch: found.etag } : { onlyIfNew: true }); } catch { return reply({ error: 'Please try signing in again.' }, 429); }
  const raw = await request.text();
  if (raw.length > 512) return reply({ error: 'Invalid sign-in.' }, 400);
  let body; try { body = JSON.parse(raw); } catch { return reply({ error: 'Invalid sign-in.' }, 400); }
  if (key.length < 32 || !equal(body.key || '', key)) return reply({ error: 'Administrator key is incorrect.' }, 401);
  return reply({ authenticated: true }, 200, sessionCookie(key, Date.now(), new URL(request.url).protocol === 'https:'));
};
