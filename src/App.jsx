import { useEffect, useState } from 'react';
import posthog from 'posthog-js';
import VariantA from './variantA/VariantA.jsx';
import VariantB, { B_READY } from './variantB/VariantB.jsx';
import { getAssignment } from './assign.js';
import { initTracking, register, track, newId, IS_TESTER, BUILD } from './tracking.js';

// 팀원 모드 전용: 화면 왼쪽 위 모서리(60×60px)를 1초 안에 세 번 누르면 설문을 처음부터 다시 시작한다.
// 캡처 단계에서 듣기만 하고 막지 않으므로 그 자리의 버튼 동작은 그대로다.
function useTesterReset() {
  useEffect(() => {
    if (!IS_TESTER) return;
    let taps = [];
    const onDown = (e) => {
      if (e.clientX > 60 || e.clientY > 60) {
        taps = [];
        return;
      }
      const now = Date.now();
      taps = taps.filter((t) => now - t < 1000);
      taps.push(now);
      if (taps.length < 3) return;
      taps = [];
      if (!window.confirm('설문을 처음부터 다시 시작할까요?')) return;
      try {
        localStorage.removeItem('divorce_1_assignment');
        sessionStorage.clear();
      } catch {}
      window.scrollTo(0, 0);
      window.location.reload();
    };
    window.addEventListener('pointerdown', onDown, true);
    return () => window.removeEventListener('pointerdown', onDown, true);
  }, []);
}

export default function App() {
  const [assignment, setAssignment] = useState(null);
  useTesterReset();

  useEffect(() => {
    let alive = true;
    getAssignment().then((a) => {
      if (!alive) return;
      const sendEvents = a.version === 'A' || B_READY;
      if (sendEvents) {
        initTracking();
        const response_id = newId();
        register({
          survey_version: 'divorce_1',
          version: a.version,
          response_id,
          task_guide: 'hidden',
          assign_method: a.assign_method,
          build: BUILD,
        });
        let distinct_id = null;
        try {
          distinct_id = IS_TESTER ? 'tester' : posthog.get_distinct_id();
        } catch {}
        window.__AB__ = { response_id, distinct_id, version: a.version };
        track('ab_assigned', { is_returning: a.is_returning });
      }
      setAssignment(a);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!assignment) return <div className="min-h-screen bg-background" />;

  return (
    <>
      {assignment.version === 'A' ? <VariantA /> : <VariantB />}
      {IS_TESTER && (
        <div className="fixed bottom-1 left-1 z-[60] rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white pointer-events-none">
          팀원 모드 · {assignment.version} · 왼쪽 위 3번 탭 = 초기화
        </div>
      )}
    </>
  );
}
