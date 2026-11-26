import { useState } from "react";
import { Bell, Car, Clock, MapPin, Pencil, Repeat, StickyNote, Trash2, Users, X } from "lucide-react";
import { Button, ConfirmSheet, Sheet, SheetHeader } from "@/components/ui";
import { brandOf } from "@/constants/brands";
import { CROWD_BETA, CROWD_NOTICE, CROWD_PENDING, CROWD_PENDING_NOTE, CROWD_TITLE } from "@/constants/crowd";
import { DELETE_SCOPES, REPEATS } from "@/constants/schedule";
import { crowdText } from "@/lib/crowd";
import { alertLabel, fmtRange } from "@/lib/dates";
import "@/components/DetailSheet.css";

/* ---------- 일정 상세 (조회 + 수정 + 삭제: 반복 범위 선택 -> 최종 확인) ---------- */
export default function DetailSheet({ ev, st, onClose, onDelete, onEdit }) {
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
            <Info icon={Users} label={CROWD_TITLE}>
              <CrowdPanel st={st} />
            </Info>
          </div>
          <div className="detail__footer">
            <Button variant="secondary" size="lg" fullWidth onClick={() => onEdit(ev)}>
              <Pencil size={18} />일정 수정
            </Button>
            <Button variant="danger" size="lg" fullWidth onClick={() => setStep(repeating ? "scope" : "confirm")}>
              <Trash2 size={18} />일정 삭제
            </Button>
          </div>

          {step === "scope" && (
            <ConfirmSheet role="dialog" label="반복 일정 삭제 범위" title="반복 일정 삭제" onClose={() => setStep(null)} actions={(c) => <>
              <Button variant="secondary" onClick={c}>취소</Button>
              <Button variant="primary" onClick={() => setStep("confirm")}>다음</Button>
            </>}>
              {DELETE_SCOPES.map((o) => (
                <Button key={o.id} variant="ghost" size="bare" role="radio" aria-checked={scope === o.id} className="detail__scope" onClick={() => setScope(o.id)}>
                  <span className="detail__radio" data-on={scope === o.id || undefined} />
                  {o.label}
                </Button>
              ))}
            </ConfirmSheet>
          )}
          {step === "confirm" && (
            <ConfirmSheet label="삭제 확인" title="일정을 삭제하시겠습니까?" onClose={() => setStep(null)} actions={(c) => <>
              <Button variant="secondary" onClick={c}>취소</Button>
              <Button variant="danger-solid" onClick={() => { onDelete(ev, repeating ? scope : "all"); close(); }}>삭제</Button>
            </>}>
              {repeating && <p className="ui-sheet__text">{DELETE_SCOPES.find((o) => o.id === scope).label}</p>}
            </ConfirmSheet>
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

/* ---------- 혼잡도: 목록 카드 배지(집계가 있을 때만) / 상세 패널(하루 합계 + 3시간 구간별) ---------- */
export function CrowdBadge({ st }) {
  if (st.pending) return null;
  return (
    <span className="crowd-badge" title={`${st.slots.find((s) => s.mine).label} 방문 예정 · ${CROWD_NOTICE}`}>
      <Users size={13} aria-hidden="true" />
      {crowdText(st.count)}
    </span>
  );
}

function CrowdPanel({ st }) {
  return (
    <div className="crowd-panel">
      {st.pending ? (
        <>
          <b className="crowd-panel__main">{CROWD_PENDING}<span className="crowd-beta">{CROWD_BETA}</span></b>
          <span className="detail__crowd-note">{CROWD_PENDING_NOTE}</span>
        </>
      ) : (
        <>
          <b className="crowd-panel__main">클라캘 유저 {crowdText(st.day)} 방문 예정<span className="crowd-beta">{CROWD_BETA}</span></b>
          <ul className="crowd-slots">
            {st.slots.map((s) => (
              <li key={s.slot} className="crowd-slots__row" data-mine={s.mine || undefined}>
                <span>{s.label}{s.mine && <em className="crowd-slots__mine">내 일정</em>}</span>
                <b>{crowdText(s.count)}</b>
              </li>
            ))}
          </ul>
        </>
      )}
      <span className="detail__crowd-note">{CROWD_NOTICE}</span>
    </div>
  );
}
