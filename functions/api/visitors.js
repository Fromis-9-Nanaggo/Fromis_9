const headers = {
  'Content-Type': 'application/json; charset=UTF-8',
  'Cache-Control': 'no-store'
};

const respond = (body, status = 200) => new Response(JSON.stringify(body), { status, headers });

async function getCounts(database) {
  const [total, today] = await Promise.all([
    database.prepare('SELECT COUNT(*) AS count FROM visitors').first(),
    database.prepare("SELECT COUNT(*) AS count FROM daily_visitors WHERE day = date('now', '+9 hours')").first()
  ]);

  return {
    total: Number(total?.count || 0),
    today: Number(today?.count || 0)
  };
}

export async function onRequestPost(context) {
  const database = context.env.LIGHTS_DB;
  if (!database) return respond({ error: 'LIGHTS_DB binding is not configured.' }, 503);

  let visitorId = '';
  try {
    ({ visitorId } = await context.request.json());
  } catch (_) {
    return respond({ error: 'Invalid request body.' }, 400);
  }

  if (typeof visitorId !== 'string' || !/^[a-f0-9-]{36}$/i.test(visitorId)) {
    return respond({ error: 'Invalid visitor ID.' }, 400);
  }

  await database.batch([
    database.prepare('INSERT OR IGNORE INTO visitors (visitor_id) VALUES (?)').bind(visitorId),
    database.prepare("INSERT OR IGNORE INTO daily_visitors (day, visitor_id) VALUES (date('now', '+9 hours'), ?)").bind(visitorId)
  ]);

  return respond(await getCounts(database));
}

export async function onRequest(context) {
  if (context.request.method === 'POST') return onRequestPost(context);
  if (context.request.method === 'GET') {
    const database = context.env.LIGHTS_DB;
    if (!database) return respond({ error: 'LIGHTS_DB binding is not configured.' }, 503);
    return respond(await getCounts(database));
  }
  return respond({ error: 'Method not allowed.' }, 405);
}
