/* 다크 테마 미리보기: 주소에 ?theme=dark 를 붙이면 다크로 표시.
   파라미터가 없으면 아무것도 하지 않으므로 기본(라이트, 라임)은 그대로입니다. 정식 도입은 P1. */
const PREVIEW_THEMES = ["dark"];

export function applyPreviewTheme() {
  const t = new URLSearchParams(window.location.search).get("theme");
  if (PREVIEW_THEMES.includes(t)) document.documentElement.dataset.theme = t;
}
