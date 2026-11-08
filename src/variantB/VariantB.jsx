// B안(개선안). Figma 「목업 hifi」(node 903:2170)와 플로우(node 928:3249)를 옮긴 것.
// A안과의 차이: 복수선택 개수 알약, 하단 오류 스낵바(바로가기 → 오류 문항으로 스크롤),
// 오류 문구, 진행률 바(문항 수 기준), 개수가 다 차면 나머지 보기 비활성, 제출 완료 화면.
// 문항·분기·이벤트 이름과 속성은 A안과 같다(비교 분석용).
import { useEffect, useMemo, useRef, useState } from 'react';
import survey from '../survey.json';
import { Field } from './fields.jsx';
import { track, trackBeacon, IS_TESTER } from '../tracking.js';

const PAGES = survey.pages;
const LAST = PAGES.length - 1;
const MAIN_LAST = 4; // 1~16번이 끝나는 페이지 (0: 인트로)
const BRANCHES = survey.branches;
const ICON = '/b/';

const ALL_FIELDS = PAGES.flat();
const byKey = Object.fromEntries(ALL_FIELDS.map((f) => [f.key, f]));
const CHECKBOX_MAIN = ALL_FIELDS.filter((f) => f.type === 'CHECKBOX' && !f.num.includes('-'));
// 화면에 보이는 문항 번호 (설명 블록 제외, 1~24)
const QUESTIONS = ALL_FIELDS.filter((f) => f.type !== 'DESCRIPTION');
const NO = Object.fromEntries(QUESTIONS.map((f, i) => [f.id, i + 1]));
const PAGE_OF = Object.fromEntries(PAGES.flatMap((fs, i) => fs.map((f) => [f.id, i])));

function isEmpty(field, v) {
  if (field.type === 'CHECKBOX') return !v || v.length === 0;
  if (field.type === 'LINEAR') return v === undefined || v === null;
  return v === undefined || v === null || v === '';
}

function limitOf(field) {
  if (field.type !== 'CHECKBOX') return undefined;
  if (field.exact !== undefined) return field.exact;
  if (field.max !== undefined) return field.max;
  return undefined;
}
function minOf(field) {
  if (field.exact !== undefined) return field.exact;
  return field.min;
}

const b = (t) => <strong className="font-bold">{t}</strong>;

// B안 오류 문구. 개수가 다 차면 더 고를 수 없으므로 '초과' 오류는 없다.
function validate(field, v) {
  if (field.type === 'DESCRIPTION') return null;
  if (field.type === 'CHECKBOX') {
    const n = (v || []).length;
    const need = minOf(field);
    if (n === 0 && field.required) {
      return need
        ? { kind: 'required', node: <>답변을 {b(`${need}개`)} 선택해 주세요.</> }
        : { kind: 'required', node: <>답변을 선택해 주세요.</> };
    }
    if (need !== undefined && n > 0 && n < need) return { kind: 'min', node: <>답변을 {b(`${need - n}개`)} 더 선택해 주세요.</> };
    return null;
  }
  if (field.required && isEmpty(field, v)) {
    if (field.type === 'RADIO') return { kind: 'required', node: <>답변을 선택해 주세요.</> };
    if (field.type === 'LINEAR') return { kind: 'required', node: <>점수를 선택해 주세요.</> };
    return { kind: 'required', node: <>답변을 입력해 주세요.</> };
  }
  return null;
}

