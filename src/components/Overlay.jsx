import { createPortal } from "react-dom";
import { INK, font } from "../lib/constants";

/* ---------- 모든 모달/전체화면 뷰의 공통 레이어 ----------
   document.body로 포털 → <main>의 패딩·overflow·transform에 갇히지 않고 뷰포트 전체를 덮음.
   z-50: 하단 탭바(z-40) 위. 모달 위 모달은 layer로 한 단계씩 올림 (z-50 + layer). */
export default function Overlay({ layer = 0, className = "", style, children, ...rest }) {
  return createPortal(
    <div {...rest} className={`fixed inset-0 w-full h-full z-50 ${className}`}
      style={{ color: INK, fontFamily: font, ...style, ...(layer ? { zIndex: 50 + layer } : null) }}>
      {children}
    </div>,
    document.body,
  );
}
