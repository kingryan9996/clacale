import { useMemo, useState } from "react";
import { BarChart3, Car, ChevronDown, ChevronLeft, ChevronRight, Clock, Menu, Plus, StickyNote, User, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AddSheet from "@/components/AddSheet";
import DetailSheet, { CrowdBadge } from "@/components/DetailSheet";
import { Button, Container, Sheet, SheetBody, SheetHeader } from "@/components/ui";
import { brandOf, ko } from "@/constants/brands";
import { DOW } from "@/constants/schedule";
import { byStart, t12, today, todayKey, ymd } from "@/lib/dates";
import { occurrence, occursOn } from "@/lib/events";
import "@/pages/Calendar.css";

function Meta({ icon: Icon, children }) {
  return (
    <span className="cal-meta">
      <Icon size={14} />{children}
    </span>
  );
}

const closeBtn = (close) => <Button variant="ghost" size="icon" onClick={close} aria-label="닫기"><X size={22} /></Button>;

/* ---------- 메뉴 / 통계 / 로그인 유도 ---------- */
function MenuSheet({ session, onStats, onSignOut, onMyPage, onClose }) {
  const guest = session.type === "guest";
  return (
    <Sheet onClose={onClose}>
      {(close) => (
        <>
          <SheetHeader left={closeBtn(close)} title="메뉴" />
          <SheetBody gap={8}>
            <p className="cal-sheet-note">{guest ? "비회원(Guest) · 이 기기에 저장" : `${session.name} · ${session.provider}`}</p>
            <Button variant="secondary" size="lg" className="cal-menu-item" onClick={onMyPage}><User size={18} />마이페이지</Button>
            <Button variant="secondary" size="lg" className="cal-menu-item" onClick={onStats}><BarChart3 size={18} />내 통계</Button>
            <Button variant="secondary" size="lg" className="cal-menu-item" onClick={onSignOut}>{guest ? "로그인 / 가입" : "로그아웃"}</Button>
          </SheetBody>
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
          <SheetHeader left={closeBtn(close)} title="로그인이 필요해요" />
          <SheetBody gap={12}>
            <p className="cal-sheet-text">방문 통계는 로그인 후 확인할 수 있어요. 비회원으로 저장한 일정은 첫 로그인 때 이어받아요.</p>
            <Button variant="primary" size="lg" onClick={onLogin}>로그인하기</Button>
            <Button variant="ghost" size="lg" onClick={close}>나중에</Button>
          </SheetBody>
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
          <SheetHeader left={closeBtn(close)} title="내 통계" />
          <SheetBody gap={12}>
            <div className="cal-stats-title">{ym.y}년 {ym.m + 1}월 · 방문 {total}회</div>
            {top.length === 0 ? <p className="cal-sheet-note">이 달에는 등록된 방문이 없어요.</p> : top.map(([name, n]) => (
              <div key={name} className="cal-stats-row">
                <div className="cal-stats-row__head"><span>{name}</span><b>{n}회</b></div>
                <div className="cal-stats-bar"><div className="cal-stats-bar__fill" style={{ "--ratio": `${(n / top[0][1]) * 100}%` }} /></div>
              </div>
            ))}
          </SheetBody>
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
    <Container height="fill" className="cal">
      {/* 상단: 헤더 + 월간 캘린더 */}
      <div className="cal__top">
        <header className="cal__header">
          <div className="cal__nav">
            <Button variant="ghost" size="icon" onClick={() => moveMonth(-1)} aria-label="이전 달"><ChevronLeft size={20} /></Button>
            <Button variant="ghost" size="bare" className="cal__ym" onClick={() => setYmOpen((v) => !v)} aria-expanded={ymOpen}>
              <span className="cal__ym-text">
                {ym.y}. <span className="cal__ym-month">{ym.m + 1}</span>
              </span>
              <ChevronDown size={18} className="cal__ym-chevron" data-open={ymOpen || undefined} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => moveMonth(1)} aria-label="다음 달"><ChevronRight size={20} /></Button>
          </div>
          <Button variant="ghost" size="icon" aria-label="메뉴" onClick={() => setMenuOpen(true)}><Menu size={22} /></Button>

          {ymOpen && (
            <div className="cal__ym-pop">
              <div className="cal__ym-pop-head">
                <Button variant="ghost" size="icon" onClick={() => setYm((v) => ({ ...v, y: v.y - 1 }))} aria-label="이전 연도"><ChevronLeft size={18} /></Button>
                <span className="cal__ym-pop-year">{ym.y}년</span>
                <Button variant="ghost" size="icon" onClick={() => setYm((v) => ({ ...v, y: v.y + 1 }))} aria-label="다음 연도"><ChevronRight size={18} /></Button>
              </div>
              <div className="cal__ym-grid">
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

        <section className="cal__month">
          <div className="cal__dow-row">
            {DOW.map((d, i) => <span key={d} className="cal__dow" data-dow={i}>{d}</span>)}
          </div>

          {/* 주 수만큼 행을 나눔: 셀 높이는 일정 개수와 무관하게 고정 */}
          <div className="cal__grid" style={{ "--rows": cells.length / 7 }}>
            {cells.map((d, i) => {
              if (!d) return <div key={i} />;
              const k = ymd(ym.y, ym.m, d);
              const evs = byDate[k] ?? []; // 시작 시각 오름차순
              const first = evs[0]; // 대표 일정 1개 (가장 이른 시작)
              const more = evs.length - 1;
              return (
                <Button key={i} variant="ghost" size="bare" className="cal__cell" onClick={() => setSel(k)} aria-pressed={k === sel}>
                  <span className="cal__day" data-dow={i % 7} data-sel={k === sel || undefined} data-today={k === todayKey || undefined}>{d}</span>
                  {first && (
                    <span className="cal__chip" style={{ "--brand": brandOf(first.brand).color }}>
                      <span className="cal__chip-name">{first.place}</span>
                      {more > 0 && <span className="cal__chip-more">+{more}</span>}
                    </span>
                  )}
                </Button>
              );
            })}
          </div>
        </section>
      </div>

      {/* 하단: 선택한 날짜 일정 (고정 높이, 내부 스크롤) */}
      <section className="cal__bottom">
        <h2 className="cal__sel-title">{selLabel}</h2>
        <div className="cal__list-wrap">
          {list.length === 0 ? (
            <p className="cal__empty">이 날은 등록된 암장 일정이 없어요.<br />+ 버튼으로 추가해 보세요.</p>
          ) : (
            <ul className="cal__list">
              {list.map((e) => (
                <li key={e.id}>
                  <Button variant="ghost" size="bare" className="cal__card" onClick={() => setDetail(e)} aria-label={`${e.place} 일정 상세`}>
                    <span className="cal__card-bar" style={{ "--brand": brandOf(e.brand).color }} />
                    <span className="cal__card-main">
                      <span className="cal__card-head">
                        <span className="cal__card-place">{e.place}</span>
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

      {/* Floating (+) */}
      <Button variant="fab" className="cal__fab" aria-label="일정 추가" onClick={() => setSheet(true)}>
        <Plus size={22} strokeWidth={2.75} />
      </Button>

      {/* 선택한 날짜가 오늘이 아니거나 다른 달을 보고 있을 때 좌측 하단에 '오늘' 버튼 */}
      {showToday && (
        <Button variant="primary" size="sm" pill className="cal__today" onClick={goToday} aria-label="오늘로 이동">오늘</Button>
      )}

      {sheet && <AddSheet date={sel} onClose={() => setSheet(false)} onSave={handleSave} favs={favs} onToggleFav={toggleFav} passes={passes} customGyms={customGyms} onAdjustPasses={adjustPasses} />}
      {detail && <DetailSheet ev={detail} st={statOf(detail)} onClose={() => setDetail(null)} onDelete={deleteEvent} />}
      {menuOpen && <MenuSheet session={session} onStats={openStats} onSignOut={handleSignOut} onMyPage={() => { setMenuOpen(false); navigate("/mypage"); }} onClose={() => setMenuOpen(false)} />}
      {statsOpen && <StatsSheet events={events} ym={ym} onClose={() => setStatsOpen(false)} />}
      {loginPrompt && <LoginPrompt onLogin={handleSignOut} onClose={() => setLoginPrompt(false)} />}
    </Container>
  );
}
