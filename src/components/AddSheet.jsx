import { useState } from "react";
import { Bell, Car, Check, ChevronLeft, ChevronRight, Clock, Heart, MapPin, Repeat, StickyNote, X } from "lucide-react";
import Button from "./Button";
import { dlgBack, dlgCard } from "./DetailSheet";
import Sheet, { titleStyle, topBar } from "./Sheet";
import { ACCENT, ALERTS, BRANDS, CUSTOM, INK, REPEATS, TRAVEL, brandOf, ko } from "../lib/constants";
import { H12, MIN5, addDays, alertLabel, defaultStart, fmtDate, fmtShort, hm, pad, plus3h, toStr } from "../lib/dates";
import { inPause, passTitle } from "../lib/passes";

/* ---------- 공통 바텀시트 (슬라이드업) ---------- */
export const fieldStyle = {
  width: "100%", boxSizing: "border-box", background: "#F3F4F2", borderRadius: 12, border: 0,
  padding: "12px 14px", fontSize: 15, fontFamily: "inherit", color: INK, outline: "none",
};

/* ---------- 일정 추가 (전체 화면 모달) ---------- */
export default function AddSheet({ date, onClose, onSave, favs, onToggleFav, passes, customGyms, onAdjustPasses }) {
  const [view, setView] = useState("form"); // form | place | when
  const [brandId, setBrandId] = useState(BRANDS[0].id);
  const [place, setPlace] = useState(null); // { brandId, text }
  const [init] = useState(() => defaultStart(date)); // 현재 시각 기준 다음 정각
  const [start, setStart] = useState(init);
  const [end, setEnd] = useState(() => plus3h(init)); // 시작 + 3시간
  const [endTouched, setEndTouched] = useState(false); // 종료를 직접 바꾸면, 이후 시작 변경 시 그 소요 시간을 유지
  const [travel, setTravel] = useState(0); // 기본값: 없음
  const [repeat, setRepeat] = useState("none");
  const [alerts, setAlerts] = useState([]); // 복수 알림 (분 단위, 오름차순)
  const [memo, setMemo] = useState("");

  const [confirmPause, setConfirmPause] = useState(false);
  const brand = brandId === "custom" ? { ...CUSTOM, branches: customGyms } : brandOf(brandId);
  // 즐겨찾기는 센터(브랜드) 단위만: 좋아요한 센터를 목록 맨 위로, 같은 그룹 안에서는 가나다순
  const fav = (b) => favs.includes(`b:${b.id}`);
  const brandsSorted = [...BRANDS, ...(customGyms.length ? [{ ...CUSTOM, branches: customGyms }] : [])].sort((a, b) => Number(fav(b)) - Number(fav(a)) || ko(a.name, b.name));
  // 지점이 없는 브랜드는 누르는 즉시 선택 완료, 지점이 있는 브랜드는 오른쪽에 지점 목록 표시
  const pickBrand = (b) => {
    setBrandId(b.id);
    if (b.branches.length === 0) { setPlace({ brandId: b.id, text: b.name }); setView("form"); }
  };
  const valid = place && end >= start;

  return (
    <Sheet full onClose={onClose}>
      {(close) => {
        const doSave = () => {
          onSave({ id: Date.now(), brand: place.brandId, place: place.text, start, end, travel, repeat, alerts, memo: memo.trim() });
          close();
        };
        // 일정 날짜가 같은 브랜드 이용권의 정지 기간에 속하면 조정 확인 팝업
        const conflicts = place ? passes.filter((x) => x.brand === place.brandId && inPause(x, start.slice(0, 10))) : [];
        const save = () => (conflicts.length ? setConfirmPause(true) : doSave());

        if (view === "place") return (
          <>
            <div style={topBar}>
              <Button variant="ghost" size="icon" onClick={() => setView("form")} aria-label="뒤로"><ChevronLeft size={22} /></Button>
              <h3 style={titleStyle}>장소 선택</h3>
              <span style={{ width: 36 }} />
            </div>
            <div style={{ display: "flex", flex: 1, minHeight: 0, borderTop: "1px solid rgba(0,0,0,.06)" }}>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, width: "65%", flexShrink: 0, overflowY: "auto", background: "#F3F4F2" }}>
                {brandsSorted.map((b) => {
                  const on = b.id === brandId;
                  return (
                    <li key={b.id} style={{ display: "flex", alignItems: "stretch", background: on ? "#fff" : "transparent" }}>
                      <Button variant="ghost" size="none" onClick={() => pickBrand(b)}
                        style={{ flex: 1, minWidth: 0, justifyContent: "flex-start", gap: 8, padding: "14px 0 14px 16px", borderRadius: 0, textAlign: "left", fontSize: 15, overflow: "hidden", whiteSpace: "nowrap", outline: "none", fontWeight: on ? 700 : 400, color: on ? INK : "rgba(0,0,0,.6)" }}>
                        <span style={{ width: 8, height: 8, borderRadius: 999, background: b.color, flexShrink: 0 }} />
                        <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.name}</span>
                      </Button>
                      <HeartBtn on={fav(b)} onClick={() => onToggleFav(`b:${b.id}`)} label={`${b.name} 즐겨찾기`} />
                    </li>
                  );
                })}
              </ul>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, width: "35%", minWidth: 0, overflowY: "auto" }}>
                {(brand.branches.length ? brand.branches : [null]).map((br) => {
                  const text = br ? `${brand.name} ${br}` : brand.name;
                  const on = place?.text === text;
                  return (
                    <li key={br ?? "all"} style={{ display: "flex", alignItems: "stretch" }}>
                      <Button variant="ghost" size="none" onClick={() => { setPlace({ brandId: brand.id, text }); setView("form"); }}
                        style={{ flex: 1, minWidth: 0, justifyContent: "space-between", padding: "14px 16px", borderRadius: 0, textAlign: "left", fontSize: 15, fontWeight: on ? 700 : 400, overflow: "hidden", whiteSpace: "nowrap", outline: "none" }}>
                        <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{br ?? "지점 구분 없음"}</span>
                        {on && <Check size={18} color={ACCENT} />}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </>
        );

        if (view === "when") return (
          <WhenPicker start={start} end={end} setStart={setStart} setEnd={setEnd} endTouched={endTouched} setEndTouched={setEndTouched} onBack={() => setView("form")} />
        );

        return (
          <>
            <div style={topBar}>
              <Button variant="ghost" size="icon" onClick={close} aria-label="닫기"><X size={22} /></Button>
              <h3 style={titleStyle}>일정 추가</h3>
              <Button variant="ghost" size="none" onClick={save} disabled={!valid}
                style={{ padding: "4px 4px", fontSize: 15, fontWeight: 700, color: "#EA580C" }}>저장</Button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 32px", display: "flex", flexDirection: "column", gap: 16 }}>
              <Row icon={MapPin} label="장소">
                <Button variant="secondary" size="none" onClick={() => setView("place")}
                  style={{ width: "100%", justifyContent: "space-between", padding: "12px 14px", fontSize: 15, textAlign: "left" }}>
                  <span style={{ fontWeight: place ? 500 : 400, color: place ? INK : "rgba(0,0,0,.35)" }}>{place?.text ?? "암장을 선택하세요"}</span>
                  <ChevronRight size={18} color="rgba(0,0,0,.3)" />
                </Button>
              </Row>
              <Row icon={Clock} label="일시">
                <Button variant="secondary" size="none" onClick={() => setView("when")} aria-label="일시 선택"
                  style={{ width: "100%", justifyContent: "space-between", padding: "12px 14px", fontSize: 15, textAlign: "left" }}>
                  <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
                    <span><b style={{ display: "inline-block", width: 36, color: "rgba(0,0,0,.5)", fontWeight: 500 }}>시작</b>{fmtShort(start)}</span>
                    <span><b style={{ display: "inline-block", width: 36, color: "rgba(0,0,0,.5)", fontWeight: 500 }}>종료</b>{fmtShort(end)}</span>
                  </span>
                  <ChevronRight size={18} color="rgba(0,0,0,.3)" />
                </Button>
              </Row>
              <Row icon={Car} label="이동시간">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {TRAVEL.map((t) => (
                    <Button key={t} variant={t === travel ? "primary" : "secondary"} size="sm" pill aria-pressed={t === travel} onClick={() => setTravel(t)}>
                      {t === 0 ? "없음" : `${t}분`}
                    </Button>
                  ))}
                </div>
              </Row>
              <Row icon={Repeat} label="반복">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {REPEATS.map((r) => (
                    <Button key={r.id} variant={r.id === repeat ? "primary" : "secondary"} size="sm" pill aria-pressed={r.id === repeat} onClick={() => setRepeat(r.id)}>
                      {r.label}
                    </Button>
                  ))}
                </div>
              </Row>
              <Row icon={Bell} label="알림">
                <select value="" aria-label="알림 추가" style={fieldStyle}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "none") setAlerts([]);
                    else if (v) setAlerts((p) => (p.includes(Number(v)) ? p : [...p, Number(v)].sort((x, y) => x - y)));
                  }}>
                  <option value="">{alerts.length ? "알림 추가" : "없음 · 추가하려면 선택"}</option>
                  {ALERTS.map((a) => <option key={a.label} value={a.min ?? "none"}>{a.min === null ? "없음 (모두 삭제)" : a.label}</option>)}
                </select>
                {alerts.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                    {alerts.map((m) => (
                      <span key={m} style={{ display: "inline-flex", alignItems: "center", gap: 2, background: "#FFF1E8", color: "#C2410C", borderRadius: 999, padding: "3px 3px 3px 12px", fontSize: 14, fontWeight: 500 }}>
                        {alertLabel(m)}
                        <Button variant="ghost" size="none" aria-label={`${alertLabel(m)} 알림 삭제`} onClick={() => setAlerts((p) => p.filter((x) => x !== m))}
                          style={{ width: 24, height: 24, borderRadius: 999, color: "#C2410C" }}><X size={14} /></Button>
                      </span>
                    ))}
                  </div>
                )}
              </Row>
              <Row icon={StickyNote} label="메모">
                <textarea rows={3} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="루트, 같이 가는 사람 등" style={{ ...fieldStyle, resize: "none" }} />
              </Row>
            </div>
            {confirmPause && conflicts.length > 0 && (
              <div role="alertdialog" aria-label="이용권 정지 기간 조정" style={dlgBack}>
                <div style={dlgCard}>
                  <h4 style={{ margin: "0 0 8px", fontSize: 17 }}>정지 기간을 일정 전날까지로 조정하시겠습니까?</h4>
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: "rgba(0,0,0,.6)" }}>
                    {brandOf(place.brandId).name} {passTitle(conflicts[0])}의 정지 기간({fmtDate(conflicts[0].pause.from)}~{fmtDate(conflicts[0].pause.to)})이 이 일정과 겹쳐요.
                    확인하면 정지가 {fmtDate(addDays(start.slice(0, 10), -1))}까지로 줄고, 만료일도 그만큼 되돌아가요.
                  </p>
                  <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                    <Button variant="secondary" style={{ flex: 1 }} onClick={() => setConfirmPause(false)}>취소</Button>
                    <Button variant="primary" style={{ flex: 1 }} onClick={() => { onAdjustPasses(conflicts.map((x) => x.id), start.slice(0, 10)); setConfirmPause(false); doSave(); }}>확인</Button>
                  </div>
                </div>
              </div>
            )}
          </>
        );
      }}
    </Sheet>
  );
}

