// Upstash Redis REST (Vercel Marketplace의 Upstash/KV 연결 시 환경 변수가 자동으로 들어온다)
const URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export const hasRedis = Boolean(URL && TOKEN);

export async function redis(...command) {
  if (!hasRedis) throw new Error('Redis가 연결되지 않았어요.');
  const res = await fetch(URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || `redis ${res.status}`);
  return data.result;
}
