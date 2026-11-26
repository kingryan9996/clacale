# 클라캘(Clacale) 개발 규칙

React 19 + Vite + react-router-dom 기반 모바일 우선 웹앱. 사용자에게 보이는 텍스트는 한국어.

## 필수 규칙

1. **색상 하드코딩 금지** — hex / rgb / rgba / hsl 값을 코드에 직접 쓰지 않는다. 색은 `src/styles/tokens.css`의 CSS 변수(`var(--color-*)`)만 사용한다.
   - 브랜드는 Volt & Chalk(라임 `#C8F135`). 라임은 파생이 맞지 않아 `primary / hover / active / soft / strong / line / on-primary` 를 모두 명시하므로, 브랜드 색을 바꿀 땐 `tokens.css` 브랜드 블록 전체를 함께 수정한다.
   - 용도 구분: 면 배경 = `--color-primary`(위 글자는 `--color-on-primary`), 밝은 배경 위 글자 = `--color-primary-strong`, 테두리·막대·아이콘 = `--color-primary-line`. 라임 자체를 흰 배경 위 선/글자에 쓰지 않는다(대비 1.3:1).
   - 시그니처 요소(모두 토큰으로만 구현): 오늘/선택 날짜 = 홀드 모양 `--radius-hold`, 일정 칩 = 비스듬히 잘린 루트 테이프(왼쪽 브랜드색 막대), 페이지 배경 = 볼트홀 점 `background: var(--bg-wall)`(점 색은 `--color-bolt`). 새 페이지 배경은 `--color-bg` 대신 `--bg-wall`을 쓴다.
   - 다크 테마는 `theme-dark.css`(`?theme=dark` 미리보기). 새 색 토큰을 추가하면 다크 값도 함께 정의한다.
   - 허용 예외 (하드코딩이 아니라 *데이터*): `src/constants/brands.js`의 암장 브랜드 고유 색. 화면에서는 `style={{ "--brand": b.color }}` 로 CSS 변수에만 실어 보낸다.
2. **`<button>`, `<input>`, `<select>`, `<textarea>`에 직접 스타일을 입히지 않는다** — 항상 `@/components/ui`의 `Button`, `Input`, `Label`, `Field`, `Container`, `Sheet`, `ConfirmSheet`를 쓴다.
3. **variant / 상태가 없으면 먼저 `src/components/ui/`를 확장한다** — 페이지에서 인라인 `style`로 때우지 않는다.
   - 인라인 `style`은 *동적 데이터 값을 CSS 변수로 전달*할 때만 허용 (`style={{ "--brand": ..., "--ratio": ..., "--rows": ... }}`).
   - 페이지/컴포넌트 고유 레이아웃은 같은 이름의 `.css` 파일에 클래스로 둔다 (`pages/Calendar.css` 등, 클래스 접두사 `cal-`, `mp-` 처럼 구분).
4. **내부 import는 모두 `@/` 절대 경로** — `../`, `./` 상대 경로 금지 (CSS import 포함). `@` = `src/` (`vite.config.js`, `jsconfig.json`).
5-1. **데이터 규칙** — 새 데이터의 id는 `newId()`(`@/lib/id`, UUID)만 쓴다(`Date.now()` 금지). id끼리 비교·정렬은 `cmpId`/`byCreated`를 쓰고 `a.id - b.id`는 쓰지 않는다. 일정/이용권/암장/찜의 저장 모양을 바꾸면 `constants/backup.js`의 `SCHEMA_VERSION`을 올리고 `lib/migrate.js`에 변환을 추가한다(백업 가져오기도 같은 규칙을 쓴다). (출시 전에는 올리지 않는다 — 아래 "출시 전 호환 코드 금지")
5. **도메인 상수는 `src/constants/`에 둔다** — 브랜드(`brands.js`), 암장(`gyms.js`), 일정 옵션(`schedule.js`), 이용권(`passes.js`), 혼잡도(`crowd.js`), 게시판(`board.js`), 내비게이션(`nav.js`), 광고(`ads.js`), 백업/데이터 버전·백업 알림 주기(`backup.js`), 이용권 모아보기 문구(`collection.js`), PWA(`pwa.js`), 오류 문구(`errors.js`), 약관·정책 문서와 보관 기간(`legal.js`). 컴포넌트/lib 파일 안에 목록·옵션·문구 상수를 새로 정의하지 않는다.

