import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import survey from '../survey.json';
import { Field } from './fields.jsx';
import { ChevronIcon, ToastErrorIcon } from './icons.jsx';
import { track, trackBeacon, IS_TESTER } from '../tracking.js';

const PAGES = survey.pages;
const LAST = PAGES.length - 1;
const MAIN_LAST = 4; // 1~16번이 끝나는 페이지 (0: 인트로)
const BRANCHES = survey.branches;

// ---------- 검사 ----------
const MSG = {
  choice: '최소 1개 옵션을 선택해주세요.',
  fill: '이 문항을 채워주세요.',
  min: '최소 선택 항목을 충족하지 않습니다.',
  max: '최대 선택 항목을 초과했습니다.',
  exact: (n) => `선택한 항목의 개수는 ${n}개여야 합니다.`,
};

function isEmpty(field, v) {
  if (field.type === 'CHECKBOX') return !v || v.length === 0;
  if (field.type === 'LINEAR') return v === undefined || v === null;
  return v === undefined || v === null || v === '';
}

// full: 다음을 누른 뒤의 검사 / live: 다음을 누르기 전 (최대 개수 초과만 바로 보임)
function validate(field, v, full) {
  if (field.type === 'DESCRIPTION') return null;
  if (field.type === 'CHECKBOX' && v && v.length) {
    const n = v.length;
    // 최대(또는 정확한 개수)를 넘기면 다음을 누르기 전에도 바로 보인다 (왈라 동작)
    if (field.max !== undefined && n > field.max) return { kind: 'max', msg: MSG.max };
    if (field.exact !== undefined && n > field.exact) return { kind: 'max', msg: MSG.exact(field.exact) };
    if (!full) return null;
    if (field.min !== undefined && n < field.min) return { kind: 'min', msg: MSG.min };
    if (field.exact !== undefined && n !== field.exact) return { kind: n < field.exact ? 'min' : 'max', msg: MSG.exact(field.exact) };
    return null;
  }
  if (!full) return null;
  if (field.required && isEmpty(field, v)) {
    const choice = field.type === 'RADIO' || field.type === 'CHECKBOX' || field.type === 'LINEAR';
    return { kind: 'required', msg: choice ? MSG.choice : MSG.fill };
  }
  return null;
}

function limitOf(field) {
  if (field.exact !== undefined) return field.exact;
  if (field.max !== undefined) return field.max;
  return undefined;
}

function visibleFields(pageIdx, answers) {
  const fields = PAGES[pageIdx];
  if (pageIdx !== LAST) return fields;
  // 마지막 페이지 분기: 인터뷰 참여 → 동의·연락처·시간대, 비동의 → 숨김
  const hidden = new Set(['0cee778f', '42973a4b', '0c1bdef9']);
  const join = answers[fields.find((f) => f.key === '8d867965').id];
  if (join && BRANCHES['8d867965'][join]) BRANCHES['8d867965'][join].forEach((k) => hidden.delete(k));
  const consentField = fields.find((f) => f.key === '0cee778f');
  const consent = answers[consentField.id];
  if (!hidden.has('0cee778f') && consent && BRANCHES['0cee778f'][consent].length === 0) {
    hidden.add('42973a4b');
    hidden.add('0c1bdef9');
  }
  return fields.filter((f) => !hidden.has(f.key));
}

const ALL_FIELDS = PAGES.flat();
const byKey = Object.fromEntries(ALL_FIELDS.map((f) => [f.key, f]));
const CHECKBOX_MAIN = ALL_FIELDS.filter((f) => f.type === 'CHECKBOX' && !f.num.includes('-'));

function optionIndex(field, id) {
  return field.options.findIndex((o) => o.id === id) + 1;
}
function optionLabel(field, id) {
  return field.options.find((o) => o.id === id)?.label;
}

// ---------- 토스트 ----------
function Toast({ toast, onMove }) {
  if (!toast) return null;
  return (
    <div className="fixed top-4 left-4 right-4 z-50 flex justify-center pointer-events-none">
      <div
        key={toast.id}
        className="toast-enter pointer-events-auto w-full max-w-[356px] flex items-center bg-white"
        style={{
          borderRadius: 12,
          padding: 10,
          boxShadow: 'rgba(0,0,0,0.2) 0px 4px 12px',
          minHeight: 60,
          gap: 18,
          borderStyle: 'solid',
          borderWidth: '0.5px 0.5px 0.5px 4px',
          borderColor: 'rgba(237,75,75,0.5) rgba(237,75,75,0.5) rgba(237,75,75,0.5) rgb(237,75,75)',
          fontSize: 13,
          lineHeight: '19.5px',
          color: '#171717',
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
        }}
        role="status"
      >
        <div className="p-2">
          <ToastErrorIcon />
        </div>
        <div className="flex-1 flex flex-col gap-0.5">
          <div style={{ fontWeight: 500 }}>유효하지 않은 입력이 있습니다.</div>
          <div className="text-xs text-info-foreground">문제가 있는 필드를 확인하세요</div>
        </div>
        <button
          type="button"
          onClick={onMove}
          className="bg-info text-info-foreground"
          style={{ borderRadius: 8, padding: '0 12px', fontSize: 12, height: 32, fontWeight: 600 }}
        >
          이동하기
        </button>
      </div>
    </div>
  );
}

