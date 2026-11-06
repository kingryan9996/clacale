import { cn } from "./cn";

const TONES = {
  neutral: "bg-neutral-200 text-neutral-600",
  success: "bg-emerald-100 text-emerald-700",
  info: "bg-blue-100 text-blue-700",
  warning: "bg-amber-100 text-amber-700",
  danger: "bg-rose-100 text-rose-700",
};
const DOTS = { neutral: "bg-neutral-400", success: "bg-emerald-500", info: "bg-blue-500", warning: "bg-amber-500", danger: "bg-rose-500" };

/** 상태 배지. dot이면 앞에 색 점 표시 (예: 혼잡도 "● 보통 · 50명") */
export default function Badge({ tone = "neutral", dot = false, className, children }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold", TONES[tone], className)}>
      {dot && <span aria-hidden="true" className={cn("h-3 w-3 rounded-full", DOTS[tone])} />}
      {children}
    </span>
  );
}
