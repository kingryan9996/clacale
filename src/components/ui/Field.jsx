import Label from "@/components/ui/Label";
import "@/components/ui/Field.css";

/* 라벨 + 임의 컨트롤(칩 묶음, 버튼 등)을 감싸는 폼 행 */
export default function Field({ icon, label, htmlFor, error, children }) {
  return (
    <div className="ui-field">
      <Label icon={icon} htmlFor={htmlFor}>{label}</Label>
      {children}
      {error && <p role="alert" className="ui-field__error">{error}</p>}
    </div>
  );
}
