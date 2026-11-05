import { IS_TESTER, FORCED_VERSION } from './tracking.js';

const KEY = 'divorce_1_assignment';

function readSaved() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (v && (v.version === 'A' || v.version === 'B')) return v;
  } catch {}
  return null;
}

function save(v) {
  try {
    localStorage.setItem(KEY, JSON.stringify(v));
  } catch {}
}

// 버전 배정
// - 팀원 모드: ?version=A/B로 고르거나 무작위. 서버 카운터는 건드리지 않는다.
// - 같은 기기가 다시 오면 처음 배정을 그대로 쓴다.
// - 처음이면 서버 블록 배정(/api/assign), 실패하면 50:50 무작위(fallback).
export async function getAssignment() {
  if (IS_TESTER) {
    const version = FORCED_VERSION === 'A' || FORCED_VERSION === 'B' ? FORCED_VERSION : Math.random() < 0.5 ? 'A' : 'B';
    return { version, assign_method: 'tester', is_returning: false };
  }
  const saved = readSaved();
  if (saved) return { ...saved, is_returning: true };

  let result;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3000);
    const res = await fetch('/api/assign', { method: 'POST', signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) throw new Error('assign ' + res.status);
    const data = await res.json();
    if (data.version !== 'A' && data.version !== 'B') throw new Error('bad version');
    result = { version: data.version, assign_method: 'block', assign_index: data.index };
  } catch {
    result = { version: Math.random() < 0.5 ? 'A' : 'B', assign_method: 'fallback' };
  }
  save(result);
  return { ...result, is_returning: false };
}