## 광고(AdSlot) 규칙
- 광고는 `@/components/AdSlot`의 `<AdSlot placement="..." />`로만 넣고, 설정(켜기/끄기, 자리별 높이)은 `constants/ads.js`에서만 바꾼다. 기본 `mode: "off"`이며 `"preview"`는 자리만 점선으로 표시, `"live"`는 `client`와 자리의 `slot`이 모두 있어야 동작한다.
- **허용 자리**: 캘린더 일정 목록 맨 아래(`calendarList`), 마이페이지 섹션 사이(`mypage`), 게시판 글 5개마다(`board`).
- **금지 자리**: `Sheet`/`ConfirmSheet`(모달) 안, 우하단 (+)·하단 탭·저장/삭제 버튼 바로 옆, 첫 화면 맨 위. 새 자리를 만들려면 이 목록과 `constants/ads.js`에 함께 추가한다.
- 광고에는 항상 "광고" 라벨을 붙이고 높이를 고정해 레이아웃이 움직이지 않게 한다. 광고 스크립트는 `live`일 때만 불러온다.

## 모달/팝업 규칙

**앞으로 앱 내에 추가되는 모든 모달/팝업은 개별 페이지 뷰 전환이나 커스텀 오버레이를 만들지 말고, 반드시 공통 `Sheet` 컴포넌트(일정 추가 모달과 동일한 하단 슬라이드 업 애니메이션 및 풀 하이트 규격)를 사용할 것.**

- 닫기는 항상 헤더 좌측 `X` 버튼(`SheetHeader`의 `left`)으로 통일한다. `<` 뒤로가기 헤더는 한 시트 *안에서* 하위 단계를 오가는 경우(예: 일정 추가의 장소/일시 선택)에만 쓴다.
- 확인/삭제 확인 같은 짧은 팝업도 `ConfirmSheet`(= `Sheet`)로 띄운다. `position: fixed/absolute` 오버레이, `window.confirm` 등을 직접 만들지 않는다.

## 구조

```
src/
├─ main.jsx            # reset.css → 글꼴 → tokens.css → theme-dark.css → global.css, 에러 바운더리, PWA 등록
├─ App.jsx / App.css   # BrowserRouter → AuthProvider → PublicGate(/privacy·/terms 공개) → AuthGate → AccountApp(일정·이용권·찜 상태, 라우트, 탭바)
├─ context/            # AuthContext.jsx (AuthProvider, useAuth)
├─ styles/             # reset.css(기본 리셋), tokens.css(디자인 토큰), theme-dark.css(다크), global.css(폰트·safe-area·sr-only)
├─ components/ui/      # 공통 UI (Button, Input, Label, Field, Container, Sheet, ConfirmSheet) + index.js
├─ components/         # AddSheet(일정 추가/수정), DetailSheet, PassSheet(이용권 추가/수정), CollectionSheet(이용권 모아보기), AdSlot, UpdateBanner, ErrorBoundary, LegalLinks
├─ pages/              # Calendar(/), Board(/board), MyPage(/mypage), Login, Legal(/privacy·/terms)
├─ constants/          # 정적 도메인 데이터·문구 (위 5번 목록)
└─ lib/                # 순수 로직 + 각 .test.js (dates, events, passes, crowd, quickAdd, backup, migrate, id, legal, store, sync, auth, account, pwa, theme)
public/                # sw.js(서비스 워커), manifest.json, 아이콘
supabase/schema.sql    # 서버 DB 설계(P2에서 사용)
vite.sw-plugin.js      # 빌드 때 sw.js 에 빌드 번호 주입
```

### 라우트
- 공개(로그인 불필요): `/privacy`, `/terms` — `App.jsx`의 `PublicGate`. 새 공개 페이지는 `constants/legal.js`의 `LEGAL_PATHS` 처럼 여기에서 분기한다.
- 앱(로그인/비회원 필요): `/`, `/board`, `/mypage` — `AccountApp`의 `<Routes>` 안. 새 탭은 `constants/nav.js`의 `TABS` 에도 추가한다.

