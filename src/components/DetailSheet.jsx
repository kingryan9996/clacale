import { useState } from "react";
import { Bell, Car, Clock, MapPin, Repeat, StickyNote, Trash2, Users, X } from "lucide-react";
import Button from "./Button";
import Sheet, { titleStyle, topBar } from "./Sheet";
import { ACCENT, REPEATS, brandOf } from "../lib/constants";
import { alertLabel, fmtRange, t12 } from "../lib/dates";

/* ---------- 일정 상세 (조회 + 삭제: 반복 범위 선택 -> 최종 확인) ---------- */
const SCOPES = [{ id: "one", label: "이 일정만 삭제" }, { id: "after", label: "이후 일정 모두 삭제" }, { id: "all", label: "전체 반복 일정 삭제" }];

export const dlgBack = { position: "absolute", inset: 0, zIndex: 5, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.45)", padding: 24 };

export const dlgCard = { width: "100%", maxWidth: 320, boxSizing: "border-box", background: "#fff", borderRadius: 20, padding: 20, boxShadow: "0 10px 30px rgba(0,0,0,.25)" };

export default function DetailSheet({ ev, st, onClose, onDelete }) {
  const [step, setStep] = useState(null); // null | "scope"(반복 일정만) | "confirm"
  const [scope, setScope] = useState("one");
  const repeating = ev.repeat !== "none";
  const b = brandOf(ev.brand);
  const rep = REPEATS.find((r) => r.id === ev.repeat)?.label ?? "없음";
  const al = ev.alerts?.length ? ev.alerts.map(alertLabel).join(", ") : "없음";
  return (
    <Sheet onClose={onClose}>
      {(close) => (
        <>
          <div style={topBar}>
            <Button variant="ghost" size="icon" onClick={close} aria-label="닫기"><X size={22} /></Button>
            <h3 style={titleStyle}>일정 상세</h3>
            <span style={{ width: 36 }} />
          </div>
          <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "0 16px 8px", display: "flex", flexDirection: "column", gap: 14 }}>
            <Info icon={MapPin} label="장소"><span style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700 }}>
              <span style={{ width: 10, height: 10, borderRadius: 999, background: b.color, flexShrink: 0 }} />{ev.place}</span></Info>
            <Info icon={Clock} label="일시">{fmtRange(ev.start, ev.end)}</Info>
            <Info icon={Car} label="이동시간">{ev.travel > 0 ? `${ev.travel}분` : "없음"}</Info>
            <Info icon={StickyNote} label="메모"><span style={{ whiteSpace: "pre-wrap" }}>{ev.memo || "없음"}</span></Info>
            <Info icon={Repeat} label="반복">{rep}</Info>
            <Info icon={Bell} label="알림">{al}</Info>
            <Info icon={Users} label="혼잡도">
              <CrowdBadge st={st} />
              <span style={{ display: "block", marginTop: 2, fontSize: 12, color: "rgba(0,0,0,.45)" }}>{t12(st.time_slot)} 기준 · 최대 {st.max_capacity}명 · 예시 집계</span>
            </Info>
          </div>
          <div style={{ padding: "8px 16px 16px", flexShrink: 0 }}>
            <Button variant="danger" size="lg" style={{ width: "100%" }} onClick={() => setStep(repeating ? "scope" : "confirm")}>
              <Trash2 size={18} />일정 삭제
            </Button>
          </div>

          {step === "scope" && (
            <div role="dialog" aria-label="반복 일정 삭제 범위" style={dlgBack}>
              <div style={dlgCard}>
                <h4 style={{ margin: "0 0 8px", fontSize: 17 }}>반복 일정 삭제</h4>
                {SCOPES.map((o) => (
                  <Button key={o.id} variant="ghost" size="none" role="radio" aria-checked={scope === o.id} onClick={() => setScope(o.id)}
                    style={{ width: "100%", justifyContent: "flex-start", gap: 10, padding: "12px 4px", fontSize: 15, borderRadius: 8 }}>
                    <span style={{ width: 18, height: 18, boxSizing: "border-box", flexShrink: 0, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${scope === o.id ? ACCENT : "#C9CEC9"}` }}>
                      {scope === o.id && <span style={{ width: 8, height: 8, borderRadius: 999, background: ACCENT }} />}
                    </span>
                    {o.label}
                  </Button>
                ))}
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <Button variant="secondary" style={{ flex: 1 }} onClick={() => setStep(null)}>취소</Button>
                  <Button variant="primary" style={{ flex: 1 }} onClick={() => setStep("confirm")}>다음</Button>
                </div>
              </div>
            </div>
          )}
          {step === "confirm" && (
            <div role="alertdialog" aria-label="삭제 확인" style={dlgBack}>
              <div style={dlgCard}>
                <h4 style={{ margin: "0 0 8px", fontSize: 17 }}>일정을 삭제하시겠습니까?</h4>
                {repeating && <p style={{ margin: "0 0 4px", fontSize: 14, color: "rgba(0,0,0,.55)" }}>{SCOPES.find((o) => o.id === scope).label}</p>}
                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                  <Button variant="secondary" style={{ flex: 1 }} onClick={() => setStep(null)}>취소</Button>
                  <Button variant="primary" style={{ flex: 1, background: "#DC2626" }} onClick={() => { onDelete(ev, repeating ? scope : "all"); close(); }}>삭제</Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </Sheet>
  );
}

function Info({ icon: Icon, label, children }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, fontSize: 15 }}>
      <span style={{ display: "flex", alignItems: "center", gap: 6, width: 84, flexShrink: 0, fontSize: 13, color: "rgba(0,0,0,.5)", paddingTop: 2 }}>
        <Icon size={14} />{label}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}

/* ---------- 혼잡도 배지 ---------- */
export function CrowdBadge({ st }) {
  return (
    <span title={`${st.time_slot} 기준 혼잡 예상 ${Math.round(st.pct)}% (최대 ${st.max_capacity}명)`}
      style={{ display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0, fontSize: 12, fontWeight: 600, color: "rgba(0,0,0,.65)" }}>
      <span aria-hidden="true" style={{ width: 12, height: 12, borderRadius: 999, background: st.level.color }} />
      {st.level.label} · {st.visit_count}명
    </span>
  );
}
