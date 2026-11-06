import { X } from "lucide-react";
import { cn } from "./cn";
import Button from "./Button";

/**
 * 칩
 * - 선택형: <Chip active onClick>기간권</Chip>  (aria-pressed 자동)
 * @prop shape  "pill"(기본) | "rounded"   @prop block  가로 100% + 가운데 정렬 (그리드 칸용)
 * - 제거형: <Chip onRemove={...} removeLabel="5분 전 알림 삭제">5분 전</Chip>  ("5분 전 ✕")
 */
export default function Chip({ active = false, onClick, onRemove, removeLabel, shape = "pill", block = false, className, children }) {
  const tone = active ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-700";
  if (onRemove) {
    return (
      <span className={cn("inline-flex items-center gap-0.5 rounded-full bg-orange-50 py-1 pl-3 pr-1 text-sm font-medium text-orange-700", className)}>
        {children}
        <Button variant="ghost" className="h-6 w-6 rounded-full p-0 text-orange-700" aria-label={removeLabel ?? "삭제"} onClick={onRemove}><X size={14} /></Button>
      </span>
    );
  }
  return (
    <button type="button" aria-pressed={active} onClick={onClick}
      className={cn("inline-flex h-8 items-center px-3.5 text-sm font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-[#F26B21]/60 active:opacity-70", shape === "pill" ? "rounded-full" : "rounded-xl", block && "w-full justify-center", tone, className)}>
      {children}
    </button>
  );
}
