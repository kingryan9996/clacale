// 혼잡도(방문 예정 인원) 표시 규칙 — 숫자 기준은 모두 여기서만 바꾼다
export const CROWD_SLOT_HOURS = 3; // 집계 시간대 크기(시간). 일정의 시작·종료 중간 시각이 속한 구간으로 집계
export const CROWD_DISPLAY_SLOTS = [6, 9, 12, 15, 18, 21]; // 화면에 나열하는 구간의 시작 시각(06~24시)
export const CROWD_MIN_DISPLAY = 20; // 이 인원 미만이면 숫자 대신 "20명 미만" (소수 표본 노출 방지)

export const CROWD_TITLE = "혼잡도";
export const CROWD_BETA = "베타";
export const CROWD_NOTICE = "클라캘 유저 기준 집계 · 실제 혼잡도와 다를 수 있어요";
export const CROWD_PENDING = "집계 준비 중";
export const CROWD_PENDING_NOTE = "클라캘 유저가 모이면 이 암장의 방문 예정 인원을 보여드려요.";
