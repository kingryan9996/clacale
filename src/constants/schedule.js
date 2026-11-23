export const TRAVEL = [0, 15, 30, 45, 60, 90];

export const DOW = ["일", "월", "화", "수", "목", "금", "토"];

export const REPEATS = [{ id: "none", label: "없음" }, { id: "daily", label: "매일" }, { id: "weekly", label: "매주" }, { id: "monthly", label: "매월" }, { id: "yearly", label: "매년" }];

export const ALERTS = [
  { min: null, label: "없음" }, { min: 5, label: "5분 전" }, { min: 10, label: "10분 전" }, { min: 15, label: "15분 전" }, { min: 30, label: "30분 전" },
  { min: 60, label: "1시간 전" }, { min: 120, label: "2시간 전" }, { min: 180, label: "3시간 전" },
  { min: 1440, label: "1일 전" }, { min: 2880, label: "2일 전" }, { min: 10080, label: "1주 전" },
];

// 반복 일정 삭제 범위
export const DELETE_SCOPES = [{ id: "one", label: "이 일정만 삭제" }, { id: "after", label: "이후 일정 모두 삭제" }, { id: "all", label: "전체 반복 일정 삭제" }];
