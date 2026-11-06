/* =====================================================================
   공통 Button (이 파일 안에 포함 · 외부 import 없음)
   - 아티팩트 미리보기는 Tailwind 임의값 클래스(bg-[#...], text-[13px] 등)를
     지원하지 않으므로, 색/크기 같은 핵심 스타일은 inline style로 지정합니다.
   - variant: primary | secondary | outline | ghost | floating | danger
   - size: sm | md | lg | icon (+ none: 패딩 없음)
   - onClick, disabled, aria-label, type 등 기본 button 속성은 그대로 전달됩니다.
   ===================================================================== */
export const ACCENT = "#F26B21";

export const INK = "#171717";

/* ---------- 데이터 (지점 목록은 실제 운영 정보에 맞게 수정하세요) ---------- */
const BRAND_DATA = [
  { id: "climb", name: "더클라임", color: "#F26B21", branches: ["성수", "문래", "강남", "양재", "논현", "연남", "이수", "사당", "신림", "마곡", "일산"] },
  { id: "son", name: "손상원 클라이밍짐", color: "#2F6FED", branches: ["강남", "을지로", "판교"] },
  { id: "park", name: "클라이밍파크", color: "#E11D48", branches: ["강남", "종로", "신논현"] },
  { id: "forest", name: "서울숲 클라이밍", color: "#1F9D6B", branches: ["구로", "영등포", "종로", "잠실"] },
  { id: "ficus", name: "피커스", color: "#CA8A04", branches: ["종로", "구로", "신촌"] },
  { id: "sbd", name: "서울볼더스", color: "#7C3AED", branches: ["선유", "목동"] },
  { id: "damjang", name: "담장 클라이밍", color: "#6D4C41", branches: ["신촌", "을지로"] },
  { id: "cracker", name: "크래커클라이밍", color: "#DB2777", branches: [] },
  { id: "alle", name: "알레클라임", color: "#0E8FA8", branches: ["강동", "혜화"] },
  { id: "stones", name: "스톤즈클라이밍", color: "#475569", branches: [] },
  { id: "boulderlife", name: "볼더생활", color: "#65A30D", branches: [] },
];

// 브랜드와 지점을 가나다순으로 정렬
export const ko = (a, b) => a.localeCompare(b, "ko");

export const BRANDS = BRAND_DATA.map((b) => ({ ...b, branches: [...b.branches].sort(ko) })).sort((a, b) => ko(a.name, b.name));

export const CUSTOM = { id: "custom", name: "내 암장", color: "#64748B", branches: [] }; // 마이페이지에서 등록한 커스텀 암장

export const brandOf = (id) => (id === "custom" ? CUSTOM : BRANDS.find((b) => b.id === id) ?? BRANDS[0]);

export const TRAVEL = [0, 15, 30, 45, 60, 90];

export const DOW = ["일", "월", "화", "수", "목", "금", "토"];

export const dowColor = (i) => (i === 0 ? "#F43F5E" : i === 6 ? "#3B82F6" : INK);

export const REPEATS = [{ id: "none", label: "없음" }, { id: "daily", label: "매일" }, { id: "weekly", label: "매주" }, { id: "monthly", label: "매월" }, { id: "yearly", label: "매년" }];

export const ALERTS = [
  { min: null, label: "없음" }, { min: 5, label: "5분 전" }, { min: 10, label: "10분 전" }, { min: 15, label: "15분 전" }, { min: 30, label: "30분 전" },
  { min: 60, label: "1시간 전" }, { min: 120, label: "2시간 전" }, { min: 180, label: "3시간 전" },
  { min: 1440, label: "1일 전" }, { min: 2880, label: "2일 전" }, { min: 10080, label: "1주 전" },
];

export const font = '"Pretendard", -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", "Segoe UI", sans-serif';
