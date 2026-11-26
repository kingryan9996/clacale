import { Calendar, MessageSquare, User } from "lucide-react";

export const TABS = [
  { to: "/", label: "캘린더", icon: Calendar },
  { to: "/board", label: "자유게시판", icon: MessageSquare },
  { to: "/mypage", label: "마이페이지", icon: User },
];

// 캘린더 화면 보기 방식: month = 월간 달력 + 선택한 날짜 목록, agenda = 한 달 일정을 날짜순으로 쭉 보기
export const CAL_VIEWS = ["month", "agenda"];
export const CAL_VIEW_KEY = "clacale:view";
