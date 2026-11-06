import posthog from 'posthog-js';

// 팀원 모드: ?tester=1 이면 PostHog를 초기화하지 않고 콘솔에만 찍는다.
const params = new URLSearchParams(window.location.search);
export const IS_TESTER = params.get('tester') === '1';
export const FORCED_VERSION = IS_TESTER ? (params.get('version') || '').toUpperCase() : '';

const KEY = import.meta.env.VITE_POSTHOG_KEY;
// US 클라우드가 기본. EU 프로젝트면 VITE_POSTHOG_HOST=https://eu.i.posthog.com
const HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';
export const BUILD = typeof __BUILD__ !== 'undefined' ? __BUILD__ : 'dev';

let ready = false;
let superProps = {};

export function initTracking() {
  if (IS_TESTER || ready) return;
  if (!KEY) {
    console.warn('[tracking] VITE_POSTHOG_KEY가 없어 이벤트를 보내지 않아요.');
    return;
  }
  posthog.init(KEY, {
    api_host: HOST,
    capture_pageview: true,
    persistence: 'localStorage',
    // identify()는 부르지 않는다 → SDK가 기기마다 익명 distinct_id를 만든다. 사람 프로필은 만들지 않는다.
    person_profiles: 'identified_only',
    // 세션 기록: 모든 응답자 (PostHog 프로젝트 설정에서 Session replay도 켜야 기록된다)
    disable_session_recording: false,
    // 세션 기록에서 문항·보기 글자는 보이게 하고, 직접 입력한 칸(숫자·글·연락처)은 계속 가린다.
    session_recording: { maskAllInputs: true },
    capture_heatmaps: true, // 클릭·스크롤 히트맵
  });
  ready = true;
}

export function register(props) {
  superProps = { ...superProps, ...props };
  if (IS_TESTER) {
    console.log('%c[팀원 모드] register', 'color:#007eff', props);
    return;
  }
  if (ready) posthog.register(props);
}

export function track(event, props = {}, options) {
  if (IS_TESTER) {
    console.log('%c[팀원 모드] ' + event, 'color:#007eff;font-weight:bold', { ...superProps, ...props });
    return;
  }
  if (!ready) return;
  if (options) posthog.capture(event, props, options);
  else posthog.capture(event, props);
}

// 창을 닫을 때도 빠지지 않게 sendBeacon으로 보낸다.
export function trackBeacon(event, props = {}) {
  track(event, props, { transport: 'sendBeacon', send_instantly: true });
}

export function newId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return 'r-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}