/* ---------- 일시 선택 (시작/종료를 한 화면에서) · 분은 5분 단위 ---------- */
function HeartBtn({ on, onClick, label }) {
  return (
    <Button variant="ghost" size="none" onClick={onClick} aria-label={label} aria-pressed={on} style={{ width: 36, flexShrink: 0, borderRadius: 0, outline: "none" }}>
      <Heart size={16} color={on ? ACCENT : "rgba(0,0,0,.35)"} fill={on ? ACCENT : "none"} />
    </Button>
  );
}

function WhenPicker({ start, end, setStart, setEnd, endTouched, setEndTouched, onBack }) {
  const gap = Math.max(0, new Date(end) - new Date(start));
  const mins = Math.round(gap / 60000);

  // 시작을 바꾸면 종료는 기본 3시간 뒤로 자동 설정 (종료를 직접 바꾼 뒤에는 그 소요 시간 유지), 종료는 시작보다 빠를 수 없음
  const apply = (which, part, v) => {
    const cur = which === "start" ? start : end;
    const next = part === "date" ? `${v}T${hm(cur)}` : part === "h" ? `${cur.slice(0, 11)}${v}:${cur.slice(14, 16)}` : `${cur.slice(0, 14)}${v}`;
    if (which === "start") { setStart(next); setEnd(toStr(new Date(new Date(next).getTime() + (endTouched ? gap : 3 * 3600000)))); }
    else { setEndTouched(true); setEnd(next < start ? start : next); }
  };
  const line = (which, label, value) => {
    const h24 = Number(value.slice(11, 13)), pm = h24 >= 12, h12 = h24 % 12 || 12;
    const f = { ...fieldStyle, background: "#fff", minWidth: 0 };
    return (
      <div style={{ background: "#F3F4F2", borderRadius: 14, padding: 12 }}>
        <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 700, color: which === "start" ? "#C2410C" : INK }}>{label} · {fmtShort(value)}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          <input type="date" aria-label={`${label} 날짜`} value={value.slice(0, 10)} onChange={(e) => e.target.value && apply(which, "date", e.target.value)} style={{ ...f, gridColumn: "1 / -1" }} />
          <select aria-label={`${label} 오전/오후`} value={pm ? "PM" : "AM"} onChange={(e) => apply(which, "h", pad((h12 % 12) + (e.target.value === "PM" ? 12 : 0)))} style={f}>
            <option value="AM">오전</option><option value="PM">오후</option>
          </select>
          <select aria-label={`${label} 시`} value={pad(h12)} onChange={(e) => apply(which, "h", pad((Number(e.target.value) % 12) + (pm ? 12 : 0)))} style={f}>
            {H12.map((h) => <option key={h} value={h}>{h}시</option>)}
          </select>
          <select aria-label={`${label} 분`} value={value.slice(14, 16)} onChange={(e) => apply(which, "m", e.target.value)} style={f}>
            {MIN5.map((m) => <option key={m} value={m}>{m}분</option>)}
          </select>
        </div>
      </div>
    );
  };

  return (
    <>
      <div style={topBar}>
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="뒤로"><ChevronLeft size={22} /></Button>
        <h3 style={titleStyle}>일시 선택</h3>
        <Button variant="ghost" size="none" onClick={onBack} style={{ padding: "4px 4px", fontSize: 15, fontWeight: 700, color: "#EA580C" }}>완료</Button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 32px", display: "flex", flexDirection: "column", gap: 12 }}>
        {line("start", "시작", start)}
        {line("end", "종료", end)}
        <p style={{ margin: 0, textAlign: "center", fontSize: 14, color: "rgba(0,0,0,.55)" }}>
          소요 시간 {mins === 0 ? "0분" : `${mins >= 60 ? `${Math.floor(mins / 60)}시간 ` : ""}${mins % 60 ? `${mins % 60}분` : ""}`.trim()}
        </p>
      </div>
    </>
  );
}

export function Row({ icon: Icon, label, children }) {
  return (
    <div>
      <p style={{ margin: "0 0 6px", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500, color: "rgba(0,0,0,.55)" }}>
        <Icon size={14} />{label}
      </p>
      {children}
    </div>
  );
}