## UI 컴포넌트 사용법

- `Checkbox` — 체크박스(children = 라벨, 링크 포함 가능). 직접 `<input type="checkbox">` 를 쓰지 않는다.
- `Button` — `variant`: primary | secondary | outline | ghost | danger | danger-solid | kakao | fab, `size`: sm | md | lg | icon | bare, `pill`, `fullWidth`, `disabled`. `bare`는 셀/행처럼 레이아웃을 직접 잡는 버튼용(패딩 0) — 레이아웃은 `className`으로.
- `Input` — `as`: input(기본) | textarea | select, `label`, `icon`, `error`. 라벨 없이 쓰면 컨트롤만 렌더.
- `Field` — 라벨 + 임의 컨트롤(칩 묶음 등) 폼 행. `Label` — 아이콘 포함 폼 라벨.
- `Container` — 모바일 폭 컨테이너 (`height`: screen | fill, `padded`, `center`).
- `Sheet` / `SheetHeader` / `SheetBody` — 하단 슬라이드업 풀 하이트 바텀시트(앱 모달 표준). 하단 버튼은 `<div className="ui-sheet__footer">`. `ConfirmSheet` — 확인/선택 팝업도 같은 Sheet 로 띄우는 래퍼(`actions={(close) => ...}`).
- ui CSS 선택자는 `:where()`로 감싸 specificity 0 이다. 페이지 클래스(`.cal__cell` 등)가 항상 덮어쓸 수 있다.
- `:hover` 스타일은 반드시 `@media (hover: hover)` 안에 둔다 (터치 기기 hover 잔상 방지).

## 인증 (`src/context/AuthContext.jsx`)

- `AuthProvider`가 전역 세션(`null | {type:"guest"} | {type:"user", id, provider, name}`)을 가지며, `App.jsx` 에서 `<BrowserRouter>` 바로 안쪽이 `<AuthProvider>`다(라우터가 가장 바깥이라 로그인 화면에서도 `Link`/`useNavigate` 를 쓸 수 있다).
- `useAuth()`가 `{ session, uid, isGuest, ready, recovery, finishRecovery, signIn, signOut, deleteAccount }`을 돌려준다. 페이지/컴포넌트는 세션·로그인·로그아웃을 **prop이나 로컬 상태로 따로 관리하지 않고 반드시 `useAuth()`로 참조**한다.
- 세션 저장(`clacale:session`)과 계정별 데이터 준비(게스트 데이터 이어받기, `lib/account.js`)는 `signIn` 안에서만 한다. 페이지에서 `store`로 세션을 직접 읽고 쓰지 않는다.
- 일정/이용권/찜 상태는 `App.jsx`의 `AccountApp`이 `uid`별로 보관한다(`key={uid}`로 계정 전환 시 재마운트).
- 실제 인증: `lib/authCore.js`(순수 로직, 클라이언트 주입 — `makeAuth`/`demoAuth`/`authErrorText`/`sessionOf`) → `lib/supabase.js`(환경변수 `VITE_SUPABASE_URL`·`VITE_SUPABASE_ANON_KEY` 가 있을 때만 클라이언트 생성) → `lib/auth.js`(`auth` 싱글턴: 환경변수 있으면 Supabase, 없으면 데모 계정). 서버 호출은 이 파일들에만 둔다.
- Supabase 가 켜져 있으면 회원 세션은 Supabase 가 보관·갱신(`onAuthStateChange`)하고 앱은 비회원 세션만 `clacale:session` 에 저장한다. `ready`(저장된 로그인 확인 전엔 false → 로그인 화면이 번쩍이지 않게), `recovery`(비밀번호 재설정 링크로 들어옴 → `pages/ResetPassword.jsx`).
- 가입은 메일 인증을 켠 기본 설정을 전제로 `status: "confirm"` 안내를 보여 준다. 이미 가입된 이메일은 `identities` 가 빈 응답으로 오므로 `user_already_exists` 로 바꾼다. 서버 오류 문구는 `constants/auth.js` 의 `AUTH_ERRORS` 에서만 고친다.
- 회원 탈퇴는 `auth.deleteAccount()`(서버 `delete_my_account()` RPC) 성공 뒤에만 이 기기의 계정 데이터(`clearAccountData`)를 지운다. 서버 삭제가 실패하면 기기 데이터는 그대로 둔다.
- 서버 동기화(`lib/sync.js` 순수 로직 + `lib/useSync.js` 훅, `AccountApp` 에서 회원일 때만): 화면의 기준은 기기 저장소, 서버는 같은 계정의 다른 기기와 맞추는 곳. 마지막으로 맞춘 시점의 사본(`clacale:sync:${uid}` = id → 내용 해시)을 기준으로 3-way 병합 — 이 기기에서 바꾼 항목은 올리고(양쪽이 바꿨으면 이 기기 우선), 바꾸지 않은 항목은 서버 내용으로 갱신하며, 서버에서 사라진 항목(다른 기기에서 삭제·보관 기간 정리)은 이 기기에서도 지운다. 찜은 집합 병합. 행 변환(`eventRow`/`passRow` 등)은 서버 check 제약 범위로 값을 맞추고, 제약에 맞지 않는 이용권은 올리지 않고 개수를 알린다. UUID 가 아닌 id 는 올리기 전에 `uuidize` 가 바꾼다(차감 내역 포함). 실행 시점: 시작·기기에서 바꾼 뒤 1.5초·앱 복귀(30초 간격)·온라인 복귀. 실패하면 기기 저장은 그대로 두고 오류 표시 + 다음에 재시도. 서버 테이블/컬럼을 바꾸면 `eventRow`/`rowEvent`/`passRow`/`rowPass` 와 `sync.test.js` 를 함께 고친다.
- 로그인 직후 동의 기록이 기기에 있으면 `consents` 에 서버 기록(이미 있으면 그대로).
- 테스트: `lib/authCore.test.js`(가짜 클라이언트). 화면 흐름은 `@supabase/supabase-js` 를 가짜로 바꿔 빌드해 확인한다.

