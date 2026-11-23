import { useState } from "react";
import { Bell, Car, Check, ChevronLeft, ChevronRight, Clock, Heart, MapPin, Repeat, StickyNote, X } from "lucide-react";
import { Button, ConfirmSheet, Field, Input, Sheet, SheetBody, SheetHeader } from "@/components/ui";
import { BRANDS, CUSTOM, brandOf, ko } from "@/constants/brands";
import { ALERTS, REPEATS, TRAVEL } from "@/constants/schedule";
import { H12, MIN5, addDays, alertLabel, defaultStart, fmtDate, fmtShort, hm, pad, plus3h, toStr } from "@/lib/dates";
import { inPause, passTitle } from "@/lib/passes";
import "@/components/AddSheet.css";

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
    <Sheet onClose={onClose}>
      {(close) => {
        const doSave = () => {
          onSave({ id: Date.now(), brand: place.brandId, place: place.text, start, end, travel, repeat, alerts, memo: memo.trim() });
          close();
        };
        // 일정 날짜가 같은 브랜드 이용권의 정지 기간에 속하면 조정 확인 팝업
        const conflicts = place ? passes.filter((x) => x.brand === place.brandId && inPause(x, start.slice(0, 10))) : [];
        const save = () => (conflicts.length ? setConfirmPause(true) : doSave());
        const back = (to = "form") => <Button variant="ghost" size="icon" onClick={() => setView(to)} aria-label="뒤로"><ChevronLeft size={22} /></Button>;

        if (view === "place") return (
          <>
            <SheetHeader left={back()} title="장소 선택" />
            <div className="place">
              <ul className="place__brands">
                {brandsSorted.map((b) => {
                  const on = b.id === brandId;
                  return (
                    <li key={b.id} className="place__brand" data-on={on || undefined}>
                      <Button variant="ghost" size="bare" className="place__brand-btn" onClick={() => pickBrand(b)}>
                        <span className="brand-dot" style={{ "--brand": b.color, "--dot-size": "8px" }} />
                        <span className="place__ellipsis">{b.name}</span>
                      </Button>
                      <HeartBtn on={fav(b)} onClick={() => onToggleFav(`b:${b.id}`)} label={`${b.name} 즐겨찾기`} />
                    </li>
                  );
                })}
              </ul>
              <ul className="place__branches">
                {(brand.branches.length ? brand.branches : [null]).map((br) => {
                  const text = br ? `${brand.name} ${br}` : brand.name;
                  const on = place?.text === text;
                  return (
                    <li key={br ?? "all"}>
                      <Button variant="ghost" size="bare" className="place__branch-btn" data-on={on || undefined} onClick={() => { setPlace({ brandId: brand.id, text }); setView("form"); }}>
                        <span className="place__ellipsis">{br ?? "지점 구분 없음"}</span>
                        {on && <Check size={18} className="place__check" />}
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
            <SheetHeader
              left={<Button variant="ghost" size="icon" onClick={close} aria-label="닫기"><X size={22} /></Button>}
              title="일정 추가"
              right={<Button variant="ghost" size="bare" className="sheet-action" onClick={save} disabled={!valid}>저장</Button>}
            />
            <SheetBody>
              <Field icon={MapPin} label="장소">
                <Button variant="secondary" size="bare" fullWidth className="add__select" onClick={() => setView("place")}>
                  <span className="add__select-value" data-empty={!place || undefined}>{place?.text ?? "암장을 선택하세요"}</span>
                  <ChevronRight size={18} className="add__chevron" />
                </Button>
              </Field>
              <Field icon={Clock} label="일시">
                <Button variant="secondary" size="bare" fullWidth className="add__select" onClick={() => setView("when")} aria-label="일시 선택">
                  <span className="add__when">
                    <span><b className="add__when-label">시작</b>{fmtShort(start)}</span>
                    <span><b className="add__when-label">종료</b>{fmtShort(end)}</span>
                  </span>
                  <ChevronRight size={18} className="add__chevron" />
                </Button>
              </Field>
              <Field icon={Car} label="이동시간">
                <div className="add__chips">
                  {TRAVEL.map((t) => (
                    <Button key={t} variant={t === travel ? "primary" : "secondary"} size="sm" pill aria-pressed={t === travel} onClick={() => setTravel(t)}>
                      {t === 0 ? "없음" : `${t}분`}
                    </Button>
                  ))}
                </div>
              </Field>
              <Field icon={Repeat} label="반복">
                <div className="add__chips">
                  {REPEATS.map((r) => (
                    <Button key={r.id} variant={r.id === repeat ? "primary" : "secondary"} size="sm" pill aria-pressed={r.id === repeat} onClick={() => setRepeat(r.id)}>
                      {r.label}
                    </Button>
                  ))}
                </div>
              </Field>
              <Field icon={Bell} label="알림">
                <Input as="select" value="" aria-label="알림 추가"
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "none") setAlerts([]);
                    else if (v) setAlerts((p) => (p.includes(Number(v)) ? p : [...p, Number(v)].sort((x, y) => x - y)));
                  }}>
                  <option value="">{alerts.length ? "알림 추가" : "없음 · 추가하려면 선택"}</option>
                  {ALERTS.map((a) => <option key={a.label} value={a.min ?? "none"}>{a.min === null ? "없음 (모두 삭제)" : a.label}</option>)}
                </Input>
                {alerts.length > 0 && (
                  <div className="add__chips add__alerts">
                    {alerts.map((m) => (
                      <span key={m} className="alert-chip">
                        {alertLabel(m)}
                        <Button variant="ghost" size="bare" className="alert-chip__x" aria-label={`${alertLabel(m)} 알림 삭제`} onClick={() => setAlerts((p) => p.filter((x) => x !== m))}><X size={14} /></Button>
                      </span>
                    ))}
                  </div>
                )}
              </Field>
              <Field icon={StickyNote} label="메모">
                <Input as="textarea" aria-label="메모" rows={3} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="루트, 같이 가는 사람 등" />
              </Field>
            </SheetBody>
            {confirmPause && conflicts.length > 0 && (
              <ConfirmSheet label="이용권 정지 기간 조정" title="정지 기간을 일정 전날까지로 조정하시겠습니까?" onClose={() => setConfirmPause(false)} actions={(c) => <>
                <Button variant="secondary" onClick={c}>취소</Button>
                <Button variant="primary" onClick={() => { onAdjustPasses(conflicts.map((x) => x.id), start.slice(0, 10)); setConfirmPause(false); doSave(); }}>확인</Button>
              </>}>
                <p className="ui-sheet__text">
                  {brandOf(place.brandId).name} {passTitle(conflicts[0])}의 정지 기간({fmtDate(conflicts[0].pause.from)}~{fmtDate(conflicts[0].pause.to)})이 이 일정과 겹쳐요.
                  확인하면 정지가 {fmtDate(addDays(start.slice(0, 10), -1))}까지로 줄고, 만료일도 그만큼 되돌아가요.
                </p>
              </ConfirmSheet>
            )}
          </>
        );
      }}
    </Sheet>
  );
}

