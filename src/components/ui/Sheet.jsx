import { useEffect, useState } from "react";
import "@/components/ui/Sheet.css";

/* 바텀시트: 앱 내 모든 모달/팝업의 표준. 하단에서 슬라이드업하는 풀 하이트 규격.
   children 은 close(슬라이드다운 후 onClose) 함수를 받는 렌더 함수 */
export default function Sheet({ onClose, role = "dialog", label, children }) {
  const [show, setShow] = useState(false);
  useEffect(() => { const r = requestAnimationFrame(() => setShow(true)); return () => cancelAnimationFrame(r); }, []);
  const close = () => { setShow(false); setTimeout(onClose, 250); };
  return (
    <div className="ui-sheet">
      <div className="ui-sheet__backdrop" data-show={show || undefined} onClick={close} />
      <div className="ui-sheet__panel" role={role} aria-label={label} aria-modal="true" data-show={show || undefined}>
        {children(close)}
      </div>
    </div>
  );
}

/* 시트 상단바: 좌(left) · 제목 · 우(right). 비워 두면 같은 폭의 빈칸으로 제목을 가운데 정렬 */
export function SheetHeader({ left, title, right }) {
  return (
    <div className="ui-sheet__header">
      {left}
      <h3 className="ui-sheet__title">{title}</h3>
      {right ?? <span className="ui-sheet__spacer" />}
    </div>
  );
}

export function SheetBody({ gap = 16, className = "", children }) {
  return <div className={`ui-sheet__body ${className}`.trim()} data-gap={gap}>{children}</div>;
}