## PWA(오프라인/새 버전) 규칙

- `public/sw.js`의 `__BUILD_ID__`는 빌드할 때 `vite.sw-plugin.js`가 자동으로 바꾼다. **직접 값을 넣지 않는다.** 값이 빌드마다 달라야 "새 버전"이 감지된다.
- 화면(HTML)은 네트워크 우선(3초 제한) → 오프라인이면 설치 때 저장한 화면. 해시 파일(`/assets/*`)은 저장본 우선.
- 새 버전은 자동 적용하지 않고 `UpdateBanner`의 [업데이트]를 눌렀을 때만 적용한다(입력 중 데이터 보호). 서비스 워커 등록은 `import.meta.env.PROD`에서만 한다.
- `sw.js`를 고칠 때: 외부 도메인 요청은 가로채지 않는다(광고·서버 통신 보호). `fetch` 핸들러에서 POST 등 GET 이외는 건드리지 않는다.
- `vercel.json`의 `sw.js`/`manifest.json` 캐시 헤더(`max-age=0`)는 지우지 않는다. 지우면 새 버전이 늦게 감지된다.

## 품질 도구 (테스트/린트/CI)

- `npm test`(Vitest): `src/lib/*.test.js` 에 순수 로직 테스트. **`lib/` 에 계산·변환 로직을 새로 만들거나 고치면 같은 폴더에 테스트를 함께 추가/수정한다.** 날짜는 `new Date()` 현재 시각에 의존하지 않도록 고정 문자열로 넣는다.
- `npm run lint`(ESLint): 진짜 버그(`no-undef`, 훅 규칙 위반 등)만 error, 나머지는 warn. CI는 error 일 때만 실패한다.
- `.github/workflows/ci.yml`: main 푸시마다 린트 → 테스트 → 빌드(+서비스 워커 빌드 번호 확인). 실패하면 GitHub 저장소의 Actions 탭에서 원인을 본다.
- 화면 렌더 오류는 `ErrorBoundary`가 잡는다(앱 전체 + 페이지 단위). 새 페이지는 `AccountApp`의 `PageBoundary` 안(`<Routes>`)에 두면 자동 보호된다.

