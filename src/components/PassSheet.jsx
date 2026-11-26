import { useState } from "react";
import { Clock, MapPin, Plus, Repeat, Trash2, X } from "lucide-react";
import { Button, Checkbox, ConfirmSheet, Field, Input, Sheet, SheetBody, SheetHeader } from "@/components/ui";
import { BRANDS, brandOf } from "@/constants/brands";
import { COUNTS, LIMITS, PAUSE_DEFAULT_DAYS, PERIODS, VALIDS } from "@/constants/passes";
import { addDays, fmtDate, toStr, todayKey } from "@/lib/dates";
import { newId } from "@/lib/id";
import { brandOccurrences, finishCountEdit, invalidPauses, passTitle, pauseDays, pauseOverlaps, statusMap, withExpires } from "@/lib/passes";
import "@/components/PassSheet.css";

/* ---------- 이용권 추가 / 수정 시트 ----------
   initial: 수정할 이용권(없으면 새로 추가) · preset: { pause: true } 정지 한 줄 미리 추가 / { start: "YYYY-MM-DD" } 사용 시작일 미리 채움
   passes: 같은 종류 이용중 이용권 경고용 · events/onDeleteRange: 새 정지와 겹치는 일정 정리 · onSave(pass) */
const toNum = (s) => (String(s).trim() === "" ? NaN : Number(s));
const inRange = (n, [lo, hi]) => Number.isInteger(n) && n >= lo && n <= hi;

