export const PERIODS = [{ days: 30, label: "1개월" }, { days: 90, label: "3개월" }, { days: 180, label: "6개월" }, { days: 365, label: "1년" }];

export const COUNTS = [5, 10, 30];

export const VALIDS = [{ days: 180, label: "6개월" }, { days: 365, label: "1년" }]; // 횟수권 유효기간

// 이용권 상태 → 라벨 / 정렬 순서 (색은 styles의 data-tone 으로 처리)
export const PASS_STATUS = {
  active: { label: "이용중", tone: "success" },
  waiting: { label: "사용대기", tone: "info" },
  expired: { label: "만료됨", tone: "muted" },
  paused: { label: "정지중", tone: "warning" },
};
export const PASS_ORDER = { active: 0, waiting: 1, expired: 2 };
export const PAUSE_MAX_DAYS = 15;
