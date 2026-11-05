import mixpanel from 'mixpanel-browser';

// 팀원 모드: ?tester=1 이면 Mixpanel을 초기화하지 않고 콘솔에만 찍는다.
const params = new URLSearchParams(window.location.search);
export const IS_TESTER = params.get('tester') === '1';
export const FORCED_VERSION = IS_TESTER ? (params.get('version') || '').toUpperCase() : '';

const TOKEN = import.meta.env.VITE_MIXPANEL_TOKEN;
export const BUILD = typeof __BUILD__ !== 'undefined' ? __BUILD__ : 'dev';

let ready = false;
let superProps = {};

export function initTracking() {
  if (IS_TESTER || ready) return;
  if (!TOKEN) {
    console.warn('[tracking] VITE_MIXPANEL_TOKEN이 없어 이벤트를 보내지 않아요.');
    return;
  }
  mixpanel.init(TOKEN, {
    track_pageview: true,
    persistence: 'localStorage',
    record_sessions_percent: 100, // 세션 기록: 모든 응답자
    record_heatmap_data: true, // 클릭 기록: 히트맵
    // 세션 기록에서 문항·보기 글자는 보이게 하고, 직접 입력한 칸(숫자·글·연락처)은 계속 가린다.
    record_mask_all_text: false,
    record_mask_all_inputs: true,
    // identify()는 부르지 않는다 → SDK가 기기마다 $device:... distinct_id를 만든다.
  });
  ready = true;
}

export function register(props) {
  superProps = { ...superProps, ...props };
  if (IS_TESTER) {
    console.log('%c[팀원 모드] register', 'color:#007eff', props);
    return;
  }
  if (ready) mixpanel.register(props);
}

export function track(event, props = {}, options) {
  if (IS_TESTER) {
    console.log('%c[팀원 모드] ' + event, 'color:#007eff;font-weight:bold', { ...superProps, ...props });
    return;
  }
  if (!ready) return;
  if (options) mixpanel.track(event, props, options);
  else mixpanel.track(event, props);
}

// 창을 닫을 때도 빠지지 않게 sendBeacon으로 보낸다.
export function trackBeacon(event, props = {}) {
  track(event, props, { transport: 'sendBeacon', send_immediately: true });
}

export function newId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return 'r-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}
