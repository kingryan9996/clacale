export const BOARD_KEY = "clacale:board";

export const seedPosts = () => [
  { id: 3, title: "이번 주말 더클라임 강남 같이 가실 분?", body: "토요일 오후 2시쯤 갈 예정이에요. 초보도 환영합니다!", author: "클라이머A", ts: Date.now() - 3 * 3600000 },
  { id: 2, title: "서울숲 클라이밍 새 루트 후기", body: "이번에 세팅된 파랑 루트가 꽤 재밌어요. 홀드 간격이 넓어서 키 작은 분들은 조금 힘들 수 있어요.", author: "볼더링러버", ts: Date.now() - 26 * 3600000 },
  { id: 1, title: "처음 시작하는 분들께 팁", body: "신발은 처음에 너무 작게 사지 않는 게 좋아요. 대여 신발로 몇 번 가 보고 고르세요.", author: "초크가루", ts: Date.now() - 4 * 86400000 },
];