## 접근성/스타일 기반 규칙

- Tailwind 는 쓰지 않는다. 기본 리셋은 `styles/reset.css`(`@layer base`) — 새 규칙을 여기에 추가하지 말고 컴포넌트/토큰 CSS 에서 직접 지정한다.
- 글자색은 `--color-text`(본문) / `--color-text-muted` / `--color-text-subtle` 까지만 읽어야 하는 글자에 쓴다(모두 AA 4.5:1 이상). `--color-text-faint` 는 아이콘·자리표시자·장식 전용이며 읽어야 하는 글자에 쓰지 않는다.
- 아이콘만 있는 버튼에는 반드시 `aria-label`. 클릭 요소는 `div/span` 대신 `Button`(또는 `Link`).
- 시트: 확인/선택 팝업은 `ConfirmSheet`(`size="auto"`, 내용 높이), 입력/상세 화면은 `Sheet`(기본 전체 높이). `Sheet` 가 열기 시 포커스 이동 · Esc 닫기 · Tab 순환 · 닫힌 뒤 포커스 복귀를 처리하므로 시트 안에서 따로 만들지 않는다.
- 페이지마다 `h1` 하나(화면에 보이지 않으면 `className="sr-only"`).
- 터치 영역은 가로·세로 40px 이상을 목표로 한다.

## 약관/정책 문서 규칙

- 개인정보처리방침·이용약관 본문은 `constants/legal.js`의 `LEGAL_DOCS` 에서만 고친다. 문단은 문자열, `"## "`로 시작하면 소제목, 배열은 목록, `{{operator}}` 같은 자리표시자는 `LEGAL_META` 값으로 채워진다.
- **데이터를 새로 수집·저장하거나 보관 규칙·제3자 서비스(결제, 분석, 광고, 푸시 등)를 바꾸면 같은 작업에서 방침도 함께 고친다.** 보관 기간 숫자는 `RETENTION` 만 쓰고, 서버 정리 작업(P2)도 이 값을 따른다.
- 방침의 숫자(20명 미만, 3시간 구간)는 `constants/crowd.js` 에서 가져오므로 직접 적지 않는다. `lib/legal.test.js` 가 문서와 상수가 어긋나면 실패한다.
- 공개 전 `LEGAL_META`(운영자, 문의 이메일, 시행일, 서버 위치)를 채우고 `draft: false` 로 바꾼다. 비어 있으면 화면에 "입력 필요"가 보인다.
- 앱은 법률 자문이 아니다. 정식 공개·광고 신청 전에 내용을 한 번 더 확인한다.

## 제품 결정 기록 (바꾸려면 사용자와 먼저 상의)

