import { forwardRef, useEffect, useRef } from "react";
import { cn } from "./cn";

const VARIANTS = {
  primary: "bg-neutral-900 text-white active:bg-neutral-700",
  secondary: "bg-neutral-100 text-neutral-900 active:bg-neutral-200",
  outline: "border border-neutral-300 bg-transparent text-neutral-900 active:bg-black/5",
  ghost: "bg-transparent text-neutral-900 active:bg-black/5",
  brand: "bg-[#F26B21] text-black active:brightness-95",
  danger: "bg-red-50 text-red-700 active:bg-red-100",
  destructive: "bg-red-600 text-white active:bg-red-700",
  floating: "bg-[#F26B21] text-black shadow-lg shadow-orange-500/40 active:scale-90",
  text: "bg-transparent font-bold text-orange-600 active:opacity-60", // '저장' 같은 텍스트 버튼
  bare: "", // 모양 없음: 캘린더 셀, 리스트 행처럼 className으로 직접 꾸밀 때
  field: "flex w-full items-center justify-between rounded-xl bg-neutral-100 px-3.5 py-3 text-left text-[15px] text-neutral-900", // 입력창처럼 보이는 버튼
};
const RAW = new Set(["bare", "field"]); // 기본 레이아웃/크기/모서리를 붙이지 않는 변형
const DEFAULT_SIZE = { floating: "fab", text: "none" };
const SIZES = {
  sm: "h-8 px-3 text-sm font-medium",
  md: "h-11 px-4 text-[15px] font-semibold",
  lg: "h-12 px-5 text-base font-semibold",
  icon: "h-10 w-10 p-0",
  iconSm: "h-8 w-8 p-0",
  fab: "h-11 w-11 p-0",
  none: "",
};

const Spinner = () => (
  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity=".25" />
    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

/**
 * 공통 버튼
 * @prop variant     primary | secondary | outline | ghost | brand | danger | destructive | floating | text | bare | field
 * @prop size        sm | md | lg | icon | iconSm | fab | none (변형별 기본값 있음)
 * @prop pill        완전 둥근 모서리
 * @prop fullWidth   가로 100%
 * @prop loading     스피너 표시 + 클릭 차단
 * @prop debounceMs  클릭 후 이 시간(ms) 동안 재클릭 무시 (연타/더블클릭 방지)
 * @prop leftIcon / rightIcon  아이콘 슬롯
 * 그 외 <button> 기본 속성(onClick, disabled, aria-label, type ...)은 그대로 전달됩니다.
 */
const Button = forwardRef(function Button(
  { variant = "primary", size, pill = false, fullWidth = false, loading = false, debounceMs = 0,
    leftIcon, rightIcon, className, type = "button", disabled, onClick, children, ...rest },
  ref
) {
  const locked = useRef(false);
  const timer = useRef();
  useEffect(() => () => clearTimeout(timer.current), []);

  const handleClick = (e) => {
    if (disabled || loading || locked.current) return;
    if (debounceMs > 0) {
      locked.current = true;
      timer.current = setTimeout(() => { locked.current = false; }, debounceMs);
    }
    onClick?.(e);
  };
  const raw = RAW.has(variant);
  const sz = size ?? DEFAULT_SIZE[variant] ?? "md";
  const round = pill || sz === "icon" || sz === "iconSm" || sz === "fab" || variant === "floating" ? "rounded-full" : "rounded-xl";

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      onClick={handleClick}
      className={cn(
        "select-none outline-none transition focus-visible:ring-2 focus-visible:ring-[#F26B21]/60 disabled:pointer-events-none disabled:opacity-40",
        !raw && "inline-flex items-center justify-center gap-1.5 whitespace-nowrap", !raw && round,
        VARIANTS[variant], !raw && SIZES[sz], fullWidth && "w-full", className
      )}
      {...rest}
    >
      {loading ? <Spinner /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
});

export default Button;
