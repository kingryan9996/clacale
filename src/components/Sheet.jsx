import { useEffect, useState } from "react";

export const topBar = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", flexShrink: 0 };

export const titleStyle = { margin: 0, fontWeight: 700 };

export default function Sheet({ full = false, onClose, children }) {
  const [show, setShow] = useState(false);
  useEffect(() => { const r = requestAnimationFrame(() => setShow(true)); return () => cancelAnimationFrame(r); }, []);
  const close = () => { setShow(false); setTimeout(onClose, 250); };
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 30 }}>
      <div onClick={close} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.4)", opacity: show ? 1 : 0, transition: "opacity .2s" }} />
      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 0, display: "flex", flexDirection: "column", background: "#fff",
        ...(full ? { height: "100%" } : { maxHeight: "85%", borderRadius: "24px 24px 0 0", boxShadow: "0 -10px 30px rgba(0,0,0,.2)" }),
        transform: show ? "translateY(0)" : "translateY(100%)", transition: "transform .25s ease-out",
      }}>
        {children(close)}
      </div>
    </div>
  );
}
