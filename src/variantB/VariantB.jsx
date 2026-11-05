// B안(개선안) 자리. 프로토타입을 받으면 이 파일만 바꾸면 된다.
// 받기 전까지는 '준비 중' 화면만 보여 주고, 이벤트는 보내지 않는다.
export default function VariantB() {
  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center px-6 text-center gap-2">
      <p className="text-lg font-semibold text-foreground">준비 중이에요</p>
      <p className="text-sm text-paragraph">잠시 후 다시 접속해 주세요.</p>
    </div>
  );
}

// B안이 준비되면 true로 바꾼다. false인 동안 B 배정자에게는 이벤트를 보내지 않는다.
export const B_READY = false;
