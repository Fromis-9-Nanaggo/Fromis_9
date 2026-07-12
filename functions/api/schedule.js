const headers = {
  'Content-Type': 'application/json; charset=UTF-8',
  'Cache-Control': 'no-store'
};

const OFFICIAL_YOUTUBE = 'https://www.youtube.com/@fromis9_official';

const respond = (body, status = 200) => new Response(JSON.stringify(body), { status, headers });
const scheduleDatabaseError = (error) => {
  console.error('Schedule database request failed', error);
  const message = error instanceof Error ? error.message : String(error);
  if (/no such column:\s*ends_at/i.test(message)) {
    return 'Schedule database migration is required. Apply migrations/0005_schedule_end_dates.sql.';
  }
  return 'Schedule data is temporarily unavailable.';
};

const cleanItem = (item, defaultSource = 'official') => {
  if (!item || typeof item !== 'object') return null;
  const startsAt = Date.parse(item.startsAt);
  const endsAt = typeof item.endsAt === 'string' && item.endsAt.trim() ? Date.parse(item.endsAt) : null;
  if (!Number.isFinite(startsAt) || (endsAt !== null && (!Number.isFinite(endsAt) || endsAt < startsAt)) || (endsAt ?? startsAt) < Date.now()) return null;
  const url = typeof item.url === 'string' && /^https:\/\//.test(item.url) ? item.url : OFFICIAL_YOUTUBE;
  return {
    title: String(item.title || 'OFFICIAL UPDATE').replace(/\s+/g, ' ').slice(0, 120),
    startsAt: new Date(startsAt).toISOString(),
    endsAt: endsAt === null ? null : new Date(endsAt).toISOString(),
    source: String(item.source || defaultSource).toLowerCase(),
    url
  };
};

const sortItems = (items) => items
  .filter(Boolean)
  .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
  .filter((item, index, list) => index === 0 || item.startsAt !== list[index - 1].startsAt || item.endsAt !== list[index - 1].endsAt || item.title !== list[index - 1].title)
  .slice(0, 8);

const isAuthorized = (request, env) => {
  const token = env.SCHEDULE_ADMIN_TOKEN;
  return Boolean(token) && request.headers.get('Authorization') === `Bearer ${token}`;
};

async function getManualItems(database) {
  if (!database) return [];
  const now = new Date().toISOString();
  const result = await database.prepare(
    'SELECT title, starts_at, ends_at, url FROM schedules WHERE (ends_at IS NULL AND starts_at >= ?) OR ends_at >= ? ORDER BY starts_at ASC LIMIT 20'
  ).bind(now, now).all();
  return (result.results || []).map((row) => cleanItem({
    title: row.title,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    source: 'manual',
    url: row.url
  }, 'manual')).filter(Boolean);
}

async function getSchedule(context) {
  const { env } = context;
  if (!env.LIGHTS_DB) return respond({ error: 'Schedule database is not configured.' }, 503);
  try {
    const items = await getManualItems(env.LIGHTS_DB);
    return respond({ items: sortItems(items), updatedAt: new Date().toISOString(), live: false, liveSources: [] });
  } catch (error) {
    return respond({ error: scheduleDatabaseError(error) }, 503);
  }
}

async function addSchedule(context) {
  const { request, env } = context;
  if (!isAuthorized(request, env)) return respond({ error: 'Unauthorized' }, 401);
  if (!env.LIGHTS_DB) return respond({ error: 'LIGHTS_DB binding is not configured.' }, 503);
  const body = await request.json().catch(() => null);
  if (!body || typeof body.title !== 'string' || !body.title.trim() || typeof body.startsAt !== 'string' || (body.endsAt !== null && body.endsAt !== undefined && typeof body.endsAt !== 'string') || typeof body.url !== 'string' || !/^https:\/\//.test(body.url)) {
    return respond({ error: 'Title, future date, and HTTPS URL are required.' }, 400);
  }
  const item = cleanItem({ ...body, source: 'manual' }, 'manual');
  if (!item) return respond({ error: 'Title, future date, and HTTPS URL are required.' }, 400);
  const id = crypto.randomUUID();
  try {
    await env.LIGHTS_DB.prepare(
      'INSERT INTO schedules (id, title, starts_at, ends_at, url, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(id, item.title, item.startsAt, item.endsAt, item.url, new Date().toISOString()).run();
  } catch (error) {
    return respond({ error: scheduleDatabaseError(error) }, 503);
  }
  return respond({ id, item }, 201);
}

async function getAdminSchedules(context) {
  const { request, env } = context;
  if (!isAuthorized(request, env)) return respond({ error: 'Unauthorized' }, 401);
  if (!env.LIGHTS_DB) return respond({ error: 'LIGHTS_DB binding is not configured.' }, 503);
  const now = new Date().toISOString();
  try {
    const result = await env.LIGHTS_DB.prepare(
      'SELECT id, title, starts_at, ends_at, url FROM schedules WHERE (ends_at IS NULL AND starts_at >= ?) OR ends_at >= ? ORDER BY starts_at ASC LIMIT 50'
    ).bind(now, now).all();
    return respond({ items: result.results || [] });
  } catch (error) {
    return respond({ error: scheduleDatabaseError(error) }, 503);
  }
}

async function deleteSchedule(context) {
  const { request, env } = context;
  if (!isAuthorized(request, env)) return respond({ error: 'Unauthorized' }, 401);
  if (!env.LIGHTS_DB) return respond({ error: 'LIGHTS_DB binding is not configured.' }, 503);
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return respond({ error: 'Schedule id is required.' }, 400);
  await env.LIGHTS_DB.prepare('DELETE FROM schedules WHERE id = ?').bind(id).run();
  return respond({ ok: true });
}

export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (context.request.method === 'GET' && url.searchParams.has('admin')) return getAdminSchedules(context);
  if (context.request.method === 'GET') return getSchedule(context);
  if (context.request.method === 'POST') return addSchedule(context);
  if (context.request.method === 'DELETE') return deleteSchedule(context);
  return respond({ error: 'Method not allowed.' }, 405);
}
