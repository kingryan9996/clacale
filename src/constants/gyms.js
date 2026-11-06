// 공식 암장/지점 정적 데이터 (사용자 데이터는 Supabase에서 관리)
export const MAX_CAPACITY = 100; // gym_daily_stats.max_capacity 기본값

export const BRANDS = [
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

// gym_id 규칙: 지점이 있으면 "브랜드id:지점", 없으면 "브랜드id"
export const GYMS = BRANDS.flatMap((b) =>
  (b.branches.length ? b.branches : [null]).map((br) => ({
    id: br ? `${b.id}:${br}` : b.id,
    brand_id: b.id,
    brand: b.name,
    branch: br,
    max_capacity: MAX_CAPACITY,
  }))
);
