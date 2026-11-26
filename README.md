# 클라캘 (Clacale) - 클라이머 전용 캘린더

React 19 + Vite + lucide-react + react-router-dom 으로 만든 모바일 우선 캘린더 웹앱입니다. 암장 방문 일정과 이용권을 한곳에서 관리합니다.

## 실행 / 배포
```bash
npm install
npm run dev      # 개발 서버
npm run build    # dist/ 생성 (Vercel: Framework Preset = Vite, Output = dist)
npm test         # 단위 테스트(Vitest)
npm run lint     # ESLint (오류만 CI 실패)
```
- GitHub `main` 에 올리면 Vercel 이 자동 배포하고, GitHub Actions(`.github/workflows/ci.yml`)가 린트 · 테스트 · 빌드를 확인합니다.
- `vercel.json` 의 rewrite 가 새로고침(`/board`, `/mypage`, `/privacy`) 404 를 막고, `sw.js`/`manifest.json` 은 캐시하지 않도록 헤더를 지정합니다.
- PWA: 홈 화면 설치 + 오프라인 실행(`public/sw.js`). 새 버전이 나오면 화면 아래에 "업데이트" 배너가 뜹니다. 서비스 워커는 운영 빌드에서만 켜집니다.

## 폴더 구조
개발 규칙은 `CLAUDE.md` 참고 (색은 토큰만, 공통 UI 컴포넌트만, `@/` import, 상수는 `constants/`).
```
src/
  main.jsx                  진입점 (리셋 → 글꼴 → 토큰 → 전역 CSS, 에러 바운더리, PWA 등록)
  App.jsx / App.css         라우터 → 세션 → 공개 문서 / 로그인 / 계정 앱(상태 허브 + 라우트 + 탭바)
  styles/                   reset(기본 리셋), tokens(디자인 토큰), theme-dark(다크), global
  components/ui/            공통 UI: Button, Input, Label, Field, Container, Sheet, ConfirmSheet
  components/               AddSheet, DetailSheet, PassSheet, CollectionSheet, AdSlot, UpdateBanner, ErrorBoundary, LegalLinks
  pages/                    Calendar(/), Board(/board), MyPage(/mypage), Login, Legal(/privacy, /terms)
  constants/                brands, gyms, schedule, passes, crowd, board, nav, ads, backup, pwa, errors, legal
  lib/                      dates, events, passes, crowd, quickAdd, backup, migrate, id, legal, store, sync(+useSync), auth/authCore/supabase + *.test.js
public/                     sw.js, manifest.json, 아이콘
supabase/                   schema.sql (서버 DB 핵심 테이블), crowd.sql (혼잡도 집계, 나중에 실행)
vite.sw-plugin.js           빌드 때 sw.js 에 빌드 번호를 넣어 "새 버전"을 감지하게 함
```

## 알아둘 점
- 비회원의 일정·이용권·즐겨찾기와 게시글은 이 기기의 localStorage 에만 저장됩니다(회원 데이터는 서버와 동기화). 앱은 샘플 없이 빈 상태로 시작합니다. 마이페이지의 '내보내기/가져오기'로 백업할 수 있고, 저장 형식은 `constants/backup.js` 의 `SCHEMA_VERSION` 으로 관리됩니다.
- 로그인(이메일/카카오/Google)은 Supabase 인증입니다. `.env` 의 `VITE_SUPABASE_URL`·`VITE_SUPABASE_ANON_KEY`(`.env.example` 참고; Vercel 에서는 Environment Variables)가 있으면 실제 서버로, 없으면 데모 계정으로 동작합니다. 서버 준비: `supabase/schema.sql` 실행 → Authentication > URL Configuration 에 사이트 주소 등록 → (소셜) Providers 설정. 회원의 일정·이용권·찜은 이 기기에 저장되면서 서버(Supabase)와 자동으로 맞춰집니다(`lib/sync.js`). 비회원 데이터는 기기에만 있습니다.
- 혼잡도는 서버 집계가 연결되기 전까지 "집계 준비 중"입니다. 연결할 때는 `lib/crowd.js` 의 `aggregateSource.get` 만 구현하면 됩니다.
- 개인정보처리방침/이용약관 본문은 `constants/legal.js` 입니다. 공개 전에 운영자·문의 이메일·시행일을 채우고 `draft` 를 끄세요.
- 광고는 기본 꺼져 있습니다(`constants/ads.js`).
