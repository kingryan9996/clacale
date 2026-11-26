import "@/styles/reset.css"; // 기본 리셋 (Tailwind 대신)
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css"; // 글꼴: npm 패키지로 자체 호스팅 (외부 CDN 없음)
import "@/styles/tokens.css";
import "@/styles/theme-dark.css";
import "@/styles/global.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "@/App";
import ErrorBoundary from "@/components/ErrorBoundary";
import { migrateStorage } from "@/lib/migrate";
import { initPWA } from "@/lib/pwa";
import { applyPreviewTheme } from "@/lib/theme";

migrateStorage(); // 저장 데이터 형식 버전 확인/변환 (화면이 데이터를 읽기 전에)
applyPreviewTheme();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);

if (import.meta.env.PROD) initPWA(); // 오프라인 지원 + 새 버전 알림 (개발 서버에서는 끔)
