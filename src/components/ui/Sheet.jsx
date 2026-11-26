import { useEffect, useRef, useState } from "react";
import "@/components/ui/Sheet.css";

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/* 바텀시트: 앱 내 모든 모달/팝업의 표준. 하단에서 슬라이드업하는 규격.
   size: "full"(기본, 화면 전체 높이) | "auto"(내용 높이: 확인/선택 팝업)
   children 은 close(슬라이드다운 후 onClose) 함수를 받는 렌더 함수.
   접근성: 열리면 시트로 포커스 이동 · Esc 로 닫기 · Tab 이 시트 안에서만 순환 · 닫히면 열기 전 위치로 포커스 복귀 */
export default function Sheet({ onClose, role = "dialog", label, size = "full", children }) {
  const [show, setShow] = useState(false);
  const panel = useRef(null);
  useEffect(() => { const r = requestAnimationFrame(() => setShow(true)); return () => cancelAnimationFrame(r); }, []);
  useEffect(() => {
    const prev = document.activeElement;
    panel.current?.focus({ preventScroll: true });
    return () => { if (prev && prev.isConnected && typeof prev.focus === "function") prev.focus({ preventScroll: true }); };
  }, []);
  const close = () => { setShow(false); setTimeout(onClose, 250); };
  const onKeyDown = (e) => {
    if (e.key === "Escape") { e.stopPropagation(); close(); return; }
    if (e.key !== "Tab") return;
    e.stopPropagation(); // 겹쳐 열린 시트(확인 팝업)에서는 가장 위 시트만 처리
    const items = [...panel.current.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
    if (!items.length) { e.preventDefault(); return; }
    const first = items[0], last = items[items.length - 1], cur = document.activeElement;
    if (e.shiftKey && (cur === first || cur === panel.current)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && cur === last) { e.preventDefault(); first.focus(); }
  };
  return (
    <div className="ui-sheet">
      <div className="ui-sheet__backdrop" data-show={show || undefined} onClick={close} />
      <div ref={panel} tabIndex={-1} onKeyDown={onKeyDown} className="ui-sheet__panel" role={role} aria-label={label} aria-modal="true" data-size={size} data-show={show || undefined}>
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

