# 클라캘 (Clacale) - 클라이머 전용 캘린더

React(Vite) + Tailwind CSS v4 + lucide-react + react-router-dom 으로 만든 모바일 우선 캘린더 웹앱입니다.

## 실행 / 배포
```bash
npm install
npm run dev      # 개발 서버
npm run build    # dist/ 생성 (Vercel: Framework Preset = Vite, Output = dist)
```
- `vercel.json` 의 rewrite 가 BrowserRouter 새로고침(`/board`, `/mypage`) 404 를 막습니다.
- `public/manifest.json` + 아이콘으로 홈 화면 추가(PWA 설치)를 지원합니다. 서비스 워커(오프라인)는 없습니다.

## 폴더 구조
개발 규칙은 `CLAUDE.md` 참고 (색은 토큰만, 공통 UI 컴포넌트만, `@/` import, 상수는 `constants/`).
```
src/
  main.jsx                  진입점 (styles/tokens.css → global.css 를 최상단에서 import)
  App.jsx / App.css         전역 상태 허브 + 라우팅 + 하단 탭바 (세션 없으면 <Login />)
  styles/
    tokens.css              디자인 토큰: Brand / Semantic / Neutral / Radius / Shadow / Z-index
                            (--color-primary 하나만 바꾸면 hover·active·soft 까지 앱 전체에 반영)
    global.css              box-sizing, 기본 폰트, PWA safe-area
  components/ui/            공통 UI: Button, Input, Label, Field, Container, Sheet(+Header/Body), Dialog, index.js (각 .css)
  components/               AddSheet(일정 추가·장소/일시 선택), DetailSheet(상세·삭제, CrowdBadge)
  pages/                    Calendar (/), Board (/board), MyPage (/mypage), Login   (각 .css)
  constants/                brands, gyms, schedule, passes, crowd, board, nav
  lib/                      dates, events, crowd, passes, seed, store, auth(스텁)
```

## 알아둘 점
- `pages/*` 와 `App.jsx` 는 `components/` 와 `lib/` 를 가져다 쓰고, `components/` 와 `lib/` 는 서로 순환 참조하지 않습니다.
- 스타일은 `styles/tokens.css` 토큰 + 컴포넌트별 `.css` 로 관리합니다(인라인 style 은 `--brand` 같은 동적 값 전달에만 사용). Tailwind 는 `global.css` 에서 import 만 유지합니다.
- 마이페이지는 `/mypage` 라우트에서 전체 화면 시트로 열리고, 닫으면 `/` 로 돌아갑니다.
- 로그인(카카오/구글/이메일)은 `lib/auth.js` 의 데모 스텁입니다. Supabase 연동 시 `supabase.auth.*` 로 교체하세요.
- 일정·즐겨찾기·이용권·게시글은 현재 localStorage 에 저장됩니다. DB 연동 시 `supabase/schema.sql` 을 사용하세요.
- 혼잡도의 다른 사용자 방문자 수는 예시 집계값입니다. 실제로는 `gym_daily_stats` 에 모든 사용자의 일정을 집계해야 합니다.
