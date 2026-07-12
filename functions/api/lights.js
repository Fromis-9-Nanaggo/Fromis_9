const headers = {
  'Content-Type': 'application/json; charset=UTF-8',
  'Cache-Control': 'no-store'
};

const respond = (body, status = 200) => new Response(JSON.stringify(body), { status, headers });

async function getCounts(database) {
  const [total, today] = await Promise.all([
    database.prepare('SELECT count FROM lights WHERE id = 1').first(),
    database.prepare("SELECT count FROM daily_lights WHERE day = date('now', '+9 hours')").first()
  ]);
  return {
    count: Number(total?.count || 0),
    today: Number(today?.count || 0)
  };
}

export async function onRequest(context) {
  const database = context.env.LIGHTS_DB;
  if (!database) {
    return respond({ error: 'LIGHTS_DB binding is not configured.' }, 503);
  }

  if (context.request.method === 'GET') {
    return respond(await getCounts(database));
  }

  if (context.request.method === 'POST') {
    await database.batch([
      database.prepare('INSERT INTO lights (id, count) VALUES (1, 1) ON CONFLICT(id) DO UPDATE SET count = lights.count + 1'),
      database.prepare("INSERT INTO daily_lights (day, count) VALUES (date('now', '+9 hours'), 1) ON CONFLICT(day) DO UPDATE SET count = daily_lights.count + 1")
    ]);
    return respond(await getCounts(database));
  }

  return respond({ error: 'Method not allowed.' }, 405);
}
