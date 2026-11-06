import { redis, hasRedis } from './_redis.js';

// 응답 원본 저장 (인터뷰 연락처 포함). PostHog에는 연락처를 보내지 않는다.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!hasRedis) return res.status(503).json({ error: 'no redis' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    if (!body.response_id || !body.answers) return res.status(400).json({ error: 'bad body' });
    const record = { ...body, received_at: new Date().toISOString() };
    await redis('RPUSH', 'divorce_1:responses', JSON.stringify(record));
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
}