function visibleFields(pageIdx, answers) {
  const fields = PAGES[pageIdx];
  if (pageIdx !== LAST) return fields;
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

// 진행률: 답한 문항 수 / 전체 문항 수. 분기로 빠진 인터뷰 문항은 전체에서 빼고,
// 건너뛴 선택 문항은 그 페이지를 지나면 답한 것으로 센다.
function progressOf(answers, page) {
  const last = visibleFields(LAST, answers);
  const join = answers[byKey['8d867965'].id];
  const counted = QUESTIONS.filter((f) => !f.num.startsWith('18') || !join || last.includes(f));
  const done = counted.filter((f) => !isEmpty(f, answers[f.id]) || (!f.required && PAGE_OF[f.id] < page)).length;
  const total = counted.length;
  return { done, total, pct: total ? Math.floor((done / total) * 100) : 0 };
}

function optionIndex(field, id) {
  return field.options.findIndex((o) => o.id === id) + 1;
}
function optionLabel(field, id) {
  return field.options.find((o) => o.id === id)?.label;
}

function formatNow(d) {
  const p = (n) => String(n).padStart(2, '0');
  const h = d.getHours();
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${h < 12 ? '오전' : '오후'} ${h % 12 || 12}:${p(d.getMinutes())}`;
}

// ---------- 화면 조각 ----------
function ProgressHeader({ done, total, pct }) {
  return (
    <div className="sticky top-0 z-30 flex flex-col gap-2 border-b border-[#d7e2ff] bg-[#eaf2ff] px-6 py-3">
      <div className="flex h-[17px] items-center justify-between text-black">
        <div className="flex items-center gap-1">
          <span className="text-[14px] font-medium">진행률</span>
          <span className="text-[16px] font-semibold">{pct}%</span>
        </div>
        <p className="font-medium">
          <span className="text-[16px]">{done}</span>
          <span className="text-[14px]"> </span>
          <span className="text-[14px] text-[#6e6e6e]">/ {total} 문항</span>
        </p>
      </div>
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        className="relative h-4 w-full overflow-hidden rounded-[8px] border border-[rgba(0,126,255,0.1)] bg-[#fbfbfb]"
      >
        <div className="absolute inset-y-0 left-0 rounded-[8px] bg-[#3b82f6] transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function PrimaryButton({ children, onClick, icon = 'icon-arrow', full }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-12 min-w-20 items-center justify-center rounded-[8px] bg-[#007eff] px-6 text-[18px] font-medium leading-6 text-white active:bg-[#006ae0] ${
        full ? 'w-full' : 'w-fit'
      }`}
    >
      {children}
      {icon && <img src={`${ICON}${icon}.svg`} alt="" width={24} height={24} className="block shrink-0" />}
    </button>
  );
}

function NavFab({ dir, onClick }) {
  return (
    <button
      type="button"
      aria-label={dir === 'prev' ? '이전 페이지' : '다음 페이지'}
      onClick={onClick}
      className="flex size-14 items-center justify-center"
    >
      <span className="flex size-[52px] items-center justify-center rounded-full bg-[#468fff] drop-shadow-[0px_0px_5px_rgba(0,27,64,0.15)] active:bg-[#7dabff]">
        <img
          src={`${ICON}icon-chevron.svg`}
          alt=""
          width={24}
          height={24}
          className={`block ${dir === 'prev' ? 'rotate-180' : ''}`}
        />
      </span>
    </button>
  );
}

function SnackBar({ count, onGo }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-[480px] p-4">
      <div
        role="alert"
        className="snack-enter flex h-[74px] w-full items-center justify-between overflow-hidden rounded-[8px] border border-[#ffccc7] bg-[#fbdbd8] py-2 pl-3 pr-1 shadow-[0px_0px_10px_0px_rgba(0,27,64,0.15)]"
      >
        <div className="flex min-w-0 items-center">
          <img src={`${ICON}icon-exclamation.svg`} alt="" width={24} height={24} className="block shrink-0" />
          <p className="text-[16px] font-medium text-[#d42626]">
            확인이 필요한 답변이 <strong className="font-bold">{count}개</strong> 있어요.
          </p>
        </div>
        <button type="button" onClick={onGo} className="flex h-12 shrink-0 items-center justify-end pl-2">
          <span className="mr-[-6px] text-[14px] font-semibold text-[#212121]">바로가기</span>
          <img src={`${ICON}icon-chevron-small.svg`} alt="" width={24} height={24} className="block" />
        </button>
      </div>
    </div>
  );
}

