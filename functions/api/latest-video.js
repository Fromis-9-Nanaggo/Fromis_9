const OFFICIAL_CHANNEL = 'https://www.youtube.com/@fromis9_official';
const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=UTF-8',
  'Cache-Control': 'public, max-age=600, s-maxage=600, stale-while-revalidate=3600'
};

const decodeXml = (value = '') => value
  .replace(/^<!\[CDATA\[|\]\]>$/g, '')
  .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&quot;/g, '"')
  .replace(/&apos;/g, "'")
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&amp;/g, '&')
  .trim();

const valueFor = (source, tag) => {
  const match = source.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? decodeXml(match[1]) : '';
};

const respond = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: status >= 500 ? { ...JSON_HEADERS, 'Cache-Control': 'no-store' } : JSON_HEADERS
});

async function getChannelId() {
  const response = await fetch(OFFICIAL_CHANNEL, {
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8'
    }
  });
  if (!response.ok) throw new Error(`YouTube channel request failed: ${response.status}`);
  const page = await response.text();
  const match = page.match(/"channelId":"(UC[\w-]{22})"/) || page.match(/youtube\.com\/channel\/(UC[\w-]{22})/);
  if (!match) throw new Error('Could not identify the official YouTube channel');
  return match[1];
}

async function getLatestVideo() {
  const channelId = await getChannelId();
  const feed = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`, {
    headers: { Accept: 'application/atom+xml,application/xml;q=0.9,*/*;q=0.8' }
  });
  if (!feed.ok) throw new Error(`YouTube feed request failed: ${feed.status}`);
  const xml = await feed.text();
  const entry = xml.match(/<entry>([\s\S]*?)<\/entry>/i)?.[1];
  if (!entry) throw new Error('The official YouTube feed is empty');
  const id = valueFor(entry, 'yt:videoId');
  if (!/^[\w-]{11}$/.test(id)) throw new Error('The latest YouTube video id is invalid');
  return {
    id,
    title: valueFor(entry, 'title').slice(0, 180),
    publishedAt: valueFor(entry, 'published'),
    url: `https://www.youtube.com/watch?v=${id}`
  };
}

export async function onRequestGet() {
  try {
    return respond(await getLatestVideo());
  } catch (error) {
    console.error('Latest YouTube video request failed', error);
    return respond({ error: 'Latest YouTube video is temporarily unavailable.' }, 503);
  }
}
