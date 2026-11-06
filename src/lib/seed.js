import { addDays, dayKey, todayKey } from "./dates";

// 초기 목업: 이미 만료된 이용권 5개 (브랜드·종류 혼합). Supabase용은 supabase/mock_passes.sql
const mockPeriod = (id, brand, days, ago) => ({ id, brand, kind: "period", days, start: addDays(todayKey, -ago), expires: addDays(todayKey, -ago + days - 1), pause: null });

const mockCount = (id, brand, total, ago) => {
  const valid = total === 5 ? 180 : 365, start = addDays(todayKey, -ago);
  return { id, brand, kind: "count", total, remaining: 0, validDays: valid, start, expires: addDays(start, valid - 1), endedOn: addDays(start, Math.max(1, Math.floor(Math.min(ago - 1, valid - 1) / 2))), pause: null };
};

export const MOCK_PASSES = [
  mockPeriod(1001, "stones", 180, 297),
  mockCount(1002, "park", 30, 196),
  mockPeriod(1003, "son", 180, 236),
  mockPeriod(1004, "ficus", 90, 191),
  mockCount(1005, "climb", 5, 151),
];

const SEED = [
  { id: 1, brand: "climb", place: "더클라임 강남", start: `${dayKey(0)}T19:00`, end: `${dayKey(0)}T21:30`, travel: 30, memo: "새 루트 세팅 확인", repeat: "weekly", alerts: [60] },
  { id: 2, brand: "forest", place: "서울숲 클라이밍 잠실", start: `${dayKey(2)}T10:00`, end: `${dayKey(2)}T12:00`, travel: 20, memo: "" },
  { id: 3, brand: "alle", place: "알레클라임 혜화", start: `${dayKey(2)}T18:30`, end: `${dayKey(2)}T20:30`, travel: 45, memo: "친구랑 같이" },
  { id: 4, brand: "stones", place: "스톤즈클라이밍", start: `${dayKey(2)}T08:00`, end: `${dayKey(2)}T09:30`, travel: 15, memo: "아침 워밍업" },
  { id: 5, brand: "stones", place: "스톤즈클라이밍", start: `${dayKey(5)}T20:00`, end: `${dayKey(5)}T22:00`, travel: 15, memo: "볼더링 위주" },
];

export const seed = SEED.map((e) => ({ repeat: "none", alerts: [], ...e }));