- **"내가 등록한 암장"(커스텀 암장) 기능은 삭제(확정)**: 쓰는 사람이 거의 없어 유지 비용이 더 크다. 다시 만들지 말 것.
- **출시 전 호환 코드 금지(확정)**: 앱은 아직 출시 전이고 사용자가 없다. 옛 형식 변환·옛 필드 대응·삭제된 기능의 흔적을 남기지 않는다. 저장 형식은 개발 중 자유롭게 바꾸고, 출시 후부터 `SCHEMA_VERSION` 을 올리며 변환을 추가한다.
- **최종 청사진 기준 구현(확정)**: 정식 홍보 전까지 사용자는 개발자 1명이다. 베타 사용자를 위한 임시 안내·숨김·"준비 중" 표시는 만들지 않는다. 아직 동작하지 않는 기능(예: 일정 알림 푸시)의 입력 칸은 그대로 두고, 최종 구조에 맞춰 이어서 구현한다.
- **포지셔닝**: 클라이머 개인용 방문 일정/이용권 캘린더. 암장 운영자용 기능은 만들지 않는다.
- **혼잡도**: 클라캘 이용자의 일정만 집계한 "방문 예정 인원"(베타). 문구 "클라캘 유저 기준 집계 · 실제 혼잡도와 다를 수 있어요", 20명 미만은 "20명 미만", 3시간 구간. 서버 집계 전에는 "집계 준비 중".
- **서버 보관(P2)**: 일정은 지난 3개월 + 앞으로의 전부. 이용권 요약(브랜드·종류·기간·정지 이력·사용 횟수)은 사용자가 삭제/탈퇴할 때까지 보관하고, 끝난 지 1년이 지나면 차감 내역 같은 세부 기록만 지운다(비용은 이용권이 아니라 일정에서 나오므로). 앱(기기)에는 자동 삭제가 없다 — "끝난 이용권 모아보기"를 위해 사용자가 지울 때까지 남긴다. 탈퇴 시 즉시 삭제. 값은 `constants/legal.js` 의 `RETENTION`.
- **서버 DB 구조(확정, `supabase/schema.sql` — 실제 PostgreSQL 16 에서 실행·RLS·정리 함수를 검증함)**: 앱 데이터와 1:1. 일정은 반복 규칙 한 행(`repeat_kind`·`until_on`·`except_on`)이고 시각은 한국 시각 그대로 `timestamp`. 이용권은 한 행에 정지 이력 `pauses`(jsonb 배열)와 차감 내역 `used_keys`(text[])를 담는다(정지 테이블·서버 차감 함수 없음 — 차감은 앱의 `settleCountPasses` 가 하고 결과를 동기화). id 는 앱이 만든 UUID 를 그대로 upsert. 모든 테이블 RLS "내 행만". 회원 탈퇴는 `delete_my_account()`(즉시 삭제, cascade). 보관 정리는 `prune_old_data()`(지난 일정 3개월, 끝난 지 1년 지난 이용권의 차감 내역). 혼잡도는 `supabase/crowd.sql` 로 분리: 클라이언트가 숫자를 못 바꾸고 서버가 일정 전체에서 다시 계산(`rebuild_gym_stats`), 조회는 `get_gym_crowd`(20명 미만은 서버에서 0 으로 가림).
- **이용권 자유도(확정)**: 이용권은 언제든 만들고·고치고·지울 수 있다. 프리셋(1개월, 10회 등)은 빠른 입력일 뿐 숫자를 직접 입력할 수 있다. 같은 종류 이용중 이용권이 있어도 등록은 막지 않고 안내만 한다. 정지는 횟수·일수 제한 없이 이력으로 쌓고 지난 정지도 등록할 수 있다(`PAUSE_DEFAULT_DAYS`(15일)는 새 정지 칸의 기본값일 뿐).
- **만료일 규칙(확정)**: 기간권 만료일 = 시작일 + 기간 − 1 + 정지 일수 합계 + 추가 일수(`bonusDays`, 음수 가능). 정지 일수는 항상 더해지며 끄는 옵션이 없다. 만료일(`expires`)은 저장된 파생값이고, 이용권을 바꿀 때마다 `withExpires` 로 다시 계산한다.
- **횟수 차감 규칙(확정)**: 일정을 등록해도 바로 차감하지 않고, 그 일정 날짜가 지난 다음 날 1회 차감한다. 남은 횟수를 직접 고치면 즉시 반영되고, 그 값은 "수정한 순간의 실제 남은 횟수"다. 이때 `countedFrom`(수정 시각)을 기록해 그 시각 이후 시작하는 일정만 자동 차감한다(이미 입력한 숫자에 포함된 운동이 일정으로도 있어 이중 차감되는 것을 막음). 규칙은 `lib/passes.js` 의 `finishCountEdit` / `settleCountPasses`.
- **연령/동의**: 만 14세 이상 대상(`constants/consent.js` 의 `AGE_MIN`). 가입 화면(이메일 가입 폼, 카카오/Google 첫 로그인 시트)에서 연령 확인 + 이용약관·개인정보처리방침 동의 체크를 받고 `lib/consent.js` 로 동의 일시·문서 버전을 기록한다. 방침/약관을 고쳐 다시 동의받아야 하면 `CONSENT_VERSION` 을 올린다. 실제 인증(P2)을 붙일 때도 이 체크를 거쳐야 하고, 동의 기록은 서버에도 저장한다.
- **인프라**: Vercel + Supabase 무료 플랜. 광고는 기본 꺼짐(`ADS.mode: "off"`); AdSense 신청 전제 = 도메인 + 공개 개인정보처리방침 + `ads.txt` + client/slot ID.
- **도메인**: 구매 → Vercel 연결 → 정상 확인 뒤에만 기존 `clacale.vercel.app` 을 새 주소로 리디렉션. 주소가 바뀌면 localStorage 데이터가 따라가지 않으므로 마이페이지 '내보내기/가져오기'로 옮기도록 안내한다.

