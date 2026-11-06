import { redis, hasRedis } from './_redis.js';

// 응답 원본 저장 (인터뷰 연락처 포함). PostHog에는 연락처를 보내지 않는다.
// 인터뷰 참여 + 개인정보 동의 + 연락처가 있으면 구글 시트에도 한 줄 추가한다(SHEET_WEBHOOK_URL이 있을 때만).
const SHEET_URL = process.env.SHEET_WEBHOOK_URL;
const SHEET_TOKEN = process.env.SHEET_WEBHOOK_TOKEN;

function interviewRow(record) {
  const a = record.answers || {};
  if (a['18-2'] !== '참여할게요' || a['18-3'] !== '동의합니다') return null;
  const contact = String(a['18-4'] || '').trim();
  if (!contact) return null;
  const times = Array.isArray(a['18-5']) ? a['18-5'].join(', ') : String(a['18-5'] || '');
  return {
    token: SHEET_TOKEN,
    received_at: record.received_at,
    version: record.version || '',
    contact,
    times,
    response_id: record.response_id,
  };
}

async function sendToSheet(row) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(SHEET_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(row),
      signal: ctrl.signal,
    });
    // Apps Script는 오류나 거절에도 200을 돌려주므로 본문으로 판단한다.
    const text = (await res.text()).trim();
    if (text === 'ok' || text === 'dup') return text;
    if (text === 'forbidden') return 'forbidden';
    return res.ok ? 'script_error' : 'http_' + res.status;
  } finally {
    clearTimeout(t);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const sheetOn = Boolean(SHEET_URL && SHEET_TOKEN);
  if (!hasRedis && !sheetOn) return res.status(503).json({ error: 'no storage' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    if (!body.response_id || !body.answers) return res.status(400).json({ error: 'bad body' });
    const record = { ...body, received_at: new Date().toISOString() };

    let saved = false;
    if (hasRedis) {
      await redis('RPUSH', 'divorce_1:responses', JSON.stringify(record));
      saved = true;
    }

    // 시트 전송이 실패해도 응답 저장은 성공으로 처리한다(원본은 Redis에 남아 있음).
    let sheet = 'skipped';
    const row = sheetOn ? interviewRow(record) : null;
    if (row) {
      try {
        sheet = await sendToSheet(row);
      } catch (e) {
        sheet = 'network_error';
      }
      // ok/dup 외에는 Vercel 로그에 남긴다 (forbidden = 비밀값 불일치, script_error = 스크립트 오류)
      if (sheet !== 'ok' && sheet !== 'dup') console.error('[sheet]', sheet, row.response_id);
      if (!saved && sheet !== 'ok' && sheet !== 'dup') return res.status(502).json({ error: 'sheet ' + sheet });
    }
    return res.status(200).json({ ok: true, sheet });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
}
