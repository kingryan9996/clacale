import "@/components/ui/Dialog.css";

/* 시트 위에 뜨는 확인/선택 다이얼로그. level: 기본 | "raised" | "top" (겹칠 때 z-index) */
export default function Dialog({ role = "dialog", label, level, title, children, actions }) {
  return (
    <div role={role} aria-label={label} className="ui-dialog" data-level={level}>
      <div className="ui-dialog__card">
        {title && <h4 className="ui-dialog__title">{title}</h4>}
        {children}
        {actions && <div className="ui-dialog__actions">{actions}</div>}
      </div>
    </div>
  );
}
