// 광고(구글 애드센스) 설정 — 기본은 꺼짐("off")이라 화면과 네트워크에 아무 영향이 없다
//   off     : 아무것도 그리지 않음 (지금)
//   preview : 광고가 들어갈 자리를 점선 상자로만 표시 (배치/높이 확인용, 외부 스크립트 로드 없음)
//   live    : 실제 광고 (client 와 해당 자리의 slot 이 모두 채워져 있어야 함)
export const ADS = {
  mode: "off",
  client: "", // 승인 후 "ca-pub-XXXXXXXXXXXXXXXX"
  // 자리(placement)별 높이(px, 고정 — 광고가 늦게 떠도 화면이 밀리지 않게). slot 은 애드센스에서 광고 단위를 만든 뒤 채운다
  placements: {
    calendarList: { slot: "", height: 100 }, // 캘린더 일정 목록(월간/목록 보기) 맨 아래
    mypage: { slot: "", height: 100 }, // 마이페이지 섹션 사이
    board: { slot: "", height: 100, every: 5 }, // 게시판: 글 5개마다 1개
  },
};
export const AD_LABEL = "광고";
export const AD_PREVIEW_TEXT = "광고 자리 (미리보기)";
