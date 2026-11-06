import { forwardRef, useId } from "react";
import { cn } from "./cn";

/** 라벨(+아이콘) 한 줄 + 내용. 입력창이 아닌 행(칩 모음, 선택 버튼 등)에도 그대로 사용 */
export function Field({ icon: Icon, label, htmlFor, className, children }) {
  const Label = htmlFor ? "label" : "p";
  return (
    <div className={className}>
      {label && (
        <Label htmlFor={htmlFor} className="mb-1.5 flex items-center gap-1.5 text-[13px] font-medium text-neutral-500">
          {Icon && <Icon size={14} />}{label}
        </Label>
      )}
      {children}
    </div>
  );
}

/**
 * 공통 입력 필드 (input / textarea / select 한 컴포넌트로)
 * @prop as         "input"(기본) | "textarea" | "select"
 * @prop label      라벨 (htmlFor 자동 연결) / labelIcon 라벨 앞 아이콘
 * @prop hint / error  보조·오류 문구 (aria-describedby, aria-invalid 연결)
 * @prop leftIcon   입력창 안쪽 왼쪽 아이콘 (input/select)
 * @prop options    select용 [{ value, label }] (없으면 children의 <option> 사용)
 * @prop className  입력창 클래스 / wrapperClassName 바깥 래퍼 클래스
 * type="datetime-local", rows 등 기본 속성은 그대로 전달됩니다.
 */
const Input = forwardRef(function Input(
  { as: Tag = "input", label, labelIcon, hint, error, leftIcon, options, id, className, wrapperClassName, children, ...rest },
  ref
) {
  const uid = useId();
  const fid = id ?? uid;
  const note = error ? `${fid}-error` : hint ? `${fid}-hint` : undefined;
  const props = {
    ref, id: fid, "aria-invalid": error ? true : undefined, "aria-describedby": note,
    className: cn(
      "w-full rounded-xl bg-[#F3F4F2] px-3.5 py-3 text-[15px] text-neutral-900 outline-none transition",
      "placeholder:text-neutral-400 focus:ring-2 focus:ring-[#F26B21]/40 disabled:opacity-50",
      error && "ring-2 ring-red-400", leftIcon && Tag !== "textarea" && "pl-10", Tag === "textarea" && "resize-none", className
    ),
    ...rest,
  };

  return (
    <Field icon={labelIcon} label={label} htmlFor={fid} className={wrapperClassName}>
      <div className="relative">
        {leftIcon && Tag !== "textarea" && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">{leftIcon}</span>}
        {Tag === "select"
          ? <select {...props}>{options ? options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>) : children}</select>
          : <Tag {...props} />}
      </div>
      {error ? <p id={`${fid}-error`} role="alert" className="mt-1 text-xs text-red-600">{error}</p>
        : hint ? <p id={`${fid}-hint`} className="mt-1 text-xs text-neutral-400">{hint}</p> : null}
    </Field>
  );
});

export default Input;
