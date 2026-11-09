# 이혼 역치 측정 설문 A/B 테스트 (divorce_1)

설문 응답 화면 A/B 테스트용 모바일 웹사이트예요. 참가자는 A나 B 중 하나만 응답해요.

- **A안**: 왈라 설문(`walla.my/v/7GnQjwfRKkgjmJrMEGzb`)을 화면과 동작 그대로 옮긴 프리토타입 (`src/variantA/`)
- **B안**: 개선안 (`src/variantB/`). Figma 「목업 hifi」를 옮긴 모바일 화면이에요. 문항·분기·이벤트는 A안과 같아요.
  - A안과 다른 점: 복수선택 제목 끝 개수 알약("3개 선택"), 오류 시 하단 스낵바(뜨면서 가장 위 오류 문항으로 자동 스크롤, [바로가기]를 누를 때마다 다음 오류 문항으로), 오류 문구("답변을 N개 더 선택해 주세요." 등), 진행률 바(답한 문항 수 / 전체 문항 수), 개수가 다 차면 나머지 보기 비활성, 떠 있는 이전·다음 버튼, 제출 완료 화면
  - 디자인 에셋: `public/b/`
- **분석 도구**: PostHog

## 실행

```bash
npm install
npm run dev
```

- 팀원 모드: `/?tester=1` (PostHog로 아무것도 보내지 않고 콘솔에만 출력, 배정 카운터도 안 올림)
- 버전 고르기: `/?tester=1&version=A`, `/?tester=1&version=B`

## 배포 (Vercel)

1. 이 저장소를 Vercel에 연결해요. 프레임워크는 Vite로 자동 인식돼요.
2. **Storage → Upstash Redis(또는 KV)** 를 프로젝트에 연결해요. `KV_REST_API_URL`, `KV_REST_API_TOKEN`이 자동으로 들어와요.
   - 배정 카운터(`/api/assign`)와 응답 원본 저장(`/api/submit`)에 써요.
   - 연결하지 않으면 배정은 50:50 무작위(`assign_method = fallback`)로 대신하고, 응답 원본은 저장되지 않아요.
3. **Settings → Environment Variables**에 `VITE_POSTHOG_KEY`(PostHog 프로젝트의 Project API Key, `phc_`로 시작)를 넣어요. 없으면 이벤트를 보내지 않아요. 로컬에서는 `.env.local`에 같은 이름으로 넣어요.
   - PostHog 프로젝트가 EU 클라우드면 `VITE_POSTHOG_HOST=https://eu.i.posthog.com`도 넣어요. 없으면 US(`https://us.i.posthog.com`)로 보내요.
   - PostHog **Settings → Session replay**를 켜야 세션 기록이 남아요.

## 인터뷰 참여자 → 구글 시트 자동 추가

인터뷰 참여(18-2)와 개인정보 동의(18-3)를 하고 연락처(18-4)를 남긴 응답만 구글 시트에 한 줄씩 추가돼요. 응답 원본은 지금처럼 Redis에도 저장돼요.

1. 구글 시트를 새로 만들어요. 이 시트는 **팀원에게만** 공유해요(연락처가 들어가요).
2. 시트에서 **확장 프로그램 → Apps Script**를 열고, `scripts/interview-sheet.gs` 내용을 통째로 붙여넣어요.
3. 코드 맨 위 `TOKEN`을 아무도 모를 비밀값(영어·숫자, 공백 없이)으로, `SHEET_ID`를 시트 주소의 `/d/`와 `/edit` 사이 값으로 바꾸고 저장해요. 편집기에서 `authorize`를 한 번 실행해 권한을 허용해요.
4. **배포 → 새 배포 → 유형: 웹 앱**, 실행 사용자는 **나**, 액세스 권한은 **모든 사용자**로 배포해요. 나오는 웹 앱 URL을 복사해요.
5. Vercel **Settings → Environment Variables**에 두 값을 넣고(Production, Preview) 다시 배포해요.
   - `SHEET_WEBHOOK_URL`: 4번의 웹 앱 URL
   - `SHEET_WEBHOOK_TOKEN`: 3번의 비밀값
   - `VITE_`를 붙이지 않아요. 서버(`api/submit.js`)에서만 쓰여서 사이트에 노출되지 않아요.

