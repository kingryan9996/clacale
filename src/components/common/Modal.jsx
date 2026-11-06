import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "./cn";
import Button from "./Button";

const VARIANTS = {
  sheet: { wrap: "items-end", panel: "max-h-[85%] w-full rounded-t-3xl", hidden: "translate-y-full" }, // 바텀시트
  fullscreen: { wrap: "items-stretch", panel: "h-full w-full", hidden: "translate-y-full" },            // 풀스크린
  center: { wrap: "items-center p-6", panel: "w-full max-w-sm rounded-2xl", hidden: "scale-95 opacity-0" }, // 중앙 다이얼로그
};

/**
 * 공통 모달 (모바일 우선, max-w-md 중앙 정렬)
 * @prop open / onClose
 * @prop variant         sheet | fullscreen | center
 * @prop title           헤더 제목 (aria-labelledby 연결)
 * @prop showClose       헤더 닫기(X) 버튼 (기본 true)
 * @prop closeOnBackdrop 배경 클릭으로 닫기 (기본 true) / closeOnEsc ESC로 닫기 (기본 true)
 * @prop header          제목줄을 직접 구성 (지정하면 title/showClose 기본 헤더 대신 사용)
 * @prop handle          상단 손잡이 표시 (sheet)
 * @prop flush           본문 패딩 없이 꽉 채움 (내부에서 직접 레이아웃)
 * @prop footer          하단 고정 영역
 * @prop role            "dialog" | "alertdialog"
 */
export default function Modal({
  open, onClose, variant = "sheet", title, showClose = true, closeOnBackdrop = true, closeOnEsc = true,
  header, handle = false, flush = false, footer, role = "dialog", "aria-label": ariaLabel, className, bodyClassName, children,
}) {
  const [mounted, setMounted] = useState(open);
  const [show, setShow] = useState(false);
  const panelRef = useRef(null);
  const titleId = useId();
  const v = VARIANTS[variant] ?? VARIANTS.sheet;

  // 열고 닫을 때 슬라이드/페이드 애니메이션 (닫힌 뒤 언마운트)
  useEffect(() => {
    if (open) {
      setMounted(true);
      const r = requestAnimationFrame(() => setShow(true));
      return () => cancelAnimationFrame(r);
    }
    setShow(false);
    const t = setTimeout(() => setMounted(false), 250);
    return () => clearTimeout(t);
  }, [open]);

  // 열린 동안: 배경 스크롤 잠금, 포커스 이동/복원, ESC 닫기
  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    const onKey = (e) => { if (closeOnEsc && e.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, [open, closeOnEsc, onClose, mounted]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div aria-hidden="true" onClick={closeOnBackdrop ? onClose : undefined}
        className={cn("absolute inset-0 bg-black/40 transition-opacity duration-200", show ? "opacity-100" : "opacity-0")} />
      <div className={cn("pointer-events-none relative mx-auto flex h-full w-full max-w-md justify-center", v.wrap)}>
        <div
          ref={panelRef} tabIndex={-1} role={role} aria-modal="true"
          aria-labelledby={title ? titleId : undefined} aria-label={title ? undefined : ariaLabel}
          className={cn(
            "pointer-events-auto flex flex-col bg-white shadow-2xl outline-none transition duration-[250ms] ease-out",
            v.panel, show ? "translate-y-0 scale-100 opacity-100" : v.hidden, className
          )}
        >
          {handle && <div aria-hidden="true" className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-black/15" />}
          {header ?? ((title || showClose) && (
            <header className="flex shrink-0 items-center justify-between gap-2 px-4 py-3">
              {title ? <h2 id={titleId} className="text-base font-bold">{title}</h2> : <span />}
              {showClose && <Button variant="ghost" size="icon" aria-label="닫기" onClick={onClose}><X size={20} /></Button>}
            </header>
          ))}
          <div className={cn("min-h-0 flex-1", flush ? "flex flex-col overflow-hidden" : "overflow-y-auto px-4 pb-4", bodyClassName)}>{children}</div>
          {footer && <footer className="shrink-0 px-4 pb-4 pt-2">{footer}</footer>}
        </div>
      </div>
    </div>,
    document.body
  );
}

/** 제목줄: 왼쪽 버튼 | 가운데 제목 | 오른쪽 버튼 (제목은 항상 가운데) */
export function ModalHeader({ left, title, right }) {
  return (
    <header className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center px-4 py-3">
      <div className="justify-self-start">{left}</div>
      <h2 className="font-bold">{title}</h2>
      <div className="justify-self-end">{right}</div>
    </header>
  );
}