// ---------- 본체 ----------
export default function VariantA() {
  const [page, setPage] = useState(0);
  const [answers, setAnswers] = useState({});
  const [attempted, setAttempted] = useState({}); // 페이지별로 다음을 눌러 봤는지
  const [toast, setToast] = useState(null);
  const [done, setDone] = useState(false);
  const containers = useRef({});
  const toastTimer = useRef(null);

  // 측정용 상태 (화면에는 영향 없음)
  const m = useRef({
    startedAt: null,
    mainSeconds: null,
    errorEventsMain: 0,
    viewed: new Set(),
    answered: new Set(),
    lastViewed: null,
    lastAnswered: null,
    shownErrors: {}, // fieldId -> { kind, at }
    selectCounts: {}, // fieldId -> { selected, deselect }
    lastExitKey: null,
    submitted: false,
  }).current;

  const fields = useMemo(() => visibleFields(page, answers), [page, answers]);
  const full = !!attempted[page];
  const errors = useMemo(() => {
    const out = {};
    for (const f of fields) {
      const e = validate(f, answers[f.id], full);
      if (e) out[f.id] = e;
    }
    return out;
  }, [fields, answers, full]);

  const secondsSinceStart = () => (m.startedAt ? Math.round((Date.now() - m.startedAt) / 100) / 10 : 0);
  const section = (f) => (f.num.startsWith('17') ? 'experience' : f.num.startsWith('18') ? 'interview' : 'main');

  // 화면에 보이는 오류가 사라지면 ab_error_resolved
  useEffect(() => {
    const now = Date.now();
    for (const f of fields) {
      const e = errors[f.id];
      const prev = m.shownErrors[f.id];
      if (e && !prev) m.shownErrors[f.id] = { kind: e.kind, at: now };
      else if (e && prev) prev.kind = e.kind;
      else if (!e && prev) {
        track('ab_error_resolved', { kind: prev.kind, question: f.num, seconds_to_fix: Math.round((now - prev.at) / 100) / 10 });
        delete m.shownErrors[f.id];
      }
    }
  }, [errors, fields, m]);

  // 문항이 화면에 50% 이상 보이면 ab_question_viewed (문항마다 1번)
  useEffect(() => {
    if (done) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (!en.isIntersecting) continue;
          const num = en.target.dataset.num;
          const f = ALL_FIELDS.find((x) => x.num === num);
          if (!f || m.viewed.has(f.id)) continue;
          m.viewed.add(f.id);
          m.lastViewed = f.num;
          track('ab_question_viewed', { question: f.num, section: section(f) });
        }
      },
      { threshold: 0.5 }
    );
    for (const f of fields) {
      const el = containers.current[f.id];
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, [fields, page, done, m]);

  // 위로 지나간 문항은 살짝 작아짐 (왈라와 같은 효과)
  useEffect(() => {
    const onScroll = () => {
      for (const f of fields) {
        const el = containers.current[f.id];
        if (!el) continue;
        el.style.transform = el.getBoundingClientRect().bottom < 0 ? 'scale(0.98)' : 'none';
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [fields]);

  // 응답 도중 이탈 (창 닫기, 앱 전환)
  useEffect(() => {
    const onHide = () => {
      if (!m.startedAt || m.submitted) return;
      const key = `${m.lastViewed}|${m.lastAnswered}|${page}`;
      if (key === m.lastExitKey) return;
      m.lastExitKey = key;
      const lv = ALL_FIELDS.find((f) => f.num === m.lastViewed);
      trackBeacon('ab_exit', {
        last_question_viewed: m.lastViewed,
        last_question_answered: m.lastAnswered,
        section: lv ? section(lv) : 'main',
        page,
        seconds_since_start: secondsSinceStart(),
      });
    };
    const onVis = () => document.visibilityState === 'hidden' && onHide();
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pagehide', onHide);
    };
  }, [page, m]);

  const markAnswered = (f, value, extra = {}) => {
    if (m.answered.has(f.id) || isEmpty(f, value)) return;
    m.answered.add(f.id);
    m.lastAnswered = f.num;
    const props = { question: f.num, section: section(f), seconds_since_start: secondsSinceStart(), ...extra };
    track('ab_question_answered', props);
  };

  const setAnswer = (f, value) => {
    setAnswers((a) => ({ ...a, [f.id]: value }));
    let extra = {};
    if (f.num === '17-2' && value) extra = { answer: optionIndex(f, value), answer_label: optionLabel(f, value) };
    markAnswered(f, value, extra);
  };

  const toggle = (f, optId) => {
    const cur = answers[f.id] || [];
    const on = cur.includes(optId);
    const next = on ? cur.filter((x) => x !== optId) : [...cur, optId];
    const c = (m.selectCounts[f.id] ||= { selected: 0, deselect: 0 });
    if (on) c.deselect += 1;
    else c.selected += 1;
    const limit = limitOf(f);
    if (!on && limit !== undefined && next.length > limit) {
      track('ab_max_selection_exceeded', { question: f.num, selected_count: next.length, max_allowed: limit });
    }
    setAnswers((a) => ({ ...a, [f.id]: next }));
    markAnswered(f, next);
  };

  const showToast = () => {
    clearTimeout(toastTimer.current);
    setToast({ id: Date.now() });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  };

  const goTo = (p) => {
    setPage(p);
    setToast(null);
    window.scrollTo(0, 0);
  };

  const moveToError = () => {
    const first = fields.find((f) => validate(f, answers[f.id], true));
    const el = first && containers.current[first.id];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.querySelector('button, input, textarea')?.focus({ preventScroll: true });
    }
  };

  const checkPage = () => {
    const errs = fields.map((f) => [f, validate(f, answers[f.id], true)]).filter(([, e]) => e);
    if (errs.length === 0) return true;
    setAttempted((a) => ({ ...a, [page]: true }));
    for (const [f, e] of errs) {
      const props = { kind: e.kind, question: f.num };
      if (f.type === 'CHECKBOX') {
        props.selected_count = (answers[f.id] || []).length;
        if (f.min !== undefined) props.min_required = f.min;
        if (f.exact !== undefined) props.min_required = f.exact;
        const lim = limitOf(f);
        if (lim !== undefined) props.max_allowed = lim;
      }
      track('ab_error_shown', props);
    }
    if (page >= 1 && page <= MAIN_LAST) m.errorEventsMain += 1;
    showToast();
    return false;
  };

  const next = () => {
    if (page === 0) {
      m.startedAt = Date.now();
      track('ab_version_started');
      goTo(1);
      return;
    }
    if (!checkPage()) return;
    if (page === LAST) return; // 마지막 페이지는 제출 버튼으로만 끝난다
    track('ab_page_completed', { page });
    if (page === MAIN_LAST) {
      m.mainSeconds = secondsSinceStart();
      const props = { seconds: m.mainSeconds, error_events: m.errorEventsMain };
      let total = 0;
      for (const f of CHECKBOX_MAIN) {
        const c = m.selectCounts[f.id] || { selected: 0, deselect: 0 };
        props[`q${f.num}_selected_count`] = (answers[f.id] || []).length;
        props[`q${f.num}_deselect_count`] = c.deselect;
        total += c.deselect;
      }
      props.deselect_total = total;
      track('ab_main_completed', props);
    }
    goTo(page + 1);
  };

  const prev = () => page > 0 && goTo(page - 1);

  const submit = () => {
    if (!checkPage()) return;
    m.submitted = true;
    const f = (k) => byKey[k];
    const exp = (k) => answers[f(k).id];
    const props = {
      seconds_total: secondsSinceStart(),
      seconds_main: m.mainSeconds,
      error_events_main: m.errorEventsMain,
      exp_17_2: exp('1b29bf69') ? optionIndex(f('1b29bf69'), exp('1b29bf69')) : null,
      exp_17_2_label: optionLabel(f('1b29bf69'), exp('1b29bf69')) || null,
      exp_17_3: exp('6aaf7c86') ? optionIndex(f('6aaf7c86'), exp('6aaf7c86')) : null,
      exp_17_3_label: optionLabel(f('6aaf7c86'), exp('6aaf7c86')) || null,
      exp_17_4: exp('80efdfde') ? optionIndex(f('80efdfde'), exp('80efdfde')) : null,
      exp_17_4_label: optionLabel(f('80efdfde'), exp('80efdfde')) || null,
      ease_score: exp('7fe2d4fd') ?? null,
      reason: exp('c424f897') || '',
      interview_join: optionLabel(f('8d867965'), exp('8d867965')) || null,
    };
    track('ab_response_submitted', props);

    // 응답 원본(인터뷰 연락처 포함)은 Mixpanel이 아니라 서버에 저장
    if (!IS_TESTER) {
      const shown = new Set(visibleFields(LAST, answers).map((x) => x.id));
      const rows = {};
      for (const x of ALL_FIELDS) {
        if (x.type === 'DESCRIPTION') continue;
        if (x.num.startsWith('18') && !shown.has(x.id)) continue;
        const v = answers[x.id];
        if (v === undefined) continue;
        rows[x.num] = x.options ? (Array.isArray(v) ? v.map((id) => optionLabel(x, id)) : optionLabel(x, v)) : v;
      }
      const body = JSON.stringify({
        response_id: window.__AB__?.response_id,
        version: 'A',
        distinct_id: window.__AB__?.distinct_id,
        answers: rows,
        seconds_total: props.seconds_total,
      });
      fetch('/api/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
    }
    setDone(true);
    window.scrollTo(0, 0);
  };

  // ---------- 화면 ----------
  const progress = ((page + 1) / PAGES.length) * 100;
  const lastAnsweredBranch = page === LAST && answers[byKey['8d867965'].id];
  const showSubmit = page === LAST && lastAnsweredBranch;

  return (
    <div className="w-full h-full flex flex-row justify-center bg-background">
      <div className="w-full max-w-4xl text-foreground">
        <div className="fixed -top-1 left-0 w-full z-50 bg-background">
          <div role="progressbar" className="relative overflow-hidden bg-primary/20 h-2.5 w-full rounded-none">
            <div className="h-full w-full flex-1 bg-primary transition-all" style={{ transform: `translateX(-${100 - progress}%)` }} />
          </div>
        </div>

        <div className="h-full flex flex-col w-screen max-w-4xl overflow-x-visible py-10 px-6 justify-center gap-8 pb-[300px]">
          <form onSubmit={(e) => e.preventDefault()}>
            <div className="flex flex-col gap-10">
              {fields.map((f) => (
                <Field
                  key={f.id}
                  field={f}
                  value={answers[f.id]}
                  error={errors[f.id]}
                  containerRef={(el) => (containers.current[f.id] = el)}
                  onAnswer={(v) => setAnswer(f, v)}
                  onToggle={(id) => toggle(f, id)}
                />
              ))}
            </div>
            <div className="flex justify-end mt-5">
              {!showSubmit && (
                <button
                  type="button"
                  aria-label="Next page"
                  onClick={next}
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium cursor-pointer bg-primary text-primary-foreground h-12 text-md px-3 py-2 w-fit min-w-20 rounded-2xl"
                >
                  다음 →
                </button>
              )}
            </div>
            {page === 0 && (
              <p className="mt-6 text-xs text-muted-foreground">응답 과정(누른 위치 등)이 익명으로 기록됩니다.</p>
            )}
            <div className="mt-20">
              {showSubmit && (
                <div className="flex flex-col gap-12 w-full justify-center items-center">
                  <button
                    type="button"
                    onClick={submit}
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium cursor-pointer bg-primary text-primary-foreground h-12 text-md rounded-xl px-3 py-2 w-full max-w-full overflow-hidden"
                  >
                    <span className="truncate">{survey.submitLabel}</span>
                  </button>
                </div>
              )}
            </div>
          </form>

          <div className="w-full bg-background/30 fixed bottom-0 left-0 flex justify-center pb-4 pt-3 px-4 z-10">
            <div className="w-full max-w-4xl flex justify-between items-center">
              <div className="flex items-center gap-2 min-w-0" />
              <div className="flex justify-center gap-2">
                {page > 0 && (
                  <button type="button" onClick={prev} className="inline-flex items-center justify-center cursor-pointer bg-primary text-primary-foreground h-10 w-10 rounded-2xl">
                    <ChevronIcon left />
                  </button>
                )}
                {!showSubmit && (
                  <button
                    type="button"
                    aria-label="Next page"
                    onClick={next}
                    className="inline-flex items-center justify-center cursor-pointer bg-primary text-primary-foreground h-10 w-10 rounded-2xl"
                  >
                    <ChevronIcon />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <Toast toast={toast} onMove={moveToError} />
      {done && (
        // 제출 완료: 뒤 화면을 흐리게 덮고 흰 카드로 결과를 보여 준다 (왈라 종료 화면)
        <div className="fixed inset-0 z-[70] bg-black/10 backdrop-blur-sm">
          <div className="absolute left-[18px] right-[18px] top-[23px] bottom-4 mx-auto max-w-lg overflow-y-auto rounded-2xl bg-background px-12 pt-12 pb-10">
            <div className="ProseMirror ending" dangerouslySetInnerHTML={{ __html: survey.ending.html }} />
          </div>
        </div>
      )}
    </div>
  );
}
