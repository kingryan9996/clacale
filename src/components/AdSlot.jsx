import { useEffect, useRef } from "react";
import { AD_LABEL, AD_PREVIEW_TEXT, ADS } from "@/constants/ads";
import "@/components/AdSlot.css";

/* ---------- 광고 자리: <AdSlot placement="calendarList" /> ----------
   - ADS.mode 가 "off" 이면 null(공간도 없음). "preview" 는 자리만 표시, "live" 는 실제 광고.
   - 높이를 고정해 광고 로딩 때 레이아웃이 움직이지 않게 한다. 항상 "광고" 라벨을 붙인다.
   - 놓아도 되는 곳: 캘린더 목록 맨 아래 / 마이페이지 섹션 사이 / 게시판 글 5개마다.
     놓으면 안 되는 곳: Sheet(모달) 안, FAB·하단 탭·저장/삭제 버튼 바로 옆, 첫 화면 맨 위. (CLAUDE.md) */
let scriptPromise = null;
const loadAdScript = (client) => {
  scriptPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.async = true; s.crossOrigin = "anonymous";
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
    s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
  return scriptPromise;
};

function LiveAd({ slot, client }) {
  const ref = useRef(null);
  useEffect(() => {
    let alive = true;
    loadAdScript(client).then(() => {
      if (!alive || !ref.current || ref.current.dataset.adsbygoogleStatus) return;
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) { /* 광고 실패는 조용히 무시 */ }
    }).catch(() => {});
    return () => { alive = false; };
  }, [client]);
  return <ins ref={ref} className="adsbygoogle ad__ins" data-ad-client={client} data-ad-slot={slot} data-ad-format="auto" data-full-width-responsive="true" />;
}

export default function AdSlot({ placement, className }) {
  const cfg = ADS.placements[placement];
  if (ADS.mode === "off" || !cfg) return null;
  const live = ADS.mode === "live";
  if (live && !(ADS.client && cfg.slot)) return null; // 설정이 덜 채워졌으면 그리지 않음
  return (
    <aside className={`ad ${className ?? ""}`} aria-label={AD_LABEL} style={{ "--ad-h": `${cfg.height}px` }}>
      <span className="ad__label">{AD_LABEL}</span>
      <div className="ad__box">
        {live ? <LiveAd slot={cfg.slot} client={ADS.client} /> : <span className="ad__preview">{AD_PREVIEW_TEXT}</span>}
      </div>
    </aside>
  );
}