- 두 변수가 없으면 시트로 보내지 않고 Redis에만 저장해요.
- 시트 전송이 실패해도 응답 제출은 성공으로 처리돼요(원본은 Redis에 남아 있음).
- 같은 응답이 두 번 오면 시트에서 건너뛰어요(응답 ID로 확인).
- Apps Script 코드를 고치면 **배포 → 배포 관리 → ✏️ → 버전: 새 버전 → 배포**를 해야 반영돼요. 저장만 하면 예전 버전이 계속 실행돼요.
- `/api/submit` 응답의 `sheet` 값으로 결과를 알 수 있어요: `ok`(추가됨), `dup`(이미 있음), `forbidden`(비밀값 불일치), `script_error`(스크립트 오류), `skipped`(인터뷰 대상 아님). 실패는 Vercel 로그에 `[sheet]`로 남아요.
- Apps Script는 오류가 나도 성공(200)으로 답해요. 줄이 안 생기면 Apps Script **⏱ 실행** 메뉴에서 `doPost` 기록과 버전을 확인해요.

## A/B 배정

- 시작 화면이 열릴 때 버전을 정해요(참가자에게는 보이지 않음).
- 서버 카운터를 4명 단위 블록으로 나누고, 블록마다 A·A·B·B를 섞은 6가지 순서 중 하나로 배정해요. 몇 명이 들어오든 A·B 차이는 최대 2명이에요.
- 같은 기기가 다시 들어오면 처음 배정(localStorage)을 그대로 써요.
- 카운터를 0부터 다시 쓰려면 Vercel 환경 변수 `ASSIGN_COUNTER_KEY`를 새 값으로 바꾸고 다시 배포해요.

## B안 넣는 방법

B안은 들어가 있고 `B_READY = true`예요(B 배정자도 이벤트를 보내요). 실제 테스트를 시작하기 전에:

1. `ASSIGN_COUNTER_KEY`를 새 값으로 바꿔 카운터를 0으로 되돌리고 배포해요. 분석은 그 배포의 `build` 값부터 해요.
2. `/?tester=1&version=B`로 B안을 확인해요(이벤트는 콘솔에만 찍혀요).

B안에만 있는 이벤트·속성:
- `ab_snackbar_clicked`: 오류 스낵바의 [바로가기]를 눌렀을 때 (`page`, `error_count`)
- `ab_end_close_clicked`: 제출 완료 화면의 [창 닫기]를 눌렀을 때
- `ab_max_selection_exceeded`에 `blocked: true`: B안은 개수가 다 차면 나머지 보기가 비활성이라 더 고를 수 없어요. 비활성 보기를 누른 순간을 A안의 '초과 선택'과 같은 이벤트로 남겨요.
- B안에는 '개수 초과' 오류(`kind: max`)가 없어요.

## 문항 번호

왈라 문항 순서대로 번호를 붙였어요.

| 번호 | 페이지 | 내용 |
|---|---|---|
| 1 | 인트로 | 설명 |
| 2~4 | 1 | 2 라디오, 3 체크박스(최소 3·최대 3), 4 라디오 |
| 5~8 | 2 | 5·6 라디오, 7 체크박스(정확히 3), 8 숫자 |
| 9~12 | 3 | 9·11 라디오, 10 체크박스(정확히 2), 12 짧은 글(10자 이내) |
| 13~16 | 4 | 13·14 라디오, 15 체크박스(정확히 2), 16 짧은 글(선택, 20자 이내) |
| 17-1~17-6 | 5 | 경험 평가: 17-1 설명, 17-2 남은 분량 인지(진행도), 17-3 오류 안내 본 적, 17-4 단일/복수 헷갈림, 17-5 화면 편의성(1~5, 필수), 17-6 불편한 점(선택) |
| 18-1~18-5 | 6 | 인터뷰 모집: 18-2 참여 여부 → 참여하면 18-3 동의 → 동의하면 18-4 연락처, 18-5 시간대 |

## 왈라 오류 알림 (A안에 그대로 구현)

