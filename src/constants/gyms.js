import { BRAND_DATA } from "@/constants/brands";

// 공식 암장/지점 정적 데이터 (사용자 데이터는 Supabase에서 관리)
export const MAX_CAPACITY = 100; // gym_daily_stats.max_capacity 기본값

// gym_id 규칙: 지점이 있으면 "브랜드id:지점", 없으면 "브랜드id"
export const GYMS = BRAND_DATA.flatMap((b) =>
  (b.branches.length ? b.branches : [null]).map((br) => ({
    id: br ? `${b.id}:${br}` : b.id,
    brand_id: b.id,
    brand: b.name,
    branch: br,
    max_capacity: MAX_CAPACITY,
  }))
);
