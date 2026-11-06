// 구글 시트 → 확장 프로그램 → Apps Script에 이 코드를 통째로 붙여넣는다.
// TOKEN은 Vercel 환경 변수 SHEET_WEBHOOK_TOKEN과 똑같은 값으로 바꾼다.
const TOKEN = '여기에_비밀값을_넣으세요';

const HEADER = ['접수 시각(한국)', '버전', '연락처', '가능한 시간대', '응답 ID', '연락 여부', '인터뷰 일정', '메모'];

function doPost(e) {
  const d = JSON.parse(e.postData.contents);
  if (d.token !== TOKEN) return ContentService.createTextOutput('forbidden');

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    if (sh.getLastRow() === 0) {
      sh.appendRow(HEADER);
      sh.setFrozenRows(1);
    }
    // 같은 응답이 두 번 오면 건너뛴다
    const last = sh.getLastRow();
    if (last > 1) {
      const ids = sh.getRange(2, 5, last - 1, 1).getValues().flat();
      if (ids.indexOf(d.response_id) !== -1) return ContentService.createTextOutput('dup');
    }
    // 작은따옴표: 010으로 시작하는 번호의 0이 사라지지 않게, '='로 시작하는 글이 수식이 되지 않게
    const text = (v) => "'" + String(v == null ? '' : v);
    sh.appendRow([
      Utilities.formatDate(new Date(d.received_at), 'Asia/Seoul', 'yyyy-MM-dd HH:mm'),
      text(d.version),
      text(d.contact),
      text(d.times),
      d.response_id,
    ]);
    return ContentService.createTextOutput('ok');
  } finally {
    lock.releaseLock();
  }
}