| 상황 | 알림 문구 | 뜨는 시점 | `kind` |
|---|---|---|---|
| 라디오·체크박스 미선택 | 최소 1개 옵션을 선택해주세요. | 다음을 눌렀을 때 | `required` |
| 숫자·글 미입력 | 이 문항을 채워주세요. | 다음을 눌렀을 때 | `required` |
| 3번: 3개보다 적게 선택 | 최소 선택 항목을 충족하지 않습니다. | 다음을 눌렀을 때 | `min` |
| 3번: 3개보다 많이 선택 | 최대 선택 항목을 초과했습니다. | **고르는 즉시** | `max` |
| 7·10·15번: 정해진 개수보다 적게 | 선택한 항목의 개수는 N개여야 합니다. | 다음을 눌렀을 때 | `min` |
| 7·10·15번: 정해진 개수보다 많이 | 선택한 항목의 개수는 N개여야 합니다. | **고르는 즉시** | `max` |
| 다음을 눌렀는데 막혔을 때 | 화면 위 토스트: "유효하지 않은 입력이 있습니다. / 문제가 있는 필드를 확인하세요" + [이동하기] | 다음을 눌렀을 때, 4초 | - |

- 다음을 한 번 누른 뒤에는 고치는 즉시 알림이 사라져요.
- 체크박스는 개수 제한을 넘겨도 선택 자체는 막지 않아요(A안 특징).
- 숫자 칸은 숫자만 입력돼요(`-`, 글자는 지워짐). 짧은 글은 최대 글자 수에서 더 입력되지 않아요. 12번 안내 문구는 "2~10자"지만 실제로는 1자도 통과해요(원본 그대로).
- 0개 선택은 개수 알림 대신 `required`로 기록해요.

## 이벤트

공통 속성: `survey_version`(divorce_1), `version`, `response_id`, `task_guide`(hidden), `assign_method`, `build`

| 이벤트 | 언제 | 주요 속성 |
|---|---|---|
| `ab_assigned` | 시작 화면에서 버전이 정해졌을 때 | `is_returning` |
| `ab_version_started` | 인트로에서 다음을 눌러 설문 화면이 열릴 때 | - |
| `ab_question_viewed` | 문항이 화면에 50% 이상 처음 보였을 때 | `question`, `section`(main/experience/interview) |
| `ab_question_answered` | 문항에 처음 답했을 때 | `question`, `section`, `seconds_since_start`, (17-2만) `answer`, `answer_label` |
| `ab_page_completed` | 페이지를 통과했을 때 | `page` |
| `ab_error_shown` | 다음을 눌렀는데 막혔을 때, 문항마다 | `kind`, `question`, 체크박스면 `selected_count`, `min_required`, `max_allowed` |
| `ab_error_resolved` | 보이던 오류 알림이 사라졌을 때 | `kind`, `question`, `seconds_to_fix` |
| `ab_max_selection_exceeded` | 개수 제한을 넘겨 골랐을 때 | `question`, `selected_count`, `max_allowed` |
| `ab_main_completed` | 1~16번을 끝내고 경험 평가로 넘어갈 때 | `seconds`, `error_events`, `q{n}_selected_count`, `q{n}_deselect_count`, `deselect_total` |
| `ab_response_submitted` | 제출 버튼을 누를 때 | `seconds_total`, `seconds_main`, `error_events_main`, `exp_17_2`·`exp_17_2_label`, `exp_17_3`·`_label`, `exp_17_4`·`_label`, `ease_score`(17-5), `reason`(17-6), `interview_join` |
| `ab_exit` | 응답 도중 화면을 떠날 때(sendBeacon) | `last_question_viewed`, `last_question_answered`, `section`, `page`, `seconds_since_start` |

- 인터뷰 연락처(18-4)는 **PostHog에 보내지 않아요.** 응답 원본은 `/api/submit`으로 Redis(`divorce_1:responses`)에만 저장돼요.
- 세션 기록과 히트맵이 켜져 있어요(모든 응답자 기록, `capture_heatmaps: true`). 문항·보기 글자는 기록에 보이고, 참가자가 입력한 칸(숫자·짧은 글·서술형·연락처)은 가려져요(`session_recording.maskAllInputs: true`).
- distinct_id는 SDK가 기기마다 자동으로 만들어요(`identify()`를 부르지 않음).
