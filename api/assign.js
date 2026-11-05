import { redis, hasRedis } from './_redis.js';

// 블록 배정: 4명 단위 블록마다 A,A,B,B를 섞은 6가지 순서 중 하나를 쓴다.
// 몇 명이 들어오든 A·B 차이는 최대 2명.
const PATTERNS = ['AABB', 'ABAB', 'ABBA', 'BAAB', 'BABA', 'BBAA'];

function hash(n) {
  // 블록 번호로 순서를 고르는 간단한 정수 해시 (예측하기 어렵게 섞기만 하면 됨)
  let x = (n + 0x9e3779b9) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
}

export function versionFor(index) {
  const block = Math.floor(index / 4);
  const pattern = PATTERNS[hash(block) % PATTERNS.length];
  return pattern[index % 4];
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!hasRedis) return res.status(503).json({ error: 'no redis' });
  try {
    // 카운터를 0부터 다시 쓰려면 ASSIGN_COUNTER_KEY를 새 값으로 바꾸면 된다.
    const key = process.env.ASSIGN_COUNTER_KEY || 'divorce_1:assign_counter';
    const index = (await redis('INCR', key)) - 1;
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ version: versionFor(index), index });
  } catch (e) {
    return res.status(503).json({ error: String(e.message || e) });
  }
}
