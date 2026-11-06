import { useMemo, useState } from "react";
import { Car, Check, ChevronDown, ChevronLeft, ChevronRight, Clock, MapPin, Menu, Plus, StickyNote, X } from "lucide-react";
import { Button, Chip, Field, Input, Modal, ModalHeader } from "@/components/common";
import { BRANDS as BRAND_DATA } from "@/constants/gyms";

/* =====================================================================
   상수 (문구 · 옵션 · 색상 · 클래스)  ※ Tailwind는 클래스를 문자열 그대로 읽으므로 조합하지 않고 통째로 둡니다
   ===================================================================== */
const TEXT = {
  weekdays: ["일", "월", "화", "수", "목", "금", "토"],
  yearMonth: (y, m) => `${y}. ${m + 1}`,
  year: (y) => `${y}년`,
  month: (m) => `${m + 1}월`,
  dayLabel: (m, d, dow) => `${m}월 ${d}일 (${dow})`,
  today: "오늘",
  none: "없음",
  minutes: (n) => `${n}분`,
  travel: (n) => `이동 ${n}분`,
  empty: ["이 날은 등록된 암장 일정이 없어요.", "+ 버튼으로 추가해 보세요."],
  aria: {
    prevMonth: "이전 달", nextMonth: "다음 달", prevYear: "이전 연도", nextYear: "다음 연도",
    menu: "메뉴", addEvent: "일정 추가", goToday: "오늘로 이동", back: "뒤로", close: "닫기",
  },
  sheet: {
    title: "일정 추가", save: "저장", place: "장소", placeEmpty: "암장을 선택하세요", start: "시작", end: "종료",
    travel: "이동시간", memo: "메모", memoPlaceholder: "루트, 같이 가는 사람 등",
  },
  picker: { title: "장소 선택", noBranch: "지점 구분 없음" },
};

const OPTIONS = { travel: [0, 15, 30, 45, 60, 90] }; // 이동시간(분)
const DEFAULT_START_TIME = "19:00"; // 새 일정 기본 시작 시각
const DEFAULT_END_TIME = "21:00";  // 새 일정 기본 종료 시각
const DEFAULT_TRAVEL = 30;

const COLORS = { accent: "#F26B21", accentSoft: "#FFF1E8", onAccent: "#000000", badgeAlpha: "26" };
const LAYOUT = { rows: "minmax(0, 64fr) minmax(0, 36fr)", calendarRows: "repeat(6, minmax(0, 1fr))", sheetCloseMs: 250 };

// 요일 색 (헤더 / 날짜 숫자)
const DOW_HEAD_CLS = ["text-rose-500", "text-black/50", "text-black/50", "text-black/50", "text-black/50", "text-black/50", "text-blue-500"];
const DOW_DATE_CLS = ["text-rose-500", "text-neutral-900", "text-neutral-900", "text-neutral-900", "text-neutral-900", "text-neutral-900", "text-blue-500"];

const CLS = {
  page: "relative mx-auto grid h-dvh max-w-md overflow-hidden bg-[#F3F4F2] text-[#1C2226] select-none",
  cell: "box-border flex h-full min-h-0 flex-col items-center gap-1 overflow-hidden rounded-xl px-0.5 pt-1 active:bg-black/5",
  dateNum: "relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[13px]",
  dateNumToday: "font-bold text-orange-700 ring-1 ring-orange-500",
  cellBadge: "flex w-full shrink-0 items-center gap-0.5 rounded px-1 text-[9px] font-semibold leading-[15px]",
  meta: "flex items-start gap-1.5 text-sm text-black/60",
  pickerRow: "flex w-full items-center gap-2 text-left text-[15px]",
  sheet: "h-[70%]",
};

/* ---------- 데이터 ---------- */
// 브랜드/지점은 가나다순
const ko = (a, b) => a.localeCompare(b, "ko");
const BRANDS = BRAND_DATA.map((b) => ({ ...b, branches: [...b.branches].sort(ko) })).sort((a, b) => ko(a.name, b.name));
const brandOf = (id) => BRANDS.find((b) => b.id === id) ?? BRANDS[0];

/* ---------- 날짜 유틸 ---------- */
const pad = (n) => String(n).padStart(2, "0");
const ymd = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const keyOf = (dt) => ymd(dt.getFullYear(), dt.getMonth(), dt.getDate());
const today = new Date();
const todayKey = keyOf(today);
const dayKey = (n) => { const d = new Date(today); d.setDate(d.getDate() + n); return keyOf(d); };
const hm = (s) => s.slice(11, 16);
// 시작 시각 오름차순 -> 같으면 종료 시각 -> 등록 순
const byStart = (a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end) || a.id - b.id;

