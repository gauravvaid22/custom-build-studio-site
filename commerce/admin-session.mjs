import { createHmac, timingSafeEqual } from 'node:crypto';
const COOKIE = 'cbs_admin';
const signature = (value, key) => createHmac('sha256', key).update(value).digest('base64url');
const matches = (a, b) => typeof a === 'string' && typeof b === 'string' && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));
export function sessionCookie(key, now = Date.now(), secure = true) {
  const expires = String(Math.floor(now / 1000) + 8 * 3600);
  return `${COOKIE}=${expires}.${signature(expires, key)}; Path=/.netlify/functions/; HttpOnly; SameSite=Strict; Max-Age=28800${secure ? '; Secure' : ''}`;
}
export function clearSessionCookie() { return `${COOKIE}=; Path=/.netlify/functions/; HttpOnly; SameSite=Strict; Max-Age=0; Secure`; }
export function requestAdminKey(request, key = process.env.SHOP_ADMIN_KEY || '', now = Date.now()) {
  const bearer = (request.headers.get('authorization') || '').replace(/^Bearer /, '');
  if (bearer) return bearer;
  if (key.length < 32) return '';
  const cookie = request.headers.get('cookie')?.split(';').map(x => x.trim()).find(x => x.startsWith(COOKIE + '='))?.slice(COOKIE.length + 1) || '';
  const [expires, mac] = cookie.split('.');
  return /^\d{10}$/.test(expires || '') && Number(expires) > Math.floor(now / 1000) && Number(expires) <= Math.floor(now / 1000) + 8 * 3600 && matches(mac, signature(expires, key)) ? key : '';
}
export function requireAdmin(request) {
  if (request.method !== 'POST' || request.headers.get('origin') !== new URL(request.url).origin) throw Object.assign(new Error('Request origin not allowed.'), { status: 403 });
  const key = process.env.SHOP_ADMIN_KEY || '';
  if (key.length < 32 || !matches(requestAdminKey(request, key), key)) throw Object.assign(new Error('Please unlock the control panel.'), { status: 401 });
}
