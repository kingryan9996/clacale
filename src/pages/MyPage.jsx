import { useRef, useState } from "react";
import { ChevronDown, ChevronLeft, Clock, Heart, MapPin, Plus, Repeat, X } from "lucide-react";
import { Row, fieldStyle } from "../components/AddSheet";
import Button from "../components/Button";
import { dlgBack, dlgCard } from "../components/DetailSheet";
import Sheet, { titleStyle, topBar } from "../components/Sheet";
import { ACCENT, BRANDS, brandOf } from "../lib/constants";
import { addDays, fmtDate, keyOf, todayKey } from "../lib/dates";
import { COUNTS, PERIODS, VALIDS, brandOccurrences, endDate, passLine, passTitle, pauseHistory, pauseState, shortenPause, startPause, statusMap } from "../lib/passes";

/* ---------- 마이페이지: 프로필 / 내 이용권 / 찜 센터 / 커스텀 암장 ---------- */
export default function MyPage({ session, passes, favs, customGyms, savePasses, saveGyms, onToggleFav, events, onDeleteRange, onClose }) {
  const [view, setView] = useState("main"); // main | addPass
  const [pausing, setPausing] = useState(null); // 정지 설정 중인 이용권 id
  const [gymName, setGymName] = useState("");
  const [pb, setPb] = useState(BRANDS[0].id);
  const [kind, setKind] = useState("period");
  const [opt, setOpt] = useState(30);
  const [pstart, setPstart] = useState(todayKey);
  const [pfrom, setPfrom] = useState(todayKey); // 정지 시작일 (기본: 오늘)
  const [pdays, setPdays] = useState(15); // 정지 기간 (기본 15일, 1~15일)
  const [delAsk, setDelAsk] = useState(false); // 정지 기간 내 일정 삭제 확인
  const [showEnded, setShowEnded] = useState(false); // '소진된 이용권' 아코디언
  const [busy, setBusy] = useState(null); // 1회 사용 처리 중인 이용권 id
  const lock = useRef(false);
  const [valid, setValid] = useState(365); // 횟수권 유효기간(일)
  const [delPass, setDelPass] = useState(null); // 삭제 확인 중인 이용권 id
  const [activating, setActivating] = useState(null); // 사용 시작일 지정 중인 이용권 id
  const [astart, setAstart] = useState(todayKey);
  const guest = session.type === "guest";
  const favBrands = BRANDS.filter((b) => favs.includes(`b:${b.id}`));
  const sec = { margin: "0 0 8px", fontSize: 15, fontWeight: 700 };
  const box = { background: "#F3F4F2", borderRadius: 14, padding: 14 };
  const pausingPass = passes.find((x) => x.id === pausing);

  const stMap = statusMap(passes);
  const ORDER = { active: 0, waiting: 1, expired: 2 };
  const sorted = [...passes].sort((a, b) => ORDER[stMap[a.id]] - ORDER[stMap[b.id]] || a.id - b.id); // 이용중 -> 사용대기 -> 만료됨
  const LABEL = { active: { label: "이용중", color: "#047857", bg: "#D1FAE5" }, waiting: { label: "사용대기", color: "#1D4ED8", bg: "#DBEAFE" }, expired: { label: "만료됨", color: "#6B7280", bg: "#E5E7EB" } };
  // 같은 브랜드에서 같은 종류(기간권끼리 / 횟수권끼리)의 이용중(만료/소진 전) 이용권이 있을 때만 등록 불가 (다른 종류는 별개로 등록 가능)
  const activeOfBrand = passes.find((x) => x.brand === pb && x.kind === kind && stMap[x.id] === "active");
  const blocked = !!activeOfBrand;
  const liveList = sorted.filter((x) => stMap[x.id] !== "expired"); // 이용중 -> 사용대기
  const endedList = passes.filter((x) => stMap[x.id] === "expired").sort((a, b) => endDate(b).localeCompare(endDate(a)) || b.id - a.id); // 종료일이 오늘에 가까운 순
  const pto = addDays(pfrom, pdays - 1);
  const overlaps = pausingPass ? brandOccurrences(events, pausingPass.brand, pfrom, pto) : [];
  const openAdd = () => { setPstart(keyOf(new Date())); setKind("period"); setOpt(30); setValid(365); setView("addPass"); }; // 열 때마다 시작일 = 오늘
  const addPass = () => {
    if (blocked) return;
    const base = { id: Date.now(), brand: pb, kind, pause: null, start: pstart };
    savePasses((l) => [...l, kind === "period"
      ? { ...base, days: opt, expires: addDays(pstart, opt - 1) }
      : { ...base, total: opt, remaining: opt, validDays: valid, expires: addDays(pstart, valid - 1) }]); // 횟수권도 등록일부터 유효기간
    setView("main");
  };
  // 사용 시작일 지정: 기간권은 이 날짜 기준으로 만료일 계산, 이용중으로 전환 (기본값: 같은 종류 이용중 이용권이 끝난 다음 날, 없으면 오늘)
  const openActivate = (x) => {
    const last = passes.filter((y) => y.brand === x.brand && y.kind === x.kind && stMap[y.id] === "active" && y.expires).map((y) => y.expires).sort().pop();
    setAstart(last && last >= todayKey ? addDays(last, 1) : keyOf(new Date())); setActivating(x.id);
  };
  const confirmActivate = () => { savePasses((l) => l.map((y) => (y.id === activating ? { ...y, start: astart, expires: y.kind === "period" ? addDays(astart, y.days - 1) : y.validDays ? addDays(astart, y.validDays - 1) : null } : y))); setActivating(null); };
  const unpause = (x) => savePasses((l) => l.map((y) => (y.id === x.id ? shortenPause(y, addDays(todayKey, -1)) : y))); // 오늘부터 정지 해제
  const applyPause = () => { savePasses((l) => l.map((y) => (y.id === pausing ? startPause(y, pfrom, pdays) : y))); setPausing(null); setDelAsk(false); };
  const confirmPauseSet = () => (overlaps.length ? setDelAsk(true) : applyPause()); // 겹치는 일정이 있으면 삭제 여부 먼저 확인
  // 1회 사용: 처리 중에는 잠그고(ref+비활성) 연타/더블클릭에도 정확히 1회만 차감, 0회가 되면 소진된 이용권으로 이동
  const consumeOnce = (x) => {
    if (lock.current) return;
    lock.current = true; setBusy(x.id);
    savePasses((l) => l.map((y) => (y.id === x.id && y.remaining > 0 ? { ...y, remaining: y.remaining - 1, ...(y.remaining - 1 <= 0 ? { endedOn: keyOf(new Date()) } : null) } : y)));
    setTimeout(() => { lock.current = false; setBusy(null); }, 700);
  };
  const chip = (on) => ({ variant: on ? "primary" : "secondary", size: "sm", pill: true, "aria-pressed": on });
  const mini = { padding: "4px 10px", fontSize: 12, borderRadius: 8 }; // 카드 안 작은 버튼
  // 컴팩트 카드 2행 구성
  //  1행: [브랜드명 · 종류] | [정지 이력] | [상태 배지]
  //  2행: [유효 기간 · D-day] | [버튼 그룹]
  const renderPass = (x) => {
    const sk = stMap[x.id], ps = pauseState(x), b = brandOf(x.brand);
    const badge = ps === "active" ? { label: "정지중", color: "#B45309", bg: "#FEF3C7" } : LABEL[sk];
    const hist = x.kind === "period" ? (sk === "waiting" ? null : pauseHistory(x) ? `정지 ${pauseHistory(x)}회` : "정지 이력 없음") : x.usedKeys?.length ? `자동 차감 ${x.usedKeys.length}회` : null;
    return (
      <div key={x.id} data-pass={x.id} data-status={sk} style={{ ...box, padding: "10px 12px", borderRadius: 12, opacity: sk === "expired" ? 0.5 : 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0, fontSize: 14, fontWeight: 700 }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: b.color, flexShrink: 0 }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.name} · {passTitle(x)}</span>
          </span>
          {hist && <span style={{ flexShrink: 0, fontSize: 12, color: "rgba(0,0,0,.5)" }}>{hist}</span>}
          <span style={{ flexShrink: 0, borderRadius: 999, padding: "1px 8px", fontSize: 11, fontWeight: 700, color: badge.color, background: badge.bg }}>{badge.label}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 6 }}>
          <span style={{ minWidth: 0, fontSize: 12.5, lineHeight: 1.35, color: "rgba(0,0,0,.6)", wordBreak: "keep-all" }}>
            {passLine(x, sk)}
          </span>
          <span style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            {x.kind === "count" && sk === "active" && <Button variant="secondary" size="sm" style={mini} disabled={busy === x.id} onClick={() => consumeOnce(x)}>1회 사용</Button>}
            {ps === "active" || ps === "scheduled"
              ? <Button variant="outline" size="sm" style={mini} onClick={() => unpause(x)}>정지 해제</Button>
              : sk === "active" && x.kind === "period" && <Button variant="outline" size="sm" style={mini} onClick={() => { setPfrom(todayKey); setPdays(15); setPausing(x.id); }}>기간 정지</Button>}
            {sk === "waiting" && <Button variant="outline" size="sm" style={mini} onClick={() => openActivate(x)}>사용 시작일 지정</Button>}
            <Button variant="danger" size="sm" style={mini} aria-label={`${b.name} ${passTitle(x)} 삭제`} onClick={() => setDelPass(x.id)}>삭제</Button>
          </span>
        </div>
        {(ps === "active" || ps === "scheduled") && (
          <div style={{ marginTop: 4, fontSize: 12.5, fontWeight: 600, color: "#B45309" }}>
            {ps === "active" ? "정지 기간" : "정지 예정 기간"}: {fmtDate(x.pause.from)} ~ {fmtDate(x.pause.to)}
          </div>
        )}
      </div>
    );
  };

  return (
    <Sheet full onClose={onClose}>
      {(close) => (
        <>
          <div style={topBar}>
            <Button variant="ghost" size="icon" onClick={view === "main" ? close : () => setView("main")} aria-label={view === "main" ? "닫기" : "뒤로"}>{view === "main" ? <X size={22} /> : <ChevronLeft size={22} />}</Button>
            <h3 style={titleStyle}>{view === "main" ? "마이페이지" : "이용권 추가"}</h3>
            <span style={{ width: 36 }} />
          </div>

          {view === "addPass" ? (
            <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 32px", display: "flex", flexDirection: "column", gap: 16 }}>
              <Row icon={MapPin} label="브랜드 (지점 구분 없이 브랜드 단위로 관리)">
                <select aria-label="이용권 브랜드" value={pb} onChange={(e) => setPb(e.target.value)} style={fieldStyle}>{BRANDS.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
              </Row>
              <Row icon={Repeat} label="종류">
                <div style={{ display: "flex", gap: 8 }}>
                  <Button {...chip(kind === "period")} onClick={() => { setKind("period"); setOpt(30); }}>기간권</Button>
                  <Button {...chip(kind === "count")} onClick={() => { setKind("count"); setOpt(10); setValid(365); }}>횟수권</Button>
                </div>
              </Row>
              <Row icon={Clock} label={kind === "period" ? "기간" : "횟수"}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {kind === "period"
                    ? PERIODS.map((o) => <Button key={o.days} {...chip(opt === o.days)} onClick={() => setOpt(o.days)}>{o.label} ({o.days}일)</Button>)
                    : COUNTS.map((n) => <Button key={n} {...chip(opt === n)} onClick={() => { setOpt(n); setValid(n === 5 ? 180 : 365); }}>{n}회</Button>)}
                </div>
              </Row>
              {kind === "count" && (
                <Row icon={Clock} label="유효기간 (시작일부터)">
                  <div style={{ display: "flex", gap: 8 }}>
                    {VALIDS.map((o) => <Button key={o.days} {...chip(valid === o.days)} onClick={() => setValid(o.days)}>{o.label} ({o.days}일)</Button>)}
                  </div>
                </Row>
              )}
              <Row icon={Clock} label="시작일">
                <input type="date" aria-label="이용권 시작일" value={pstart} onChange={(e) => e.target.value && setPstart(e.target.value)} style={fieldStyle} />
              </Row>
              {blocked && <p role="alert" style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: "#B91C1C" }}>{brandOf(pb).name} {passTitle(activeOfBrand)}이(가) 이용 중이라 같은 종류의 이용권은 등록할 수 없어요. 만료되거나 소진된 후에 등록할 수 있어요.</p>}
              <Button variant="primary" size="lg" disabled={blocked} onClick={addPass}>이용권 추가</Button>
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 32px", display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ ...box, display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ width: 44, height: 44, borderRadius: 999, background: ACCENT, color: "#000", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 18, flexShrink: 0 }}>{guest ? "G" : (session.name || "?").slice(0, 1).toUpperCase()}</span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{guest ? "비회원(Guest)" : session.name}</span>
                  <span style={{ display: "block", fontSize: 13, color: "rgba(0,0,0,.5)" }}>{guest ? "이 기기에만 저장돼요" : `${session.provider} 로그인`}</span>
                </span>
              </div>

              <section>
                <h4 style={sec}>내 이용권</h4>
                {/* 이용권 전체 영역: 화면 높이의 60%를 넘으면 안에서 스크롤 */}
                <div data-passes-scroll style={{ maxHeight: "60vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
                  {[["period", "기간권"], ["count", "횟수권"]].map(([kk, label]) => (
                    <div key={kk}>
                      <div style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 700, color: "rgba(0,0,0,.55)" }}>{label}</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {liveList.filter((x) => x.kind === kk).length === 0 && <p style={{ margin: 0, fontSize: 14, color: "rgba(0,0,0,.45)" }}>등록된 {label}이 없어요.</p>}
                        {liveList.filter((x) => x.kind === kk).map(renderPass)}
                      </div>
                    </div>
                  ))}
                  {endedList.length > 0 && (
                    <div>
                      <Button variant="secondary" size="md" aria-expanded={showEnded} onClick={() => setShowEnded((v) => !v)} style={{ width: "100%", justifyContent: "space-between" }}>
                        <span>소진된 이용권 ({endedList.length})</span>
                        <ChevronDown size={18} style={{ transform: showEnded ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
                      </Button>
                      {showEnded && <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>{endedList.map(renderPass)}</div>}
                    </div>
                  )}
                </div>
                <Button variant="secondary" size="md" onClick={openAdd} style={{ width: "100%", marginTop: 10 }}><Plus size={16} />이용권 추가</Button>
              </section>

              <section>
                <h4 style={sec}>찜한 센터</h4>
                {favBrands.length === 0 ? <p style={{ margin: 0, fontSize: 14, color: "rgba(0,0,0,.45)" }}>장소 선택에서 센터에 하트를 누르면 여기에 모여요.</p> : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {favBrands.map((b) => (
                      <Button key={b.id} variant="secondary" size="sm" pill aria-label={`${b.name} 찜 해제`} onClick={() => onToggleFav(`b:${b.id}`)}>
                        <Heart size={14} color={ACCENT} fill={ACCENT} />{b.name}
                      </Button>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <h4 style={sec}>내가 등록한 암장</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {customGyms.map((g) => (
                    <div key={g} style={{ ...box, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span>{g}</span>
                      <Button variant="ghost" size="icon" aria-label={`${g} 삭제`} onClick={() => saveGyms((l) => l.filter((n) => n !== g))}><X size={16} /></Button>
                    </div>
                  ))}
                  <div style={{ display: "flex", gap: 8 }}>
                    <input aria-label="커스텀 암장 이름" placeholder="암장 이름" value={gymName} onChange={(e) => setGymName(e.target.value)} style={{ ...fieldStyle, flex: 1, minWidth: 0 }} />
                    <Button variant="primary" size="md" onClick={() => { const n = gymName.trim(); if (n && !customGyms.includes(n)) saveGyms((l) => [...l, n]); setGymName(""); }}>추가</Button>
                  </div>
                </div>
              </section>
            </div>
          )}

          {passes.find((y) => y.id === activating) && (() => {
            const t = passes.find((y) => y.id === activating);
            return (
              <div role="dialog" aria-label="사용 시작일 지정" style={dlgBack}>
                <div style={dlgCard}>
                  <h4 style={{ margin: "0 0 12px", fontSize: 17 }}>{brandOf(t.brand).name} {passTitle(t)} 사용 시작일</h4>
                  <input type="date" aria-label="사용 시작일" value={astart} onChange={(e) => e.target.value && setAstart(e.target.value)} style={fieldStyle} />
                  <p style={{ margin: "12px 0 0", fontSize: 13, lineHeight: 1.5, color: "rgba(0,0,0,.6)" }}>
                    {t.kind === "period" ? `만료일 ${fmtDate(addDays(astart, t.days - 1))} (${t.days}일 이용)` : `${fmtDate(astart)}부터 이용 · 총 ${t.total}회`}
                  </p>
                  <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                    <Button variant="secondary" style={{ flex: 1 }} onClick={() => setActivating(null)}>취소</Button>
                    <Button variant="primary" style={{ flex: 1 }} onClick={confirmActivate}>시작하기</Button>
                  </div>
                </div>
              </div>
            );
          })()}
          {delPass != null && (
            <div role="alertdialog" aria-label="이용권 삭제 확인" style={{ ...dlgBack, zIndex: 7 }}>
              <div style={dlgCard}>
                <h4 style={{ margin: "0 0 8px", fontSize: 17 }}>이용권을 삭제하시겠습니까?</h4>
                <p style={{ margin: 0, fontSize: 14, color: "rgba(0,0,0,.6)" }}>삭제한 이용권은 다시 복구할 수 없습니다.</p>
                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                  <Button variant="secondary" style={{ flex: 1 }} onClick={() => setDelPass(null)}>취소</Button>
                  <Button variant="primary" style={{ flex: 1, background: "#DC2626" }} onClick={() => { savePasses((l) => l.filter((y) => y.id !== delPass)); setDelPass(null); }}>확인</Button>
                </div>
              </div>
            </div>
          )}
          {pausingPass && delAsk && (
            <div role="alertdialog" aria-label="정지 기간 일정 삭제" style={{ ...dlgBack, zIndex: 6 }}>
              <div style={dlgCard}>
                <h4 style={{ margin: "0 0 8px", fontSize: 17, lineHeight: 1.4 }}>정지 기간에 포함된 {brandOf(pausingPass.brand).name} 암장의 일정을 삭제하시겠습니까?</h4>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "rgba(0,0,0,.6)" }}>
                  {overlaps.slice(0, 3).map((o) => `${fmtDate(o.date)} ${o.place}`).join(", ")}{overlaps.length > 3 ? ` 외 ${overlaps.length - 3}건` : ""} (총 {overlaps.length}건)
                </p>
                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                  <Button variant="secondary" style={{ flex: 1 }} onClick={() => setDelAsk(false)}>취소</Button>
                  <Button variant="primary" style={{ flex: 1 }} onClick={() => { onDeleteRange(pausingPass.brand, pfrom, pto); applyPause(); }}>확인</Button>
                </div>
              </div>
            </div>
          )}
          {pausingPass && (
            <div role="dialog" aria-label="기간 정지 설정" style={dlgBack}>
              <div style={dlgCard}>
                <h4 style={{ margin: "0 0 12px", fontSize: 17 }}>{brandOf(pausingPass.brand).name} 기간 정지</h4>
                <Row icon={Clock} label="정지 시작일">
                  <input type="date" aria-label="정지 시작일" min={todayKey} value={pfrom} onChange={(e) => e.target.value && setPfrom(e.target.value < todayKey ? todayKey : e.target.value)} style={fieldStyle} />
                </Row>
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "rgba(0,0,0,.55)", marginBottom: 6 }}>정지 기간 (1~15일)</div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
                    <Button variant="secondary" size="icon" aria-label="정지 기간 줄이기" disabled={pdays <= 1} onClick={() => setPdays((d) => Math.max(1, d - 1))}>−</Button>
                    <span aria-label="정지 기간" style={{ minWidth: 56, textAlign: "center", fontSize: 20, fontWeight: 700 }}>{pdays}일</span>
                    <Button variant="secondary" size="icon" aria-label="정지 기간 늘리기" disabled={pdays >= 15} onClick={() => setPdays((d) => Math.min(15, d + 1))}>+</Button>
                  </div>
                </div>
                <p style={{ margin: "12px 0 0", fontSize: 13, lineHeight: 1.5, color: "rgba(0,0,0,.6)" }}>
                  정지 {fmtDate(pfrom)} ~ {fmtDate(addDays(pfrom, pdays - 1))}
                  {pausingPass.expires && <><br />만료일 {fmtDate(pausingPass.expires)} → {fmtDate(addDays(pausingPass.expires, pdays))} (자동 연장)</>}
                </p>
                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                  <Button variant="secondary" style={{ flex: 1 }} onClick={() => setPausing(null)}>취소</Button>
                  <Button variant="primary" style={{ flex: 1 }} onClick={confirmPauseSet}>정지하기</Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </Sheet>
  );
}