export default function PassSheet({ initial, preset, passes, events, onSave, onDeleteRange, onClose }) {
  const edit = !!initial;
  const [brand, setBrand] = useState(initial?.brand ?? BRANDS[0].id);
  const [kind, setKind] = useState(initial?.kind ?? "period");
  const [waiting, setWaiting] = useState(edit ? initial.start == null && !preset?.start : false);
  const [start, setStart] = useState(initial?.start ?? preset?.start ?? todayKey);
  const [days, setDays] = useState(String(initial?.days ?? 30)); // 기간권 기간
  const [total, setTotal] = useState(String(initial?.total ?? 10)); // 횟수권 총 횟수
  const [remaining, setRemaining] = useState(String(initial?.remaining ?? 10)); // 횟수권 남은 횟수
  const [validDays, setValidDays] = useState(String(initial?.validDays ?? 365)); // 횟수권 유효기간
  const [bonus, setBonus] = useState(String(initial?.bonusDays ?? 0)); // 추가 일수 (±)
  const [pauses, setPauses] = useState(() => {
    const l = (initial?.pauses ?? []).map((z) => ({ ...z }));
    return preset?.pause ? [...l, { id: newId(), from: todayKey, to: addDays(todayKey, PAUSE_DEFAULT_DAYS - 1) }] : l;
  });
  const [ask, setAsk] = useState(null); // 새 정지와 겹치는 일정 [{date, place}]
  const [tried, setTried] = useState(false);

  const isPeriod = kind === "period";
  const d = toNum(days), t = toNum(total), r = toNum(remaining), v = toNum(validDays), bd = toNum(bonus);
  const errors = {};
  if (isPeriod && !inRange(d, LIMITS.days)) errors.days = `${LIMITS.days[0]}~${LIMITS.days[1]}일 사이로 입력해 주세요.`;
  if (!isPeriod) {
    if (!inRange(t, LIMITS.total)) errors.total = `${LIMITS.total[0]}~${LIMITS.total[1]}회 사이로 입력해 주세요.`;
    else if (!inRange(r, [0, t])) errors.remaining = `0~${t}회 사이로 입력해 주세요.`;
    if (!inRange(v, LIMITS.validDays)) errors.validDays = `${LIMITS.validDays[0]}~${LIMITS.validDays[1]}일 사이로 입력해 주세요.`;
  }
  if (!inRange(bd, LIMITS.bonusDays)) errors.bonus = "정수로 입력해 주세요. (줄이려면 −)";
  if (!waiting && !start) errors.start = "시작일을 골라 주세요.";
  const usePauses = isPeriod && !waiting;
  const badPause = usePauses && invalidPauses(pauses).length > 0;
  const overlapPairs = usePauses ? pauseOverlaps(pauses.filter((z) => z.from && z.to)) : [];
  const hasError = Object.keys(errors).length > 0 || badPause;

  // 입력값으로 만든 이용권 (미리보기 · 저장 공통)
  const draft = () => {
    const base = { ...(initial ?? { id: newId(), createdAt: new Date().toISOString() }), brand, kind, start: waiting ? null : start, bonusDays: Number.isInteger(bd) ? bd : 0 };
    if (isPeriod) return withExpires({ ...base, days: d, pauses: usePauses ? [...pauses].sort((a, b) => a.from.localeCompare(b.from)) : [] });
    return finishCountEdit(initial ?? null, { ...base, total: t, remaining: r, validDays: v, pauses: [] }, toStr(new Date()));
  };
  const preview = !hasError && !waiting ? draft().expires : null;
  const pauseSum = usePauses && !badPause ? pauses.reduce((n, z) => n + pauseDays(z), 0) : 0;

  // 같은 브랜드·같은 종류의 이용중 이용권이 이미 있으면 안내만 (막지 않음)
  const stMap = statusMap(passes);
  const other = !waiting && passes.find((x) => x.id !== initial?.id && x.brand === brand && x.kind === kind && stMap[x.id] === "active");

  const setTotalAdjust = (s) => { // 총 횟수를 바꾸면 쓴 횟수는 그대로 두고 남은 횟수가 따라간다
    const used = Number.isInteger(t) && Number.isInteger(r) ? t - r : 0, nt = toNum(s);
    setTotal(s); if (Number.isInteger(nt) && nt >= 1) setRemaining(String(Math.max(0, Math.min(nt, nt - used))));
  };
  const setPause = (id, patch) => setPauses((l) => l.map((z) => (z.id === id ? { ...z, ...patch } : z)));
  const addPause = () => setPauses((l) => [...l, { id: newId(), from: todayKey, to: addDays(todayKey, PAUSE_DEFAULT_DAYS - 1) }]);

  // 오늘 이후로 새로 생기거나 바뀐 정지와 겹치는 일정
  const findOverlaps = () => {
    if (!usePauses) return [];
    const was = new Set((initial?.pauses ?? []).map((z) => `${z.from}|${z.to}`));
    const seen = new Set(), out = [];
    pauses.filter((z) => !was.has(`${z.from}|${z.to}`) && z.to >= todayKey).forEach((z) => {
      brandOccurrences(events, brand, z.from < todayKey ? todayKey : z.from, z.to).forEach((o) => { const k = `${o.date}|${o.place}`; if (!seen.has(k)) { seen.add(k); out.push(o); } });
    });
    return out;
  };
  const commit = (close) => { onSave(draft()); close(); };
  const submit = (close) => {
    setTried(true);
    if (hasError) return;
    const ov = findOverlaps();
    if (ov.length) setAsk(ov); else commit(close);
  };
  const clearOverlaps = (close) => {
    pauses.filter((z) => z.to >= todayKey).forEach((z) => onDeleteRange(brand, z.from < todayKey ? todayKey : z.from, z.to));
    commit(close);
  };

  const chip = (on) => ({ variant: on ? "primary" : "secondary", size: "sm", pill: true, "aria-pressed": on });
  const numField = (id, label, value, set, err, props = {}) => (
    <Input id={id} type="number" inputMode="numeric" aria-label={label} value={value} onChange={(e) => set(e.target.value)} error={tried ? err : undefined} {...props} />
  );
  const title = edit ? "이용권 수정" : "이용권 추가";

  return (
    <Sheet label={title} onClose={onClose}>
      {(close) => (
        <>
          <SheetHeader left={<Button variant="ghost" size="icon" onClick={close} aria-label="닫기"><X size={22} /></Button>} title={title} />
          <SheetBody>
            <Field icon={MapPin} label="브랜드 (지점 구분 없이 브랜드 단위로 관리)" htmlFor="ps-brand">
              <Input as="select" id="ps-brand" aria-label="이용권 브랜드" value={brand} onChange={(e) => setBrand(e.target.value)}>{BRANDS.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Input>
            </Field>
            <Field icon={Repeat} label="종류">
              {edit
                ? <p className="ps-fixed">{isPeriod ? "기간권" : "횟수권"} <span>· 종류는 바꿀 수 없어요. 필요하면 새로 추가해 주세요.</span></p>
                : <div className="ps-chips">
                    <Button {...chip(isPeriod)} onClick={() => { setKind("period"); setDays("30"); }}>기간권</Button>
                    <Button {...chip(!isPeriod)} onClick={() => { setKind("count"); setTotal("10"); setRemaining("10"); setValidDays("365"); }}>횟수권</Button>
                  </div>}
            </Field>

            <Field icon={Clock} label="시작일" htmlFor="ps-start" error={tried ? errors.start : undefined}>
              <Input id="ps-start" type="date" aria-label="이용권 시작일" value={start} disabled={waiting} onChange={(e) => e.target.value && setStart(e.target.value)} />
              <Checkbox className="ps-waiting" checked={waiting} onChange={(e) => setWaiting(e.target.checked)}>아직 사용을 시작하지 않았어요 (사용대기)</Checkbox>
            </Field>

            {isPeriod ? (
              <Field icon={Clock} label="이용 기간 (일)" htmlFor="ps-days">
                <div className="ps-chips">
                  {PERIODS.map((o) => <Button key={o.days} {...chip(d === o.days)} onClick={() => setDays(String(o.days))}>{o.label} ({o.days}일)</Button>)}
                </div>
                {numField("ps-days", "이용 기간(일)", days, setDays, errors.days, { min: 1 })}
              </Field>
            ) : (
              <>
                <Field icon={Clock} label="총 횟수" htmlFor="ps-total">
                  <div className="ps-chips">
                    {COUNTS.map((n) => <Button key={n} {...chip(t === n)} onClick={() => { setTotalAdjust(String(n)); if (!edit) setValidDays(n === 5 ? "180" : "365"); }}>{n}회</Button>)}
                  </div>
                  {numField("ps-total", "총 횟수", total, setTotalAdjust, errors.total, { min: 1 })}
                </Field>
                <Field icon={Clock} label={`남은 횟수${Number.isInteger(t) && Number.isInteger(r) && t >= r ? ` · 이미 ${t - r}회 사용` : ""}`} htmlFor="ps-remaining">
                  {numField("ps-remaining", "남은 횟수", remaining, setRemaining, errors.remaining, { min: 0 })}
                  <p className="ps-hint">앱에 일정을 넣지 않고 다녀온 날이 있으면 지금 실제로 남은 횟수로 맞춰 주세요. 저장한 순간부터 시작하는 일정만 다음날 자동으로 차감돼요.</p>
                </Field>
                <Field icon={Clock} label="유효기간 (시작일부터, 일)" htmlFor="ps-valid">
                  <div className="ps-chips">
                    {VALIDS.map((o) => <Button key={o.days} {...chip(v === o.days)} onClick={() => setValidDays(String(o.days))}>{o.label} ({o.days}일)</Button>)}
                  </div>
                  {numField("ps-valid", "유효기간(일)", validDays, setValidDays, errors.validDays, { min: 1 })}
                </Field>
              </>
            )}

            {usePauses && (
              <Field icon={Clock} label={`정지 이력 (${pauses.length}회 · 지난 정지도 추가할 수 있어요)`}>
                <div className="ps-pauses" data-pauses>
                  {pauses.length === 0 && <p className="ps-hint">등록된 정지가 없어요.</p>}
                  {pauses.map((z, i) => (
                    <div key={z.id} className="ps-pause" data-pause-row>
                      <Input type="date" aria-label={`정지 ${i + 1} 시작일`} value={z.from} onChange={(e) => e.target.value && setPause(z.id, { from: e.target.value })} data-invalid={tried && z.to < z.from ? true : undefined} />
                      <span aria-hidden="true">~</span>
                      <Input type="date" aria-label={`정지 ${i + 1} 종료일`} value={z.to} onChange={(e) => e.target.value && setPause(z.id, { to: e.target.value })} data-invalid={tried && z.to < z.from ? true : undefined} />
                      <Button variant="ghost" size="icon" aria-label={`정지 ${i + 1} 삭제`} onClick={() => setPauses((l) => l.filter((x) => x.id !== z.id))}><Trash2 size={16} /></Button>
                    </div>
                  ))}
                  {tried && badPause && <p role="alert" className="ps-error">정지 종료일이 시작일보다 빠른 항목이 있어요.</p>}
                  {overlapPairs.length > 0 && <p role="status" className="ps-warn">정지 기간이 서로 겹쳐요. 겹치는 날은 일수가 중복 계산돼요.</p>}
                  <Button variant="secondary" size="sm" onClick={addPause}><Plus size={14} />정지 추가</Button>
                </div>
              </Field>
            )}

            <Field icon={Clock} label="추가 일수 (암장이 더 주거나 줄인 날, −도 가능)" htmlFor="ps-bonus">
              {numField("ps-bonus", "추가 일수", bonus, setBonus, errors.bonus)}
            </Field>

            {other && <p role="status" className="ps-warn" data-warn="dup">{brandOf(brand).name} {passTitle(other)}이(가) 이미 이용 중이에요. 그래도 같은 종류를 함께 등록할 수 있어요.</p>}
            <p className="ps-summary" data-summary>
              {waiting ? "사용을 시작하면 만료일이 정해져요."
                : preview ? <>만료일 <b>{fmtDate(preview)}</b>{isPeriod && <> ({d}일{pauseSum > 0 ? ` + 정지 ${pauseSum}일` : ""}{bd ? ` ${bd > 0 ? "+" : "−"} 추가 ${Math.abs(bd)}일` : ""})</>}</>
                : "입력값을 확인해 주세요."}
            </p>
          </SheetBody>
          <div className="ui-sheet__footer">
            <Button variant="secondary" size="lg" onClick={close}>취소</Button>
            <Button variant="primary" size="lg" onClick={() => submit(close)}>{edit ? "저장" : "이용권 추가"}</Button>
          </div>
          {ask && (
            <ConfirmSheet label="정지 기간 일정 정리" title={`정지 기간에 ${brandOf(brand).name} 일정이 있어요`} onClose={() => setAsk(null)} actions={() => <>
              <Button variant="secondary" onClick={() => commit(close)}>일정은 그대로</Button>
              <Button variant="danger-solid" onClick={() => clearOverlaps(close)}>일정 삭제</Button>
            </>}>
              <p className="ui-sheet__text">
                {ask.slice(0, 3).map((o) => `${fmtDate(o.date)} ${o.place}`).join(", ")}{ask.length > 3 ? ` 외 ${ask.length - 3}건` : ""} (총 {ask.length}건)
              </p>
            </ConfirmSheet>
          )}
        </>
      )}
    </Sheet>
  );
}
