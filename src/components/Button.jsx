import { forwardRef } from "react";
import { ACCENT, INK } from "../lib/constants";

const VARIANTS = {
  primary: { background: INK, color: "#ffffff" },
  secondary: { background: "#EEF0EE", color: INK },
  outline: { background: "transparent", color: INK, border: "1px solid #C9CEC9" },
  ghost: { background: "transparent", color: INK },
  floating: {
    background: ACCENT, color: "#000000", width: 44, height: 44, padding: 0,
    borderRadius: 999, boxShadow: "0 4px 12px rgba(242,107,33,.45)",
  },
  danger: { background: "#FDECEC", color: "#B91C1C" },
};

const SIZES = {
  sm: { padding: "8px 14px", fontSize: 14, fontWeight: 500 },
  md: { padding: "10px 16px", fontSize: 15, fontWeight: 600 },
  lg: { padding: "14px 20px", fontSize: 16, fontWeight: 600 },
  icon: { width: 36, height: 36, padding: 0, borderRadius: 999 },
  none: { padding: 0 },
};

export const BUTTON_CSS = `
.cb{display:inline-flex;align-items:center;justify-content:center;gap:6px;border:0;cursor:pointer;font:inherit;line-height:1.2;transition:opacity .12s,transform .12s;-webkit-tap-highlight-color:transparent}
.cb:active{opacity:.7}
.cb[data-v=floating]:active{opacity:1;transform:scale(.92)}
.cb:disabled{opacity:.4;pointer-events:none}
.cb:focus-visible{outline:2px solid ${ACCENT};outline-offset:2px}`;

const Button = forwardRef(function Button(
  { variant = "primary", size, pill = false, style, className = "", type = "button", children, ...rest },
  ref
) {
  const sz = size ?? (variant === "floating" ? "icon" : "md");
  return (
    <button
      ref={ref}
      type={type}
      data-v={variant}
      className={`cb ${className}`}
      style={{ borderRadius: 12, ...SIZES[sz], ...(pill ? { borderRadius: 999 } : null), ...VARIANTS[variant], ...style }}
      {...rest}
    >
      {children}
    </button>
  );
});

export default Button;
