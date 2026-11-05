import { useEffect, useState } from 'react';
import posthog from 'posthog-js';
import VariantA from './variantA/VariantA.jsx';
import VariantB, { B_READY } from './variantB/VariantB.jsx';
import { getAssignment } from './assign.js';
import { initTracking, register, track, newId, IS_TESTER, BUILD } from './tracking.js';

export default function App() {
  const [assignment, setAssignment] = useState(null);

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
          팀원 모드 · {assignment.version}
        </div>
      )}
    </>
  );
}
