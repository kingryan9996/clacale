import { Check } from "lucide-react";
import "@/components/ui/Checkbox.css";

/* 체크박스: children 이 라벨(링크 포함 가능). 나머지 props(checked, onChange, disabled 등)는 input 으로 전달 */
export default function Checkbox({ className = "", children, ...rest }) {
  return (
    <label className={`ui-checkbox ${className}`.trim()}>
      <input type="checkbox" className="ui-checkbox__input" {...rest} />
      <span className="ui-checkbox__box" aria-hidden="true"><Check size={14} strokeWidth={3} /></span>
      <span className="ui-checkbox__label">{children}</span>
    </label>
  );
}
