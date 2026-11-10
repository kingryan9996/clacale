import { useMemo, useState } from "react";
import { BarChart3, Car, ChevronDown, ChevronLeft, ChevronRight, Clock, Menu, Plus, StickyNote, User, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AddSheet from "../components/AddSheet";
import Button, { BUTTON_CSS } from "../components/Button";
import DetailSheet, { CrowdBadge } from "../components/DetailSheet";
import Sheet, { titleStyle, topBar } from "../components/Sheet";
import { ACCENT, DOW, INK, brandOf, dowColor, font, ko } from "../lib/constants";
import { byStart, t12, today, todayKey, ymd } from "../lib/dates";
import { occurrence, occursOn } from "../lib/events";


/* ---------- 메뉴 / 통계 / 로그인 유도 ---------- */
function MenuSheet({ session, onStats, onSignOut, onMyPage, onClose }) {
  const guest = session.type === "guest";
  return (
    <Sheet onClose={onClose}>
      {(close) => (
        <>
          <div style={topBar}>
            <Button variant="ghost" size="icon" onClick={close} aria-label="닫기"><X size={22} /></Button>
            <h3 style={titleStyle}>메뉴</h3>
            <span style={{ width: 36 }} />
          </div>
          <div style={{ padding: "0 16px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
            <p style={{ margin: "0 0 8px", fontSize: 14, color: "rgba(0,0,0,.55)" }}>{guest ? "비회원(Guest) · 이 기기에 저장" : `${session.name} · ${session.provider}`}</p>
            <Button variant="secondary" size="lg" style={{ justifyContent: "flex-start" }} onClick={onMyPage}><User size={18} />마이페이지</Button>
            <Button variant="secondary" size="lg" style={{ justifyContent: "flex-start" }} onClick={onStats}><BarChart3 size={18} />내 통계</Button>
            <Button variant="secondary" size="lg" style={{ justifyContent: "flex-start" }} onClick={onSignOut}>{guest ? "로그인 / 가입" : "로그아웃"}</Button>
          </div>
        </>
      )}
    </Sheet>
  );
}

function LoginPrompt({ onLogin, onClose }) {
  return (
    <Sheet onClose={onClose}>
      {(close) => (
        <>
          <div style={topBar}>
            <Button variant="ghost" size="icon" onClick={close} aria-label="닫기"><X size={22} /></Button>
            <h3 style={titleStyle}>로그인이 필요해요</h3>
            <span style={{ width: 36 }} />
          </div>
          <div style={{ padding: "0 16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5 }}>방문 통계는 로그인 후 확인할 수 있어요. 비회원으로 저장한 일정은 첫 로그인 때 이어받아요.</p>
            <Button variant="primary" size="lg" onClick={onLogin}>로그인하기</Button>
            <Button variant="ghost" size="lg" onClick={close}>나중에</Button>
          </div>
        </>
      )}
    </Sheet>
  );
}

function StatsSheet({ events, ym, onClose }) {
  const counts = {}; let total = 0;
  for (let d = 1, n = new Date(ym.y, ym.m + 1, 0).getDate(); d <= n; d++) {
    const k = ymd(ym.y, ym.m, d);
    events.forEach((e) => { if (occursOn(e, k)) { const o = occurrence(e, k); counts[o.place] = (counts[o.place] || 0) + 1; total++; } });
  }
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1] || ko(a[0], b[0])).slice(0, 3);
  return (
    <Sheet onClose={onClose}>
      {(close) => (
        <>
          <div style={topBar}>
            <Button variant="ghost" size="icon" onClick={close} aria-label="닫기"><X size={22} /></Button>
            <h3 style={titleStyle}>내 통계</h3>
            <span style={{ width: 36 }} />
          </div>
          <div style={{ padding: "0 16px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{ym.y}년 {ym.m + 1}월 · 방문 {total}회</div>
            {top.length === 0 ? <p style={{ margin: 0, fontSize: 14, color: "rgba(0,0,0,.5)" }}>이 달에는 등록된 방문이 없어요.</p> : top.map(([name, n]) => (
              <div key={name} style={{ fontSize: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span>{name}</span><b>{n}회</b></div>
                <div style={{ height: 8, borderRadius: 999, background: "#EEF0EE" }}><div style={{ width: `${(n / top[0][1]) * 100}%`, height: "100%", borderRadius: 999, background: ACCENT }} /></div>
              </div>
            ))}
          </div>
        </>
      )}
    </Sheet>
  );
}

/* ---------- 캘린더 페이지: 월간 달력 + 선택 날짜 일정 리스트 + 추가/상세 시트 ---------- */
export default function Calendar({ session, ym, setYm, sel, setSel, events, addEvent, deleteEvent, statOf, favs, toggleFav, passes, customGyms, adjustPasses, signOut }) {
  const navigate = useNavigate();
  const [sheet, setSheet] = useState(false);
  const [ymOpen, setYmOpen] = useState(false);
  const [detail, setDetail] = useState(null); // 상세 모달에 보여줄 일정(발생분)
  const [menuOpen, setMenuOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [loginPrompt, setLoginPrompt] = useState(false);
  const cells = useMemo(() => {
    const first = new Date(ym.y, ym.m, 1).getDay();
    const days = new Date(ym.y, ym.m + 1, 0).getDate();
    const arr = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
    while (arr.length % 7) arr.push(null); // 필요한 주(4~6주)만 그림 -> 캘린더와 일정 목록이 밀착
    return arr;
  }, [ym]);

  // 날짜별 일정 (반복 일정은 해당 날짜의 발생분으로 펼침), 시작 시각 오름차순
  const byDate = useMemo(() => {
    const map = {};
    cells.forEach((d) => {
      if (!d) return;
      const k = ymd(ym.y, ym.m, d);
      const occ = events.filter((e) => occursOn(e, k)).map((e) => occurrence(e, k)).sort(byStart);
      if (occ.length) map[k] = occ;
    });
    return map;
  }, [events, cells, ym]);
  const list = useMemo(() => events.filter((e) => occursOn(e, sel)).map((e) => occurrence(e, sel)).sort(byStart), [events, sel]);

  const moveMonth = (d) => setYm(({ y, m }) => { const n = new Date(y, m + d, 1); return { y: n.getFullYear(), m: n.getMonth() }; });
  const goToday = () => { setYm({ y: today.getFullYear(), m: today.getMonth() }); setSel(todayKey); setYmOpen(false); };
  // 선택한 날짜가 오늘이 아니거나, 보고 있는 달이 이번 달이 아니면 '오늘' 버튼 표시
  const showToday = sel !== todayKey || ym.y !== today.getFullYear() || ym.m !== today.getMonth();
  const openStats = () => { setMenuOpen(false); if (session?.type === "user") setStatsOpen(true); else setLoginPrompt(true); };
  const [sy, sm, sd] = sel.split("-").map(Number);
  const selLabel = `${sm}월 ${sd}일 (${DOW[new Date(sy, sm - 1, sd).getDay()]})`;

  const handleSave = (ev) => {
    addEvent(ev);
    const [y, m] = ev.start.slice(0, 10).split("-").map(Number);
    setYm({ y, m: m - 1 });
    setSel(ev.start.slice(0, 10));
  };
  const handleSignOut = () => { setMenuOpen(false); setLoginPrompt(false); signOut(); };

  return (
    <div style={{
      position: "relative", margin: "0 auto", maxWidth: 448, height: "100%", overflow: "hidden",
      display: "grid", gridTemplateRows: "minmax(0, 64fr) minmax(0, 36fr)", // 캘린더 : 리스트 = 약 2 : 1 고정
      background: "#F3F4F2", color: INK, fontFamily: font, userSelect: "none",
    }}>
      <style>{BUTTON_CSS}</style>

      {/* 상단: 헤더 + 월간 캘린더 */}
      <div style={{ display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden", background: "#fff" }}>
        <header className="flex items-center justify-between" style={{ position: "relative", flexShrink: 0, padding: "16px 16px 8px" }}>
          <div className="flex items-center" style={{ gap: 4 }}>
            <Button variant="ghost" size="icon" onClick={() => moveMonth(-1)} aria-label="이전 달"><ChevronLeft size={20} /></Button>
            <Button variant="ghost" size="none" onClick={() => setYmOpen((v) => !v)} aria-expanded={ymOpen}
              style={{ padding: "4px 6px", borderRadius: 8, fontSize: 20, fontWeight: 700, gap: 4 }}>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>
                {ym.y}. <span style={{ display: "inline-block", minWidth: "2.2ch", textAlign: "left" }}>{ym.m + 1}</span>
              </span>
              <ChevronDown size={18} style={{ transform: ymOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => moveMonth(1)} aria-label="다음 달"><ChevronRight size={20} /></Button>
          </div>
          <Button variant="ghost" size="icon" aria-label="메뉴" onClick={() => setMenuOpen(true)}><Menu size={22} /></Button>

          {ymOpen && (
            <div style={{ position: "absolute", left: 12, right: 12, top: 56, zIndex: 20, background: "#fff", borderRadius: 16, padding: 12, boxShadow: "0 10px 30px rgba(0,0,0,.18)" }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                <Button variant="ghost" size="icon" onClick={() => setYm((v) => ({ ...v, y: v.y - 1 }))} aria-label="이전 연도"><ChevronLeft size={18} /></Button>
                <span style={{ fontWeight: 600 }}>{ym.y}년</span>
                <Button variant="ghost" size="icon" onClick={() => setYm((v) => ({ ...v, y: v.y + 1 }))} aria-label="다음 연도"><ChevronRight size={18} /></Button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 6 }}>
                {Array.from({ length: 12 }, (_, i) => (
                  <Button key={i} variant={i === ym.m ? "primary" : "secondary"} size="sm"
                    onClick={() => { setYm((v) => ({ ...v, m: i })); setYmOpen(false); }}>
                    {i + 1}월
                  </Button>
                ))}
              </div>
            </div>
          )}
        </header>

        <section style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, padding: "0 8px 0" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", flexShrink: 0, padding: "4px 0", textAlign: "center", fontSize: 12, fontWeight: 500 }}>
            {DOW.map((d, i) => (
              <span key={d} style={{ color: i === 0 || i === 6 ? dowColor(i) : "rgba(0,0,0,.5)" }}>{d}</span>
            ))}
          </div>

          {/* 주 수만큼 행을 나눔: 셀 높이는 일정 개수와 무관하게 고정 */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gridTemplateRows: `repeat(${cells.length / 7}, minmax(0, 1fr))`, flex: 1, minHeight: 0 }}>
            {cells.map((d, i) => {
              if (!d) return <div key={i} />;
              const k = ymd(ym.y, ym.m, d);
              const evs = byDate[k] ?? []; // 시작 시각 오름차순
              const isSel = k === sel;
              const isToday = k === todayKey;
              const first = evs[0]; // 대표 일정 1개 (가장 이른 시작)
              const more = evs.length - 1;
              return (
                <Button key={i} variant="ghost" size="none" onClick={() => setSel(k)} aria-pressed={isSel}
                  style={{
                    display: "flex", flexDirection: "column", justifyContent: "flex-start", alignItems: "center", gap: 4,
                    height: "100%", minHeight: 0, boxSizing: "border-box", overflow: "hidden", padding: "4px 2px 0", borderRadius: 12,
                    background: isSel ? "#FFF1E8" : "transparent",
                    boxShadow: isSel ? `inset 0 0 0 2px ${ACCENT}` : "none",
                  }}>
                  <span style={{
                    position: "relative", zIndex: 1, flexShrink: 0, width: 24, height: 24, boxSizing: "border-box",
                    display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 999, fontSize: 13,
                    fontWeight: isSel || isToday ? 700 : 400,
                    background: isSel ? ACCENT : "transparent",
                    color: isSel ? "#000000" : isToday ? "#C2410C" : dowColor(i % 7),
                    border: !isSel && isToday ? `1px solid ${ACCENT}` : "1px solid transparent",
                  }}>{d}</span>
                  {first && (
                    <span style={{
                      display: "flex", alignItems: "center", gap: 2, width: "100%", boxSizing: "border-box", flexShrink: 0,
                      padding: "0 4px", borderRadius: 4, fontSize: 9, fontWeight: 600, lineHeight: "15px",
                      background: brandOf(first.brand).color + "26", color: brandOf(first.brand).color,
                    }}>
                      <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{first.place}</span>
                      {more > 0 && <span style={{ flexShrink: 0 }}>+{more}</span>}
                    </span>
                  )}
                </Button>
              );
            })}
          </div>
        </section>
      </div>

      {/* 하단: 선택한 날짜 일정 (고정 높이, 내부 스크롤) */}
      <section style={{ display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden", borderTop: "1px solid rgba(0,0,0,.06)" }}>
        <h2 style={{ flexShrink: 0, margin: 0, padding: "8px 16px 6px", fontSize: 15, fontWeight: 700 }}>{selLabel}</h2>
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "0 16px 56px" }}>
          {list.length === 0 ? (
            <p style={{ margin: 0, padding: "24px 0", textAlign: "center", fontSize: 14, color: "rgba(0,0,0,.4)", background: "#fff", borderRadius: 16 }}>
              이 날은 등록된 암장 일정이 없어요.<br />+ 버튼으로 추가해 보세요.
            </p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {list.map((e) => (
                <li key={e.id}>
                  <Button variant="ghost" size="none" onClick={() => setDetail(e)} aria-label={`${e.place} 일정 상세`}
                    style={{ display: "flex", width: "100%", alignItems: "stretch", justifyContent: "flex-start", textAlign: "left", background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,.08)" }}>
                    <span style={{ width: 6, flexShrink: 0, background: brandOf(e.brand).color }} />
                    <span style={{ flex: 1, minWidth: 0, padding: 14, display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                        <span style={{ fontWeight: 600, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.place}</span>
                        <CrowdBadge st={statOf(e)} />
                      </span>
                      <Meta icon={Clock}>{t12(e.start)} – {t12(e.end)}</Meta>
                      {e.travel > 0 && <Meta icon={Car}>이동 {e.travel}분</Meta>}
                      {e.memo && <Meta icon={StickyNote}>{e.memo}</Meta>}
                    </span>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Floating (+) : 검정 아이콘 */}
      <Button variant="floating" className="text-black" aria-label="일정 추가" onClick={() => setSheet(true)}
        style={{ position: "absolute", bottom: 12, right: 16, zIndex: 20 }}>
        <Plus size={22} strokeWidth={2.75} color="#000000" />
      </Button>

      {/* 선택한 날짜가 오늘이 아니거나 다른 달을 보고 있을 때 좌측 하단에 '오늘' 버튼 */}
      {showToday && (
        <Button variant="primary" size="sm" pill onClick={goToday} aria-label="오늘로 이동"
          style={{ position: "absolute", bottom: 12, left: 16, zIndex: 20, height: 32, padding: "0 14px", fontSize: 13, boxShadow: "0 3px 10px rgba(0,0,0,.25)" }}>
          오늘
        </Button>
      )}

      {sheet && <AddSheet date={sel} onClose={() => setSheet(false)} onSave={handleSave} favs={favs} onToggleFav={toggleFav} passes={passes} customGyms={customGyms} onAdjustPasses={adjustPasses} />}
      {detail && <DetailSheet ev={detail} st={statOf(detail)} onClose={() => setDetail(null)} onDelete={deleteEvent} />}
      {menuOpen && <MenuSheet session={session} onStats={openStats} onSignOut={handleSignOut} onMyPage={() => { setMenuOpen(false); navigate("/mypage"); }} onClose={() => setMenuOpen(false)} />}
      {statsOpen && <StatsSheet events={events} ym={ym} onClose={() => setStatsOpen(false)} />}
      {loginPrompt && <LoginPrompt onLogin={handleSignOut} onClose={() => setLoginPrompt(false)} />}
    </div>
  );
}

  // const savePasses = (fn) => setPasses((p) => { const n = fn(p); store.set(`clacale:passes:${uid}`, n); return n; });
  // const saveGyms = (fn) => setCustomGyms((p) => { const n = fn(p); store.set(`clacale:gyms:${uid}`, n); return n; });
  // // 일정이 정지 기간과 겹칠 때: 정지 종료일을 일정 전날로 단축
  // const adjustPasses = (ids, date) => savePasses((l) => l.map((x) => (ids.includes(x.id) ? shortenPause(x, addDays(date, -1)) : x)));
  // // 정지 기간(from~to)과 겹치는 해당 브랜드 일정 삭제: 단일 일정은 삭제, 반복 일정은 그 기간의 발생분만 제외
  // const deleteBrandRange = (brand, from, to) => commit((p) => p.flatMap((e) => {
  //   if (e.brand !== brand) return [e];
  //   const hits = []; for (let k = from; k <= to; k = addDays(k, 1)) if (occursOn(e, k)) hits.push(k);
  //   if (!hits.length) return [e];
  //   return e.repeat === "none" ? [] : [{ ...e, ex: [...(e.ex ?? []), ...hits] }];
  // }));
  // // 자정이 지나면 오늘 날짜 갱신 -> 지난 일정 감지해 횟수권 자동 차감
  // const [tick, setTick] = useState(0);
  // useEffect(() => {
  //   const t = setInterval(() => { const k = keyOf(new Date()); if (k !== todayKey) { todayKey = k; setTick((n) => n + 1); } }, 30000);
  //   return () => clearInterval(t);
  // }, []);
  // useEffect(() => {
  //   if (!session) return;
  //   const res = settleCountPasses(passes, events, todayKey);
  //   if (res) savePasses(() => res);
  // }, [session, passes, events, tick]);
  // const [sheet, setSheet] = useState(false);
  // const [ymOpen, setYmOpen] = useState(false);
  // const [detail, setDetail] = useState(null); // 상세 모달에 보여줄 일정(발생분)
  // const [favs, setFavs] = useState(() => store.get(`clacale:favs:${uid}`, [])); // 즐겨찾기한 센터(브랜드) 키: "b:브랜드id"
  // const toggleFav = (key) => setFavs((p) => { const n = p.includes(key) ? p.filter((k) => k !== key) : [...p, key]; store.set(`clacale:favs:${uid}`, n); return n; });
  // // 삭제 범위: one = 이 일정만(예외 날짜 기록), after = 이 날짜 이후 모두(종료일 기록, 과거 유지), all = 시리즈 전체
  // const deleteEvent = (ev, scope) => commit((p) => p.flatMap((e) => {
  //   if (e.id !== ev.id) return [e];
  //   const k = ev.start.slice(0, 10);
  //   if (scope === "all") return [];
  //   if (scope === "after") {
  //     if (k <= e.start.slice(0, 10)) return [];
  //     const prev = parseKey(k); prev.setDate(prev.getDate() - 1);
  //     return [{ ...e, until: keyOf(prev) }];
  //   }
  //   return [{ ...e, ex: [...(e.ex ?? []), k] }];
  // }));

  // const cells = useMemo(() => {
  //   const first = new Date(ym.y, ym.m, 1).getDay();
  //   const days = new Date(ym.y, ym.m + 1, 0).getDate();
  //   const arr = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  //   while (arr.length % 7) arr.push(null); // 필요한 주(4~6주)만 그림 -> 캘린더와 일정 목록이 밀착
  //   return arr;
  // }, [ym]);

  // // 날짜별 일정 (반복 일정은 해당 날짜의 발생분으로 펼침), 시작 시각 오름차순
  // const byDate = useMemo(() => {
  //   const map = {};
  //   cells.forEach((d) => {
  //     if (!d) return;
  //     const k = ymd(ym.y, ym.m, d);
  //     const occ = events.filter((e) => occursOn(e, k)).map((e) => occurrence(e, k)).sort(byStart);
  //     if (occ.length) map[k] = occ;
  //   });
  //   return map;
  // }, [events, cells, ym]);
  // const list = useMemo(() => events.filter((e) => occursOn(e, sel)).map((e) => occurrence(e, sel)).sort(byStart), [events, sel]);

  // const moveMonth = (d) => setYm(({ y, m }) => { const n = new Date(y, m + d, 1); return { y: n.getFullYear(), m: n.getMonth() }; });
  // const goToday = () => { setYm({ y: today.getFullYear(), m: today.getMonth() }); setSel(todayKey); setYmOpen(false); };
  // // 선택한 날짜가 오늘이 아니거나, 보고 있는 달이 이번 달이 아니면 '오늘' 버튼 표시
  // const showToday = sel !== todayKey || ym.y !== today.getFullYear() || ym.m !== today.getMonth();
  // // 일정(발생분) 하나의 혼잡도: 같은 날짜·암장·time_slot의 방문 예정 인원 = 집계값 + 내 일정
  // const statOf = (o) => {
  //   const date = o.start.slice(0, 10), gym = gymIdOf(o), slot = midSlot(o.start, o.end);
  //   const own = events.filter((e) => occursOn(e, date)).map((e) => occurrence(e, date)).filter((x) => gymIdOf(x) === gym && midSlot(x.start, x.end) === slot).length;
  //   const visit = sampleVisits(date, gym, slot) + own;
  //   return { date, gym_id: gym, time_slot: slot, visit_count: visit, max_capacity: MAX_CAPACITY, pct: (visit / MAX_CAPACITY) * 100, level: crowdLevel(visit) };
  // };

// /* ---------- 일시 선택 (시작/종료를 한 화면에서) · 분은 5분 단위 ---------- */
// function HeartBtn({ on, onClick, label }) {
//   return (
//     <Button variant="ghost" size="none" onClick={onClick} aria-label={label} aria-pressed={on} style={{ width: 36, flexShrink: 0, borderRadius: 0, outline: "none" }}>
//       <Heart size={16} color={on ? ACCENT : "rgba(0,0,0,.35)"} fill={on ? ACCENT : "none"} />
//     </Button>
//   );
// }

// function WhenPicker({ start, end, setStart, setEnd, endTouched, setEndTouched, onBack }) {
//   const gap = Math.max(0, new Date(end) - new Date(start));
//   const mins = Math.round(gap / 60000);

//   // 시작을 바꾸면 종료는 기본 3시간 뒤로 자동 설정 (종료를 직접 바꾼 뒤에는 그 소요 시간 유지), 종료는 시작보다 빠를 수 없음
//   const apply = (which, part, v) => {
//     const cur = which === "start" ? start : end;
//     const next = part === "date" ? `${v}T${hm(cur)}` : part === "h" ? `${cur.slice(0, 11)}${v}:${cur.slice(14, 16)}` : `${cur.slice(0, 14)}${v}`;
//     if (which === "start") { setStart(next); setEnd(toStr(new Date(new Date(next).getTime() + (endTouched ? gap : 3 * 3600000)))); }
//     else { setEndTouched(true); setEnd(next < start ? start : next); }
//   };
//   const line = (which, label, value) => {
//     const h24 = Number(value.slice(11, 13)), pm = h24 >= 12, h12 = h24 % 12 || 12;
//     const f = { ...fieldStyle, background: "#fff", minWidth: 0 };
//     return (
//       <div style={{ background: "#F3F4F2", borderRadius: 14, padding: 12 }}>
//         <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 700, color: which === "start" ? "#C2410C" : INK }}>{label} · {fmtShort(value)}</div>
//         <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
//           <input type="date" aria-label={`${label} 날짜`} value={value.slice(0, 10)} onChange={(e) => e.target.value && apply(which, "date", e.target.value)} style={{ ...f, gridColumn: "1 / -1" }} />
//           <select aria-label={`${label} 오전/오후`} value={pm ? "PM" : "AM"} onChange={(e) => apply(which, "h", pad((h12 % 12) + (e.target.value === "PM" ? 12 : 0)))} style={f}>
//             <option value="AM">오전</option><option value="PM">오후</option>
//           </select>
//           <select aria-label={`${label} 시`} value={pad(h12)} onChange={(e) => apply(which, "h", pad((Number(e.target.value) % 12) + (pm ? 12 : 0)))} style={f}>
//             {H12.map((h) => <option key={h} value={h}>{h}시</option>)}
//           </select>
//           <select aria-label={`${label} 분`} value={value.slice(14, 16)} onChange={(e) => apply(which, "m", e.target.value)} style={f}>
//             {MIN5.map((m) => <option key={m} value={m}>{m}분</option>)}
//           </select>
//         </div>
//       </div>
//     );
//   };

//   return (
//     <>
//       <div style={topBar}>
//         <Button variant="ghost" size="icon" onClick={onBack} aria-label="뒤로"><ChevronLeft size={22} /></Button>
//         <h3 style={titleStyle}>일시 선택</h3>
//         <Button variant="ghost" size="none" onClick={onBack} style={{ padding: "4px 4px", fontSize: 15, fontWeight: 700, color: "#EA580C" }}>완료</Button>
//       </div>
//       <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 32px", display: "flex", flexDirection: "column", gap: 12 }}>
//         {line("start", "시작", start)}
//         {line("end", "종료", end)}
//         <p style={{ margin: 0, textAlign: "center", fontSize: 14, color: "rgba(0,0,0,.55)" }}>
//           소요 시간 {mins === 0 ? "0분" : `${mins >= 60 ? `${Math.floor(mins / 60)}시간 ` : ""}${mins % 60 ? `${mins % 60}분` : ""}`.trim()}
//         </p>
//       </div>
//     </>
//   );
// }






// /* ---------- 일정 상세 (조회 + 삭제: 반복 범위 선택 -> 최종 확인) ---------- */
// const SCOPES = [{ id: "one", label: "이 일정만 삭제" }, { id: "after", label: "이후 일정 모두 삭제" }, { id: "all", label: "전체 반복 일정 삭제" }];
// const dlgBack = { position: "absolute", inset: 0, zIndex: 5, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.45)", padding: 24 };
// const dlgCard = { width: "100%", maxWidth: 320, boxSizing: "border-box", background: "#fff", borderRadius: 20, padding: 20, boxShadow: "0 10px 30px rgba(0,0,0,.25)" };

// function DetailSheet({ ev, st, onClose, onDelete }) {
//   const [step, setStep] = useState(null); // null | "scope"(반복 일정만) | "confirm"
//   const [scope, setScope] = useState("one");
//   const repeating = ev.repeat !== "none";
//   const b = brandOf(ev.brand);
//   const rep = REPEATS.find((r) => r.id === ev.repeat)?.label ?? "없음";
//   const al = ev.alerts?.length ? ev.alerts.map(alertLabel).join(", ") : "없음";
//   return (
//     <Sheet onClose={onClose}>
//       {(close) => (
//         <>
//           <div style={topBar}>
//             <Button variant="ghost" size="icon" onClick={close} aria-label="닫기"><X size={22} /></Button>
//             <h3 style={titleStyle}>일정 상세</h3>
//             <span style={{ width: 36 }} />
//           </div>
//           <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "0 16px 8px", display: "flex", flexDirection: "column", gap: 14 }}>
//             <Info icon={MapPin} label="장소"><span style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700 }}>
//               <span style={{ width: 10, height: 10, borderRadius: 999, background: b.color, flexShrink: 0 }} />{ev.place}</span></Info>
//             <Info icon={Clock} label="일시">{fmtRange(ev.start, ev.end)}</Info>
//             <Info icon={Car} label="이동시간">{ev.travel > 0 ? `${ev.travel}분` : "없음"}</Info>
//             <Info icon={StickyNote} label="메모"><span style={{ whiteSpace: "pre-wrap" }}>{ev.memo || "없음"}</span></Info>
//             <Info icon={Repeat} label="반복">{rep}</Info>
//             <Info icon={Bell} label="알림">{al}</Info>
//             <Info icon={Users} label="혼잡도">
//               <CrowdBadge st={st} />
//               <span style={{ display: "block", marginTop: 2, fontSize: 12, color: "rgba(0,0,0,.45)" }}>{t12(st.time_slot)} 기준 · 최대 {st.max_capacity}명 · 예시 집계</span>
//             </Info>
//           </div>
//           <div style={{ padding: "8px 16px 16px", flexShrink: 0 }}>
//             <Button variant="danger" size="lg" style={{ width: "100%" }} onClick={() => setStep(repeating ? "scope" : "confirm")}>
//               <Trash2 size={18} />일정 삭제
//             </Button>
//           </div>

//           {step === "scope" && (
//             <div role="dialog" aria-label="반복 일정 삭제 범위" style={dlgBack}>
//               <div style={dlgCard}>
//                 <h4 style={{ margin: "0 0 8px", fontSize: 17 }}>반복 일정 삭제</h4>
//                 {SCOPES.map((o) => (
//                   <Button key={o.id} variant="ghost" size="none" role="radio" aria-checked={scope === o.id} onClick={() => setScope(o.id)}
//                     style={{ width: "100%", justifyContent: "flex-start", gap: 10, padding: "12px 4px", fontSize: 15, borderRadius: 8 }}>
//                     <span style={{ width: 18, height: 18, boxSizing: "border-box", flexShrink: 0, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${scope === o.id ? ACCENT : "#C9CEC9"}` }}>
//                       {scope === o.id && <span style={{ width: 8, height: 8, borderRadius: 999, background: ACCENT }} />}
//                     </span>
//                     {o.label}
//                   </Button>
//                 ))}
//                 <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
//                   <Button variant="secondary" style={{ flex: 1 }} onClick={() => setStep(null)}>취소</Button>
//                   <Button variant="primary" style={{ flex: 1 }} onClick={() => setStep("confirm")}>다음</Button>
//                 </div>
//               </div>
//             </div>
//           )}
//           {step === "confirm" && (
//             <div role="alertdialog" aria-label="삭제 확인" style={dlgBack}>
//               <div style={dlgCard}>
//                 <h4 style={{ margin: "0 0 8px", fontSize: 17 }}>일정을 삭제하시겠습니까?</h4>
//                 {repeating && <p style={{ margin: "0 0 4px", fontSize: 14, color: "rgba(0,0,0,.55)" }}>{SCOPES.find((o) => o.id === scope).label}</p>}
//                 <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
//                   <Button variant="secondary" style={{ flex: 1 }} onClick={() => setStep(null)}>취소</Button>
//                   <Button variant="primary" style={{ flex: 1, background: "#DC2626" }} onClick={() => { onDelete(ev, repeating ? scope : "all"); close(); }}>삭제</Button>
//                 </div>
//               </div>
//             </div>
//           )}
//         </>
//       )}
//     </Sheet>
//   );
// }

// function Info({ icon: Icon, label, children }) {
//   return (
//     <div style={{ display: "flex", alignItems: "flex-start", gap: 12, fontSize: 15 }}>
//       <span style={{ display: "flex", alignItems: "center", gap: 6, width: 84, flexShrink: 0, fontSize: 13, color: "rgba(0,0,0,.5)", paddingTop: 2 }}>
//         <Icon size={14} />{label}
//       </span>
//       <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
//     </div>
//   );
// }

// function Row({ icon: Icon, label, children }) {
//   return (
//     <div>
//       <p style={{ margin: "0 0 6px", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500, color: "rgba(0,0,0,.55)" }}>
//         <Icon size={14} />{label}
//       </p>
//       {children}
//     </div>
//   );
// }

// /* ---------- 혼잡도 배지 ---------- */
// function CrowdBadge({ st }) {
//   return (
//     <span title={`${st.time_slot} 기준 혼잡 예상 ${Math.round(st.pct)}% (최대 ${st.max_capacity}명)`}
//       style={{ display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0, fontSize: 12, fontWeight: 600, color: "rgba(0,0,0,.65)" }}>
//       <span aria-hidden="true" style={{ width: 12, height: 12, borderRadius: 999, background: st.level.color }} />
//       {st.level.label} · {st.visit_count}명
//     </span>
//   );
// }

