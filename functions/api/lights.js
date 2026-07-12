const headers = {
  'Content-Type': 'application/json; charset=UTF-8',
  'Cache-Control': 'no-store'
};

const respond = (body, status = 200) => new Response(JSON.stringify(body), { status, headers });

export async function onRequest(context) {
  const database = context.env.LIGHTS_DB;
  if (!database) {
    return respond({ error: 'LIGHTS_DB binding is not configured.' }, 503);
  }

  if (context.request.method === 'GET') {
    const row = await database.prepare('SELECT count FROM lights WHERE id = 1').first();
    return respond({ count: Number(row?.count || 0) });
  }

  if (context.request.method === 'POST') {
    const row = await database
      .prepare('INSERT INTO lights (id, count) VALUES (1, 1) ON CONFLICT(id) DO UPDATE SET count = lights.count + 1 RETURNING count')
      .first();
    return respond({ count: Number(row?.count || 0) });
  }

  return respond({ error: 'Method not allowed.' }, 405);
}
