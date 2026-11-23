import { useState } from "react";
import { Bell, Car, Clock, MapPin, Repeat, StickyNote, Trash2, Users, X } from "lucide-react";
import { Button, Dialog, Sheet, SheetHeader } from "@/components/ui";
import { brandOf } from "@/constants/brands";
import { DELETE_SCOPES, REPEATS } from "@/constants/schedule";
import { alertLabel, fmtRange, t12 } from "@/lib/dates";
import "@/components/DetailSheet.css";

/* ---------- 일정 상세 (조회 + 삭제: 반복 범위 선택 -> 최종 확인) ---------- */
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
          <SheetHeader left={<Button variant="ghost" size="icon" onClick={close} aria-label="닫기"><X size={22} /></Button>} title="일정 상세" />
          <div className="detail__body">
            <Info icon={MapPin} label="장소">
              <span className="detail__place"><span className="brand-dot" style={{ "--brand": b.color }} />{ev.place}</span>
            </Info>
            <Info icon={Clock} label="일시">{fmtRange(ev.start, ev.end)}</Info>
            <Info icon={Car} label="이동시간">{ev.travel > 0 ? `${ev.travel}분` : "없음"}</Info>
            <Info icon={StickyNote} label="메모"><span className="detail__memo">{ev.memo || "없음"}</span></Info>
            <Info icon={Repeat} label="반복">{rep}</Info>
            <Info icon={Bell} label="알림">{al}</Info>
            <Info icon={Users} label="혼잡도">
              <CrowdBadge st={st} />
              <span className="detail__crowd-note">{t12(st.time_slot)} 기준 · 최대 {st.max_capacity}명 · 예시 집계</span>
            </Info>
          </div>
          <div className="detail__footer">
            <Button variant="danger" size="lg" fullWidth onClick={() => setStep(repeating ? "scope" : "confirm")}>
              <Trash2 size={18} />일정 삭제
            </Button>
          </div>

          {step === "scope" && (
            <Dialog label="반복 일정 삭제 범위" title="반복 일정 삭제" actions={<>
              <Button variant="secondary" onClick={() => setStep(null)}>취소</Button>
              <Button variant="primary" onClick={() => setStep("confirm")}>다음</Button>
            </>}>
              {DELETE_SCOPES.map((o) => (
                <Button key={o.id} variant="ghost" size="bare" role="radio" aria-checked={scope === o.id} className="detail__scope" onClick={() => setScope(o.id)}>
                  <span className="detail__radio" data-on={scope === o.id || undefined} />
                  {o.label}
                </Button>
              ))}
            </Dialog>
          )}
          {step === "confirm" && (
            <Dialog role="alertdialog" label="삭제 확인" title="일정을 삭제하시겠습니까?" actions={<>
              <Button variant="secondary" onClick={() => setStep(null)}>취소</Button>
              <Button variant="danger-solid" onClick={() => { onDelete(ev, repeating ? scope : "all"); close(); }}>삭제</Button>
            </>}>
              {repeating && <p className="ui-dialog__text">{DELETE_SCOPES.find((o) => o.id === scope).label}</p>}
            </Dialog>
          )}
        </>
      )}
    </Sheet>
  );
}

function Info({ icon: Icon, label, children }) {
  return (
    <div className="detail__info">
      <span className="detail__info-label"><Icon size={14} />{label}</span>
      <div className="detail__info-value">{children}</div>
    </div>
  );
}

/* ---------- 혼잡도 배지 ---------- */
export function CrowdBadge({ st }) {
  return (
    <span className="crowd-badge" title={`${st.time_slot} 기준 혼잡 예상 ${Math.round(st.pct)}% (최대 ${st.max_capacity}명)`}>
      <span aria-hidden="true" className="crowd-badge__dot" data-level={st.level.id} />
      {st.level.label} · {st.visit_count}명
    </span>
  );
}