function Intro({ onNext }) {
  return (
    <div className="flex flex-col gap-8 px-4 py-[10px]">
      <div className="flex flex-col gap-6">
        <img src="/intro.webp" alt="" className="block aspect-square w-full object-cover" />
        <div className="flex flex-col gap-2">
          <h1 className="text-[20px] font-semibold leading-6 tracking-[-0.2px] text-[#212121]">"그 정도로 이혼까지 해?"</h1>
          <div className="text-[16px] font-medium leading-5 tracking-[-0.16px] text-[#4d4d4d]">
            <p>사소한데 은근히 거슬리는 배우자의 습관들.</p>
            <p>&nbsp;</p>
            <p>어디까지 참을 수 있는지 당신의 이혼 역치를 측정해드립니다. ⚖️</p>
            <p>&nbsp;</p>
            <p>실제 결혼 여부와 상관없이 상상하며 가볍게 응답해주세요. (약 5분)</p>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-6">
        <PrimaryButton onClick={onNext} icon="icon-next">
          다음
        </PrimaryButton>
        <p className="text-[12px] text-[#a6a6a6]">응답 과정(누른 위치 등)이 익명으로 기록됩니다.</p>
      </div>
    </div>
  );
}

function Submitted({ at, onClose, closeTried }) {
  return (
    <div className="flex min-h-dvh flex-col items-center px-4 pb-8 pt-12">
      <img src={`${ICON}submitted.gif`} alt="" width={185} height={136} className="block h-[136px] w-[185px] object-contain" />
      <div className="flex w-full flex-1 flex-col items-center justify-between gap-12">
        <div className="flex w-full flex-col items-center gap-4">
          <div className="flex w-full flex-col gap-4 px-4">
            <p className="w-full px-4 text-center text-[24px] font-bold leading-[1.6] text-[#007eff]">제출 완료!</p>
            <div className="flex w-full flex-col gap-1 rounded-[8px] border border-[#e6e6e6] p-4">
              <p className="text-[14px] font-bold text-[#007eff]">응답 완료</p>
              <div className="flex items-center justify-between gap-2 text-black">
                <p className="text-[16px] font-bold">이혼 역치 측정 설문</p>
                <p className="text-[13px] font-medium">{at}</p>
              </div>
            </div>
          </div>
          <div className="text-center text-[16px] font-medium leading-[1.6] text-[#222]">
            <p>⚖️판결: 그럴 수 있지 대법관형</p>
            <p>웬만한 일엔 흔들리지 않는 넓은 마음의 소유자!</p>
            <p>단, 마지막 치킨 조각은 예외입니다.🍗</p>
          </div>
        </div>
        <div className="flex w-full flex-col items-center gap-3">
          {closeTried && <p className="text-[14px] text-[#6e6e6e]">이제 이 창을 닫으셔도 돼요.</p>}
          <PrimaryButton onClick={onClose} icon={null} full>
            창 닫기
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

// ---------- 본체 ----------
export default function VariantB() {
  const [page, setPage] = useState(0);
  const [answers, setAnswers] = useState({});
  const [attempted, setAttempted] = useState({}); // 페이지별로 다음을 눌러 봤는지
  const [done, setDone] = useState(null); // 제출 시각 문자열
  const [closeTried, setCloseTried] = useState(false);
  const [actionVisible, setActionVisible] = useState(false);
  const [typing, setTyping] = useState(false);
  const containers = useRef({});
  const actionRef = useRef(null);

  // 측정용 상태 (A안과 같은 구조)
  const m = useRef({
    startedAt: null,
    mainSeconds: null,
    errorEventsMain: 0,
    viewed: new Set(),
    answered: new Set(),
    lastViewed: null,
    lastAnswered: null,
    shownErrors: {},
    selectCounts: {},
    lastExitKey: null,
    submitted: false,
  }).current;

  const fields = useMemo(() => visibleFields(page, answers), [page, answers]);
  const full = !!attempted[page];
  const errors = useMemo(() => {
    if (!full) return {};
    const out = {};
    for (const f of fields) {
      const e = validate(f, answers[f.id]);
      if (e) out[f.id] = e;
    }
    return out;
  }, [fields, answers, full]);
  const errorCount = Object.keys(errors).length;
  const prog = useMemo(() => progressOf(answers, page), [answers, page]);

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
          const f = ALL_FIELDS.find((x) => x.num === en.target.dataset.num);
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

  // 다음 버튼이 보이면 떠 있는 이전/다음 버튼을 숨긴다 (Figma 2-1, 3-1)
  useEffect(() => {
    const el = actionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([en]) => setActionVisible(en.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [page, done]);

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
    track('ab_question_answered', { question: f.num, section: section(f), seconds_since_start: secondsSinceStart(), ...extra });
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
    setAnswers((a) => ({ ...a, [f.id]: next }));
    markAnswered(f, next);
  };

  // 개수가 다 찬 뒤 비활성 보기를 누름 → A안의 '초과 선택'과 비교하려고 같은 이벤트로 남긴다
  const blocked = (f) => {
    const limit = limitOf(f);
    track('ab_max_selection_exceeded', {
      question: f.num,
      selected_count: (answers[f.id] || []).length + 1,
      max_allowed: limit,
      blocked: true,
    });
  };

  const goTo = (p) => {
    setPage(p);
    setTyping(false);
    window.scrollTo(0, 0);
  };

  const moveToError = () => {
    track('ab_snackbar_clicked', { page, error_count: errorCount });
    const first = fields.find((f) => errors[f.id]);
    const el = first && containers.current[first.id];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const checkPage = () => {
    const errs = fields.map((f) => [f, validate(f, answers[f.id])]).filter(([, e]) => e);
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
    if (page === LAST) return;
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

    // 응답 원본(인터뷰 연락처 포함)은 PostHog가 아니라 서버에 저장
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
        version: 'B',
        distinct_id: window.__AB__?.distinct_id,
        answers: rows,
        seconds_total: props.seconds_total,
      });
      fetch('/api/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
    }
    setDone(formatNow(new Date()));
    window.scrollTo(0, 0);
  };

  const closeWindow = () => {
    track('ab_end_close_clicked');
    window.close();
    // 스크립트로 연 창이 아니면 브라우저가 닫기를 막는다 → 안내 문구를 보여 준다
    setTimeout(() => setCloseTried(true), 300);
  };

  // ---------- 화면 ----------
  const shell = (children) => (
    <div className="min-h-dvh w-full bg-white font-[Pretendard_Variable,Pretendard,sans-serif]">
      <div className="mx-auto w-full max-w-[480px]">{children}</div>
    </div>
  );

  if (done) return shell(<Submitted at={done} onClose={closeWindow} closeTried={closeTried} />);
  if (page === 0)
    return shell(
      <div ref={actionRef}>
        <Intro onNext={next} />
      </div>
    );

  const isLast = page === LAST;
  const showSubmit = isLast && !!answers[byKey['8d867965'].id];
  const showSnack = errorCount > 0;
  const showFabs = !actionVisible && !showSnack && !typing;

  return shell(
    <>
      <ProgressHeader {...prog} />
      <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-[52px] px-4 pb-[120px] pt-[10px]">
        <div className="flex flex-col gap-12">
          {fields.map((f) => (
            <Field
              key={f.id}
              field={f}
              no={NO[f.id]}
              value={answers[f.id]}
              error={errors[f.id]}
              limit={limitOf(f)}
              containerRef={(el) => (containers.current[f.id] = el)}
              onAnswer={(v) => setAnswer(f, v)}
              onToggle={(id) => toggle(f, id)}
              onBlocked={() => blocked(f)}
              onFocusChange={setTyping}
            />
          ))}
        </div>
        <div ref={actionRef} className="flex flex-col items-start">
          {isLast ? (
            showSubmit && (
              <PrimaryButton onClick={submit} icon={null} full>
                {survey.submitLabel}
              </PrimaryButton>
            )
          ) : (
            <PrimaryButton onClick={next}>다음</PrimaryButton>
          )}
        </div>
      </form>

      {showFabs && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-[480px] justify-end px-4 pb-2">
          <div className="pointer-events-auto flex items-center gap-2">
            <NavFab dir="prev" onClick={prev} />
            {!isLast && <NavFab dir="next" onClick={next} />}
          </div>
        </div>
      )}
      {showSnack && <SnackBar count={errorCount} onGo={moveToError} />}
    </>
  );
}

// B안을 받는 사람에게도 이벤트를 보낸다.
export const B_READY = true;