function HeartBtn({ on, onClick, label }) {
  return (
    <Button variant="ghost" size="bare" className="place__heart" onClick={onClick} aria-label={label} aria-pressed={on}>
      <Heart size={16} className="place__heart-icon" data-on={on || undefined} />
    </Button>
  );
}

/* ---------- 일시 선택 (시작/종료를 한 화면에서) · 분은 5분 단위 ---------- */
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
    return (
      <div className="when__card">
        <div className="when__title" data-which={which}>{label} · {fmtShort(value)}</div>
        <div className="when__grid">
          <Input type="date" data-surface="white" className="when__date" aria-label={`${label} 날짜`} value={value.slice(0, 10)} onChange={(e) => e.target.value && apply(which, "date", e.target.value)} />
          <Input as="select" data-surface="white" aria-label={`${label} 오전/오후`} value={pm ? "PM" : "AM"} onChange={(e) => apply(which, "h", pad((h12 % 12) + (e.target.value === "PM" ? 12 : 0)))}>
            <option value="AM">오전</option><option value="PM">오후</option>
          </Input>
          <Input as="select" data-surface="white" aria-label={`${label} 시`} value={pad(h12)} onChange={(e) => apply(which, "h", pad((Number(e.target.value) % 12) + (pm ? 12 : 0)))}>
            {H12.map((h) => <option key={h} value={h}>{h}시</option>)}
          </Input>
          <Input as="select" data-surface="white" aria-label={`${label} 분`} value={value.slice(14, 16)} onChange={(e) => apply(which, "m", e.target.value)}>
            {MIN5.map((m) => <option key={m} value={m}>{m}분</option>)}
          </Input>
        </div>
      </div>
    );
  };

  return (
    <>
      <SheetHeader
        left={<Button variant="ghost" size="icon" onClick={onBack} aria-label="뒤로"><ChevronLeft size={22} /></Button>}
        title="일시 선택"
        right={<Button variant="ghost" size="bare" className="sheet-action" onClick={onBack}>완료</Button>}
      />
      <SheetBody gap={12}>
        {line("start", "시작", start)}
        {line("end", "종료", end)}
        <p className="when__duration">
          소요 시간 {mins === 0 ? "0분" : `${mins >= 60 ? `${Math.floor(mins / 60)}시간 ` : ""}${mins % 60 ? `${mins % 60}분` : ""}`.trim()}
        </p>
      </SheetBody>
    </>
  );
}
