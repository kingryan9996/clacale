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

function Meta({ icon: Icon, children }) {
  return (
    <span style={{ display: "flex", alignItems: "flex-start", gap: 6, fontSize: 14, color: "rgba(0,0,0,.6)" }}>
      <Icon size={14} style={{ marginTop: 2, flexShrink: 0 }} />{children}
    </span>
  );
}

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
