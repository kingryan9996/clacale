import { forwardRef } from "react";
import "@/components/ui/Button.css";

/* variant: primary | secondary | outline | ghost | danger | danger-solid | kakao | fab
   size: sm | md | lg | icon | bare(패딩 없음 · 행/셀처럼 레이아웃을 직접 잡는 버튼)
   pill: 알약 모양 / fullWidth: 폭 100% */
const Button = forwardRef(function Button(
  { variant = "primary", size, pill = false, fullWidth = false, disabled = false, type = "button", className = "", children, ...rest },
  ref
) {
  const sz = size ?? (variant === "fab" ? "icon" : "md");
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      className={`ui-btn ${className}`.trim()}
      data-variant={variant}
      data-size={sz}
      data-pill={pill || undefined}
      data-full={fullWidth || undefined}
      {...rest}
    >
      {children}
    </button>
  );
});

export default Button;