## 공개 전 체크리스트

1. GitHub Actions(CI) 초록: 린트 · 테스트 · 빌드(+서비스 워커 빌드 번호).
2. Vercel 배포 로그에서 Pretendard 경로 오류 없음, 배포된 화면의 글꼴 확인.
3. 브라우저 개발자도구 → Application → Service Workers 가 activated, 재배포 후 "새 버전" 배너 확인.
4. `LEGAL_META` 채우기 + `draft: false`, `/privacy` · `/terms` 확인.
5. 도메인 연결·확인 후 리디렉션, `index.html`/`manifest.json` 주소 점검.
6. 광고를 켜기 전: 방침의 광고 항목 확인, `ADS` 설정, `ads.txt`.

## 로드맵 상태

- 완료(P0-1~14 + 자유도 보강): 색/시그니처, Pretendard, 혼잡도 재정의, 데이터 안전(버전·UUID·백업), 목록 보기·빠른 추가·날짜로 추가, 광고 자리, PWA, 품질 도구(테스트·린트·CI·에러 바운더리), Tailwind 제거·접근성, 약관/방침, 문서 정리, 이용권 자유도 보강(PassSheet·정지 이력·횟수 직접 수정·일정 수정).
- 완료: 이용권 모아보기(연도별 요약·암장별·기록 목록, `lib/collection.js`), 백업 알림(비회원 전용 · 30일 · 7일 미루기 · 탭 점, `lib/backupReminder.js`). 회원은 서버 동기화(P2)가 생기면 데이터가 서버에 있으므로 알리지 않는다.
- 완료: P2 1단계 — Supabase 인증(이메일 가입·인증 메일·로그인·비밀번호 재설정, 카카오/Google, 로그아웃, 회원 탈퇴, 서버 동의 기록). 환경변수가 없으면 데모 계정으로 동작.
- 완료: P2 2단계 — 서버 동기화(일정·이용권·찜 ↔ Supabase, `lib/sync.js` + `lib/useSync.js`). 앱은 샘플 데이터 없이 빈 상태로 시작한다(`lib/seed.js` 삭제).
- 다음: P0-15 도메인 구매·연결(코드 아님), 자유게시판 서버화 + 앱 내 알림, 혼잡도(`crowd.sql` + `aggregateSource`)는 마지막.
- P1: 이용권 인사이트, 월간 리포트/공유 이미지, 암장 정보 카드, 체크인, 일정 복제, 링크 기반 크루 공유, 다크 모드 정식 도입, 검색.
- P2: Supabase 로그인(카카오/Google)·동기화, 혼잡도 서버 집계, 크루, 서버 게시판, 웹 푸시, 암장 세팅 캘린더.

## 검증

샌드박스에서는 `npm run build`가 막혀 있어 esbuild 번들 + Playwright 로 확인했다. 로컬에서는 `npm install && npm run dev` / `npm run build`.

## 작업 결과 보고 형식

코드 수정 후 보고할 때는 변경된 부분만 간결하게 전달한다.

1. 수정/생성/삭제된 파일 경로 목록만 나열한다. 전체 파일 트리와 변경되지 않은 파일은 출력하지 않는다.
2. 파일별로 핵심 변경 사항을 1~2줄로 요약한다. 필요하면 변경된 코드 블록만 일부 발췌하고, 전체 파일 코드는 출력하지 않는다.
3. 전체 ZIP 재압축과 전체 폴더 재출력은 생략한다. (사용자가 요청할 때만 한다.)
