/* 브랜드(센터)/지점 정적 데이터. 브랜드 고유 색(color)은 도메인 데이터라 hex 허용 예외 (CLAUDE.md 참고). */
export const BRAND_DATA = [
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

// 가나다순 비교
export const ko = (a, b) => a.localeCompare(b, "ko");

// 브랜드와 지점을 가나다순으로 정렬
export const BRANDS = BRAND_DATA.map((b) => ({ ...b, branches: [...b.branches].sort(ko) })).sort((a, b) => ko(a.name, b.name));

// 마이페이지에서 등록한 커스텀 암장
export const CUSTOM = { id: "custom", name: "내 암장", color: "#64748B", branches: [] };

export const brandOf = (id) => (id === "custom" ? CUSTOM : BRANDS.find((b) => b.id === id) ?? BRANDS[0]);
