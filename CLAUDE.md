# 클라캘(Clacale) 개발 규칙

React 19 + Vite + react-router-dom 기반 모바일 우선 웹앱. 사용자에게 보이는 텍스트는 한국어.

## 필수 규칙

1. **색상 하드코딩 금지** — hex / rgb / rgba / hsl 값을 코드에 직접 쓰지 않는다. 색은 `src/styles/tokens.css`의 CSS 변수(`var(--color-*)`)만 사용한다.
   - 브랜드 색 변경은 `--color-primary` 하나만 수정한다. hover / active / soft / strong 은 자동 파생된다.
   - 허용 예외 (하드코딩이 아니라 *데이터*): `src/constants/brands.js`의 암장 브랜드 고유 색. 화면에서는 `style={{ "--brand": b.color }}` 로 CSS 변수에만 실어 보낸다.
2. **`<button>`, `<input>`, `<select>`, `<textarea>`에 직접 스타일을 입히지 않는다** — 항상 `@/components/ui`의 `Button`, `Input`, `Label`, `Field`, `Container`, `Sheet`, `ConfirmSheet`를 쓴다.
3. **variant / 상태가 없으면 먼저 `src/components/ui/`를 확장한다** — 페이지에서 인라인 `style`로 때우지 않는다.
   - 인라인 `style`은 *동적 데이터 값을 CSS 변수로 전달*할 때만 허용 (`style={{ "--brand": ..., "--ratio": ..., "--rows": ... }}`).
   - 페이지/컴포넌트 고유 레이아웃은 같은 이름의 `.css` 파일에 클래스로 둔다 (`pages/Calendar.css` 등, 클래스 접두사 `cal-`, `mp-` 처럼 구분).
4. **내부 import는 모두 `@/` 절대 경로** — `../`, `./` 상대 경로 금지 (CSS import 포함). `@` = `src/` (`vite.config.js`, `jsconfig.json`).
5. **도메인 상수는 `src/constants/`에 둔다** — 브랜드(`brands.js`), 암장(`gyms.js`), 일정 옵션(`schedule.js`), 이용권(`passes.js`), 혼잡도(`crowd.js`), 게시판(`board.js`), 내비게이션(`nav.js`). 컴포넌트/lib 파일 안에 목록·옵션 상수를 새로 정의하지 않는다.

## 모달/팝업 규칙

**앞으로 앱 내에 추가되는 모든 모달/팝업은 개별 페이지 뷰 전환이나 커스텀 오버레이를 만들지 말고, 반드시 공통 `Sheet` 컴포넌트(일정 추가 모달과 동일한 하단 슬라이드 업 애니메이션 및 풀 하이트 규격)를 사용할 것.**

- 닫기는 항상 헤더 좌측 `X` 버튼(`SheetHeader`의 `left`)으로 통일한다. `<` 뒤로가기 헤더는 한 시트 *안에서* 하위 단계를 오가는 경우(예: 일정 추가의 장소/일시 선택)에만 쓴다.
- 확인/삭제 확인 같은 짧은 팝업도 `ConfirmSheet`(= `Sheet`)로 띄운다. `position: fixed/absolute` 오버레이, `window.confirm` 등을 직접 만들지 않는다.

## 구조

```
src/
├─ main.jsx            # tokens.css → global.css 를 최상단에서 import
├─ App.jsx / App.css   # AuthProvider 루트, AccountApp(일정·이용권·찜 상태), 라우팅, 탭바
├─ context/            # AuthContext.jsx (AuthProvider, useAuth)
├─ styles/             # tokens.css(디자인 토큰), global.css(리셋·폰트·safe-area)
├─ components/ui/      # 공통 UI (Button, Input, Label, Field, Container, Sheet, ConfirmSheet) + index.js
├─ components/         # 도메인 컴포넌트 (AddSheet, DetailSheet)
├─ pages/              # Calendar, Board, MyPage, Login (+ 각 .css)
├─ constants/          # 정적 도메인 데이터
└─ lib/                # 순수 로직 (dates, events, crowd, passes, seed, store, auth, account)
```

## UI 컴포넌트 사용법

- `Button` — `variant`: primary | secondary | outline | ghost | danger | danger-solid | kakao | fab, `size`: sm | md | lg | icon | bare, `pill`, `fullWidth`, `disabled`. `bare`는 셀/행처럼 레이아웃을 직접 잡는 버튼용(패딩 0) — 레이아웃은 `className`으로.
- `Input` — `as`: input(기본) | textarea | select, `label`, `icon`, `error`. 라벨 없이 쓰면 컨트롤만 렌더.
- `Field` — 라벨 + 임의 컨트롤(칩 묶음 등) 폼 행. `Label` — 아이콘 포함 폼 라벨.
- `Container` — 모바일 폭 컨테이너 (`height`: screen | fill, `padded`, `center`).
- `Sheet` / `SheetHeader` / `SheetBody` — 하단 슬라이드업 풀 하이트 바텀시트(앱 모달 표준). 하단 버튼은 `<div className="ui-sheet__footer">`. `ConfirmSheet` — 확인/선택 팝업도 같은 Sheet 로 띄우는 래퍼(`actions={(close) => ...}`).
- ui CSS 선택자는 `:where()`로 감싸 specificity 0 이다. 페이지 클래스(`.cal__cell` 등)가 항상 덮어쓸 수 있다.
- `:hover` 스타일은 반드시 `@media (hover: hover)` 안에 둔다 (터치 기기 hover 잔상 방지).

## 인증 (`src/context/AuthContext.jsx`)

- `AuthProvider`가 전역 세션(`null | {type:"guest"} | {type:"user", id, provider, name}`)을 가지며, `App.jsx` 최상단이 `<AuthProvider>`로 감싸져 있다.
- `useAuth()`가 `{ session, uid, isGuest, signIn, signOut }`을 돌려준다. 페이지/컴포넌트는 세션·로그인·로그아웃을 **prop이나 로컬 상태로 따로 관리하지 않고 반드시 `useAuth()`로 참조**한다.
- 세션 저장(`clacale:session`)과 계정별 데이터 준비(게스트 데이터 이어받기, `lib/account.js`)는 `signIn` 안에서만 한다. 페이지에서 `store`로 세션을 직접 읽고 쓰지 않는다.
- 일정/이용권/찜/커스텀 암장 상태는 `App.jsx`의 `AccountApp`이 `uid`별로 보관한다(`key={uid}`로 계정 전환 시 재마운트).
- 실제 인증 호출은 `lib/auth.js`(스텁, Supabase 연동 예정)에만 둔다.

## 검증

샌드박스에서는 `npm run build`가 막혀 있어 esbuild 번들 + Playwright 로 확인했다. 로컬에서는 `npm install && npm run dev` / `npm run build`.

## 작업 결과 보고 형식

코드 수정 후 보고할 때는 변경된 부분만 간결하게 전달한다.

1. 수정/생성/삭제된 파일 경로 목록만 나열한다. 전체 파일 트리와 변경되지 않은 파일은 출력하지 않는다.
2. 파일별로 핵심 변경 사항을 1~2줄로 요약한다. 필요하면 변경된 코드 블록만 일부 발췌하고, 전체 파일 코드는 출력하지 않는다.
3. 전체 ZIP 재압축과 전체 폴더 재출력은 생략한다. (사용자가 요청할 때만 한다.)
