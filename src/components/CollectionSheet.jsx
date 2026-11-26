import { useState } from "react";
import { X } from "lucide-react";
import { Button, Sheet, SheetBody, SheetHeader } from "@/components/ui";
import { brandOf } from "@/constants/brands";
import { COLLECTION } from "@/constants/collection";
import { PASS_STATUS } from "@/constants/passes";
import { collectStats, collectYears } from "@/lib/collection";
import { todayKey } from "@/lib/dates";
import { passLine, passTitle, pauseState, statusMap } from "@/lib/passes";
import "@/components/CollectionSheet.css";

/* ---------- 이용권 모아보기: 지금까지 모은 이용권을 연도별로 한눈에 ---------- */
export default function CollectionSheet({ passes, onClose }) {
  const [year, setYear] = useState(null); // null = 전체
  const years = collectYears(passes);
  const s = collectStats(passes, todayKey, year);
  const st = statusMap(passes);
  const tiles = [
    [COLLECTION.tiles.passes, `${s.passCount}개`, `기간권 ${s.periodCount} · 횟수권 ${s.countCount}`],
    [COLLECTION.tiles.days, `${s.periodDays}일`, "정지한 날 제외"],
    [COLLECTION.tiles.uses, `${s.countUses}회`, ""],
    [COLLECTION.tiles.pauses, `${s.pauseCount}회`, "기간권 기준"],
  ];
  const chip = (on) => ({ variant: on ? "primary" : "secondary", size: "sm", pill: true, "aria-pressed": on });
  return (
    <Sheet label={COLLECTION.title} onClose={onClose}>
      {(close) => (
        <>
          <SheetHeader left={<Button variant="ghost" size="icon" onClick={close} aria-label="닫기"><X size={22} /></Button>} title={COLLECTION.title} />
          <SheetBody gap={16}>
            {years.length === 0 ? <p className="cs-empty" data-empty>{COLLECTION.empty}</p> : (
              <>
                <div className="cs-chips">
                  <Button {...chip(year === null)} onClick={() => setYear(null)}>{COLLECTION.all}</Button>
                  {years.map((y) => <Button key={y} {...chip(year === y)} onClick={() => setYear(y)}>{y}년</Button>)}
                </div>
                <div className="cs-tiles" data-tiles>
                  {tiles.map(([label, value, sub]) => (
                    <div key={label} className="cs-tile">
                      <span className="cs-tile__label">{label}</span>
                      <b className="cs-tile__value">{value}</b>
                      {sub && <span className="cs-tile__sub">{sub}</span>}
                    </div>
                  ))}
                </div>
                <section>
                  <h4 className="cs-title">{COLLECTION.brands}</h4>
                  <ul className="cs-brands">
                    {s.brands.map((b) => {
                      const br = brandOf(b.brand);
                      const parts = [b.days > 0 && `${b.days}일`, b.uses > 0 && `${b.uses}회`].filter(Boolean).join(" · ");
                      return (
                        <li key={b.brand} className="cs-brand" data-brand-row>
                          <span className="cs-brand__name"><span className="brand-dot" style={{ "--brand": br.color, "--dot-size": "8px" }} />{br.name}</span>
                          <span className="cs-brand__meta">이용권 {b.passCount}개{parts ? ` · ${parts}` : ""}</span>
                        </li>
                      );
                    })}
                  </ul>
                </section>
                <section>
                  <h4 className="cs-title">{COLLECTION.list}</h4>
                  <ul className="cs-list">
                    {s.list.map((p) => {
                      const br = brandOf(p.brand), badge = pauseState(p) === "active" ? PASS_STATUS.paused : PASS_STATUS[st[p.id]];
                      return (
                        <li key={p.id} className="cs-item" data-collect-item>
                          <div className="cs-item__top">
                            <span className="cs-item__name"><span className="brand-dot" style={{ "--brand": br.color, "--dot-size": "8px" }} />{br.name} · {passTitle(p)}</span>
                            <span className="cs-badge" data-tone={badge.tone}>{badge.label}</span>
                          </div>
                          <div className="cs-item__line">{passLine(p, st[p.id])}</div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
                <p className="cs-note">{COLLECTION.note}</p>
              </>
            )}
          </SheetBody>
        </>
      )}
    </Sheet>
  );
}
