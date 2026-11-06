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
```
src/
  main.jsx                  진입점
  App.jsx                   전역 상태 허브 + 라우팅 (session/events/passes/favs/customGyms, localStorage 동기화,
                            자정 갱신, 횟수권 자동 차감, 하단 네비게이션, 세션 없으면 <Login />)
  pages/
    Calendar.jsx            월간 달력 + 일자별 리스트 + FAB/오늘 버튼 + 메뉴/통계/로그인 유도 시트   (/)
    Board.jsx               자유게시판 (글 목록 + 글쓰기, localStorage)                              (/board)
    MyPage.jsx              프로필 · 내 이용권(기간권/횟수권, 정지, 1회 사용, 소진 아코디언) · 찜한 센터 · 커스텀 암장   (/mypage)
    Login.jsx               카카오 / Google / 이메일 / 비회원
  components/
    Button.jsx              앱 전용 버튼 + BUTTON_CSS
    Sheet.jsx               공통 슬라이드업 시트 (+ topBar, titleStyle)
    AddSheet.jsx            일정 추가 (+ WhenPicker, HeartBtn, Row, fieldStyle)
    DetailSheet.jsx         일정 상세 · 삭제 범위/확인 팝업 (+ CrowdBadge, Info, SCOPES, dlgBack, dlgCard)
    common/                 Tailwind 기반 범용 컴포넌트: Button, Modal(+ModalHeader), Popup, Input(+Field), Chip, Badge, cn
  lib/
    constants.js            색/폰트/브랜드(가나다 정렬)/요일/반복·알림 옵션          (의존성 없음)
    dates.js                날짜 유틸, 12시간제 표기, 기본 시작시간, 시/분 옵션, 오늘 키(refreshTodayKey)
    events.js               반복 일정 펼치기 (occursOn / occurrence)
    crowd.js                혼잡도 (time_slot 중간값, 3단계 신호등)
    passes.js               이용권 상태/정지/차감 로직 (settleCountPasses 등)
    seed.js                 샘플 일정 + 만료 이용권 목업 5건
    store.js                localStorage (막히면 메모리로 대체)
    auth.js                 인증 스텁 (Supabase 연동 지점)
  constants/gyms.js         공식 암장/지점 정적 데이터 (DB 연동용)
  examples/                 공통 컴포넌트(common/) + 상수 분리 방식 예시 (초기 버전 앱)
supabase/
  schema.sql, mock_passes.sql
```

## 알아둘 점
- `pages/*` 와 `App.jsx` 는 `components/` 와 `lib/` 를 가져다 쓰고, `components/` 와 `lib/` 는 서로 순환 참조하지 않습니다.
- `components/*.jsx`(앱 전용)는 스타일을 inline style 로 지정하고, `components/common/`(범용)은 Tailwind 클래스를 씁니다. 아직 앱 전용 컴포넌트가 common 을 쓰지는 않습니다.
- 마이페이지는 `/mypage` 라우트에서 전체 화면 시트로 열리고, 닫으면 `/` 로 돌아갑니다.
- 로그인(카카오/구글/이메일)은 `lib/auth.js` 의 데모 스텁입니다. Supabase 연동 시 `supabase.auth.*` 로 교체하세요.
- 일정·즐겨찾기·이용권·게시글은 현재 localStorage 에 저장됩니다. DB 연동 시 `supabase/schema.sql` 을 사용하세요.
- 혼잡도의 다른 사용자 방문자 수는 예시 집계값입니다. 실제로는 `gym_daily_stats` 에 모든 사용자의 일정을 집계해야 합니다.
