import { forwardRef, useId } from "react";
import Label from "@/components/ui/Label";
import "@/components/ui/Input.css";

/* 입력 컨트롤. as: "input"(기본) | "textarea" | "select"
   label / icon: 라벨 표시, error: 오류 메시지(role="alert"), 나머지 props 는 그대로 전달 */
const Input = forwardRef(function Input({ as: Tag = "input", label, icon, error, className = "", id, children, ...rest }, ref) {
  const auto = useId();
  const fid = id ?? auto;
  const control = (
    <Tag ref={ref} id={fid} className={`ui-input ${className}`.trim()} data-invalid={error ? true : undefined} aria-invalid={error ? true : undefined} {...rest}>
      {children}
    </Tag>
  );
  if (!label && !error) return control;
  return (
    <div className="ui-input-field">
      {label && <Label icon={icon} htmlFor={fid}>{label}</Label>}
      {control}
      {error && <p role="alert" className="ui-input-field__error">{error}</p>}
    </div>
  );
});

export default Input;