const SEED_EVENTS = [
  { id: 1, brand: "climb", place: "더클라임 강남", start: `${dayKey(0)}T19:00`, end: `${dayKey(0)}T21:30`, travel: 30, memo: "새 루트 세팅 확인" },
  { id: 2, brand: "forest", place: "서울숲 클라이밍 잠실", start: `${dayKey(2)}T10:00`, end: `${dayKey(2)}T12:00`, travel: 20, memo: "" },
  { id: 3, brand: "alle", place: "알레클라임 혜화", start: `${dayKey(2)}T18:30`, end: `${dayKey(2)}T20:30`, travel: 45, memo: "친구랑 같이" },
  { id: 4, brand: "stones", place: "스톤즈클라이밍", start: `${dayKey(5)}T20:00`, end: `${dayKey(5)}T22:00`, travel: 15, memo: "볼더링 위주" },
];

/* =====================================================================
   메인
   ===================================================================== */
export default function App() {
  const [ym, setYm] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [sel, setSel] = useState(todayKey);
  const [events, setEvents] = useState(SEED_EVENTS);
  const [sheet, setSheet] = useState(false);
  const [ymOpen, setYmOpen] = useState(false);

  const byDate = useMemo(() => {
    const map = {};
    events.forEach((e) => (map[e.start.slice(0, 10)] ??= []).push(e));
    Object.values(map).forEach((l) => l.sort(byStart));
    return map;
  }, [events]);

  const cells = useMemo(() => {
    const first = new Date(ym.y, ym.m, 1).getDay();
    const days = new Date(ym.y, ym.m + 1, 0).getDate();
    const arr = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
    while (arr.length < 42) arr.push(null); // 항상 6주 -> 셀 높이 고정
    return arr;
  }, [ym]);

  const moveMonth = (d) => setYm(({ y, m }) => { const n = new Date(y, m + d, 1); return { y: n.getFullYear(), m: n.getMonth() }; });
  const goToday = () => { setYm({ y: today.getFullYear(), m: today.getMonth() }); setSel(todayKey); setYmOpen(false); };
  const showToday = sel !== todayKey || ym.y !== today.getFullYear() || ym.m !== today.getMonth(); // 오늘이 아니거나 다른 달을 볼 때
  const list = byDate[sel] ?? [];
  const [sy, sm, sd] = sel.split("-").map(Number);
  const selLabel = TEXT.dayLabel(sm, sd, TEXT.weekdays[new Date(sy, sm - 1, sd).getDay()]);

  const handleSave = (ev) => {
    setEvents((p) => [...p, ev]);
    const [y, m] = ev.start.slice(0, 10).split("-").map(Number);
    setYm({ y, m: m - 1 });
    setSel(ev.start.slice(0, 10));
  };

  return (
    <div className={CLS.page} style={{ gridTemplateRows: LAYOUT.rows }}>
      <div className="flex min-h-0 flex-col overflow-hidden bg-white">
        <header className="relative flex shrink-0 items-center justify-between px-4 pb-2 pt-4">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="iconSm" onClick={() => moveMonth(-1)} aria-label={TEXT.aria.prevMonth}><ChevronLeft size={20} /></Button>
            <Button variant="ghost" size="none" onClick={() => setYmOpen((v) => !v)} aria-expanded={ymOpen} className="rounded-lg px-1.5 py-1 text-xl font-bold">
              <span className="tabular-nums">
                {ym.y}. <span className="inline-block min-w-[2.2ch] text-left">{ym.m + 1}</span>
              </span>
              <ChevronDown size={18} className={`transition-transform ${ymOpen ? "rotate-180" : ""}`} />
            </Button>
            <Button variant="ghost" size="iconSm" onClick={() => moveMonth(1)} aria-label={TEXT.aria.nextMonth}><ChevronRight size={20} /></Button>
          </div>
          <Button variant="ghost" size="icon" aria-label={TEXT.aria.menu}><Menu size={22} /></Button>

          {ymOpen && (
            <div className="absolute left-3 right-3 top-14 z-20 rounded-2xl bg-white p-3 shadow-xl ring-1 ring-black/5">
              <div className="mb-2 flex items-center justify-between px-1">
                <Button variant="ghost" size="iconSm" onClick={() => setYm((v) => ({ ...v, y: v.y - 1 }))} aria-label={TEXT.aria.prevYear}><ChevronLeft size={18} /></Button>
                <span className="font-semibold">{TEXT.year(ym.y)}</span>
                <Button variant="ghost" size="iconSm" onClick={() => setYm((v) => ({ ...v, y: v.y + 1 }))} aria-label={TEXT.aria.nextYear}><ChevronRight size={18} /></Button>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {Array.from({ length: 12 }, (_, i) => (
                  <Chip key={i} block shape="rounded" active={i === ym.m} onClick={() => { setYm((v) => ({ ...v, m: i })); setYmOpen(false); }}>
                    {TEXT.month(i)}
                  </Chip>
                ))}
              </div>
            </div>
          )}
        </header>

        <section className="flex min-h-0 flex-1 flex-col px-2 pb-2">
          <div className="grid shrink-0 grid-cols-7 py-1 text-center text-xs font-medium">
            {TEXT.weekdays.map((d, i) => <span key={d} className={DOW_HEAD_CLS[i]}>{d}</span>)}
          </div>
          <div className="grid min-h-0 flex-1 grid-cols-7" style={{ gridTemplateRows: LAYOUT.calendarRows }}>
            {cells.map((d, i) => {
              if (!d) return <div key={i} />;
              const k = ymd(ym.y, ym.m, d);
              const evs = byDate[k] ?? [];
              const isSel = k === sel;
              const first = evs[0]; // 셀에는 가장 이른 일정 1개만, 나머지는 +N
              const brand = first && brandOf(first.brand);
              return (
                <Button key={i} variant="bare" aria-pressed={isSel} onClick={() => setSel(k)} className={CLS.cell}
                  style={isSel ? { background: COLORS.accentSoft, boxShadow: `inset 0 0 0 2px ${COLORS.accent}` } : undefined}>
                  <span className={`${CLS.dateNum} ${isSel ? "font-bold" : k === todayKey ? CLS.dateNumToday : DOW_DATE_CLS[i % 7]}`}
                    style={isSel ? { background: COLORS.accent, color: COLORS.onAccent } : undefined}>{d}</span>
                  {first && (
                    <span className={CLS.cellBadge} style={{ background: brand.color + COLORS.badgeAlpha, color: brand.color }}>
                      <span className="min-w-0 truncate">{first.place}</span>
                      {evs.length > 1 && <span className="shrink-0">+{evs.length - 1}</span>}
                    </span>
                  )}
                </Button>
              );
            })}
          </div>
        </section>
      </div>

      <section className="flex min-h-0 flex-col overflow-hidden border-t border-black/5">
        <h2 className="shrink-0 px-4 pb-2 pt-3 text-[15px] font-bold">{selLabel}</h2>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[50px]">
          {list.length === 0 ? (
            <p className="rounded-2xl bg-white py-6 text-center text-sm text-black/40">{TEXT.empty[0]}<br />{TEXT.empty[1]}</p>
          ) : (
            <ul className="space-y-2.5">
              {list.map((e) => (
                <li key={e.id} className="flex overflow-hidden rounded-2xl bg-white shadow-sm">
                  <span className="w-1.5 shrink-0" style={{ background: brandOf(e.brand).color }} />
                  <div className="flex-1 space-y-1 p-3.5">
                    <p className="font-semibold">{e.place}</p>
                    <Meta icon={Clock}>{hm(e.start)} – {hm(e.end)}</Meta>
                    {e.travel > 0 && <Meta icon={Car}>{TEXT.travel(e.travel)}</Meta>}
                    {e.memo && <Meta icon={StickyNote}>{e.memo}</Meta>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <Button variant="floating" size="fab" aria-label={TEXT.aria.addEvent} onClick={() => setSheet(true)} className="absolute bottom-6 right-5 z-20">
        <Plus size={22} strokeWidth={2.75} />
      </Button>
      {showToday && (
        <Button variant="primary" size="sm" pill aria-label={TEXT.aria.goToday} onClick={goToday} className="absolute bottom-6 left-5 z-20 shadow-lg">
          {TEXT.today}
        </Button>
      )}

      {sheet && <AddSheet date={sel} onClose={() => setSheet(false)} onSave={handleSave} />}
    </div>
  );
}

const Meta = ({ icon: Icon, children }) => (
  <p className={CLS.meta}><Icon size={14} className="mt-0.5 shrink-0" />{children}</p>
);

/* =====================================================================
   일정 추가 (공통 Modal 사용)
   ===================================================================== */
function AddSheet({ date, onClose, onSave }) {
  const [open, setOpen] = useState(true);
  const [view, setView] = useState("form"); // form | place
  const [brandId, setBrandId] = useState(BRANDS[0].id);
  const [place, setPlace] = useState(null); // { brandId, text }
  const [start, setStart] = useState(`${date}T${DEFAULT_START_TIME}`);
  const [end, setEnd] = useState(`${date}T${DEFAULT_END_TIME}`);
  const [travel, setTravel] = useState(DEFAULT_TRAVEL);
  const [memo, setMemo] = useState("");

  const close = () => { setOpen(false); setTimeout(onClose, LAYOUT.sheetCloseMs); }; // 닫힘 애니메이션 후 제거
  const onStart = (v) => { setStart(v); if (v && end < v) setEnd(v); };
  const valid = place && start && end && end >= start;
  const save = () => {
    onSave({ id: Date.now(), brand: place.brandId, place: place.text, start, end, travel, memo: memo.trim() });
    close();
  };
  const selectPlace = (p) => { setPlace(p); setView("form"); };

  const header = view === "place"
    ? <ModalHeader left={<Button variant="ghost" size="iconSm" onClick={() => setView("form")} aria-label={TEXT.aria.back}><ChevronLeft size={22} /></Button>} title={TEXT.picker.title} />
    : <ModalHeader
        left={<Button variant="ghost" size="iconSm" onClick={close} aria-label={TEXT.aria.close}><X size={22} /></Button>}
        title={TEXT.sheet.title}
        right={<Button variant="text" onClick={save} disabled={!valid} className="rounded-full px-1 py-1 text-[15px]">{TEXT.sheet.save}</Button>} />;

  return (
    <Modal open={open} onClose={close} variant="sheet" handle flush showClose={false} header={header} aria-label={TEXT.sheet.title} className={CLS.sheet}>
      {view === "place" ? (
        <PlacePicker brandId={brandId} place={place} onBrand={setBrandId} onSelect={selectPlace} />
      ) : (
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-8">
          <Field icon={MapPin} label={TEXT.sheet.place}>
            <Button variant="field" onClick={() => setView("place")}>
              <span className={place ? "font-medium" : "text-black/35"}>{place?.text ?? TEXT.sheet.placeEmpty}</span>
              <ChevronRight size={18} className="text-black/30" />
            </Button>
          </Field>
          <Input type="datetime-local" label={TEXT.sheet.start} labelIcon={Clock} value={start} onChange={(e) => onStart(e.target.value)} />
          <Input type="datetime-local" label={TEXT.sheet.end} labelIcon={Clock} value={end} min={start} onChange={(e) => setEnd(e.target.value)} />
          <Field icon={Car} label={TEXT.sheet.travel}>
            <div className="flex flex-wrap gap-2">
              {OPTIONS.travel.map((t) => (
                <Chip key={t} active={t === travel} onClick={() => setTravel(t)}>{t === 0 ? TEXT.none : TEXT.minutes(t)}</Chip>
              ))}
            </div>
          </Field>
          <Input as="textarea" rows={3} label={TEXT.sheet.memo} labelIcon={StickyNote} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder={TEXT.sheet.memoPlaceholder} />
        </div>
      )}
    </Modal>
  );
}

/* ---------- 장소 선택: 좌측 센터(2/5) / 우측 지점 ---------- */
function PlacePicker({ brandId, place, onBrand, onSelect }) {
  const brand = brandOf(brandId);
  const branches = brand.branches.length ? brand.branches : [null]; // 지점이 없으면 '지점 구분 없음' 한 줄
  // 지점이 없는 브랜드는 누르는 즉시 선택 완료
  const pickBrand = (b) => { onBrand(b.id); if (b.branches.length === 0) onSelect({ brandId: b.id, text: b.name }); };

  return (
    <div className="flex min-h-0 flex-1 border-t border-black/5">
      <ul className="w-2/5 overflow-y-auto bg-[#F3F4F2]">
        {BRANDS.map((b) => (
          <li key={b.id}>
            <PickerRow active={b.id === brandId} onClick={() => pickBrand(b)} className="px-4 py-3.5">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: b.color }} />
              <span className="min-w-0 truncate">{b.name}</span>
            </PickerRow>
          </li>
        ))}
      </ul>
      <ul className="flex-1 overflow-y-auto">
        {branches.map((br) => {
          const text = br ? `${brand.name} ${br}` : brand.name;
          const on = place?.text === text;
          return (
            <li key={br ?? "all"}>
              <PickerRow active={on} plain onClick={() => onSelect({ brandId: brand.id, text })} className="justify-between px-5 py-3.5">
                <span className="min-w-0 truncate">{br ?? TEXT.picker.noBranch}</span>
                {on && <Check size={18} className="text-orange-600" />}
              </PickerRow>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** 목록 한 줄 (선택 시 굵게). plain=true면 선택 배경 없이 글씨만 굵게 */
function PickerRow({ active, plain = false, onClick, className = "", children }) {
  const tone = plain ? (active ? "font-bold" : "") : active ? "bg-white font-bold" : "text-black/60";
  return <Button variant="bare" onClick={onClick} className={`${CLS.pickerRow} ${tone} ${className}`}>{children}</Button>;
}
