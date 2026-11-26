import { useRef, useState } from "react";
import { BellRing, ChevronDown, Download, Heart, Plus, Trophy, Upload } from "lucide-react";
import AdSlot from "@/components/AdSlot";
import CollectionSheet from "@/components/CollectionSheet";
import PassSheet from "@/components/PassSheet";
import LegalLinks from "@/components/LegalLinks";
import { Button, ConfirmSheet, Container } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { BRANDS, brandOf } from "@/constants/brands";
import { AUTH_TEXT, PROVIDER_LABEL } from "@/constants/auth";
import { SYNC_TEXT } from "@/constants/sync";
import { COLLECTION } from "@/constants/collection";
import { ENDED_PASS_NOTE, PASS_ORDER, PASS_STATUS } from "@/constants/passes";
import { addDays, fmtDate, keyOf, toStr, todayKey } from "@/lib/dates";
import { backupFileName, buildBackup, downloadText, parseBackup } from "@/lib/backup";
import { byCreated } from "@/lib/id";
import { currentPause, endDate, endPause, finishCountEdit, passLine, passTitle, pauseHistory, pauseState, statusMap } from "@/lib/passes";
import "@/pages/MyPage.css";

/* ---------- 마이페이지: 프로필 / 내 이용권 / 찜 센터 ---------- */
export default function MyPage({ passes, favs, savePasses, onToggleFav, events, onDeleteRange, onRestore, backup, sync }) {
  const { session, signOut, deleteAccount } = useAuth();
  const [withdrawing, setWithdrawing] = useState(false); // 회원 탈퇴 확인 시트
  const [withdrawErr, setWithdrawErr] = useState("");
  const [collecting, setCollecting] = useState(false); // 이용권 모아보기 시트
  const [sheet, setSheet] = useState(null); // 이용권 추가/수정 시트: { pass?, preset? }
  const [showEnded, setShowEnded] = useState(false); // '소진된 이용권' 아코디언
  const [busy, setBusy] = useState(null); // 1회 사용 처리 중인 이용권 id
  const lock = useRef(false);
  const [delPass, setDelPass] = useState(null); // 삭제 확인 중인 이용권 id
  const fileRef = useRef(null);
  const [backupMsg, setBackupMsg] = useState("");
  const [incoming, setIncoming] = useState(null); // 가져오기 확인 중인 백업 { data, dropped, counts }
  const guest = session.type === "guest";
  const favBrands = BRANDS.filter((b) => favs.includes(`b:${b.id}`));

  const stMap = statusMap(passes);
  const sorted = [...passes].sort((a, b) => PASS_ORDER[stMap[a.id]] - PASS_ORDER[stMap[b.id]] || byCreated(a, b)); // 이용중 -> 사용대기 -> 만료됨
  const liveList = sorted.filter((x) => stMap[x.id] !== "expired"); // 이용중 -> 사용대기
  const endedList = passes.filter((x) => stMap[x.id] === "expired").sort((a, b) => endDate(b).localeCompare(endDate(a)) || byCreated(b, a)); // 종료일이 오늘에 가까운 순
  const upsertPass = (np) => savePasses((l) => (l.some((y) => y.id === np.id) ? l.map((y) => (y.id === np.id ? np : y)) : [...l, np]));
  // 사용 시작일 지정 시트: 기본값은 같은 종류 이용중 이용권이 끝난 다음 날, 없으면 오늘
  const openActivate = (x) => {
    const last = passes.filter((y) => y.brand === x.brand && y.kind === x.kind && stMap[y.id] === "active" && y.expires).map((y) => y.expires).sort().pop();
    setSheet({ pass: x, preset: { start: last && last >= todayKey ? addDays(last, 1) : keyOf(new Date()) } });
  };
  // 1회 사용: 처리 중에는 잠그고(ref+비활성) 연타/더블클릭에도 정확히 1회만 차감, 0회가 되면 소진된 이용권으로 이동
  const consumeOnce = (x) => {
    if (lock.current) return;
    lock.current = true; setBusy(x.id);
    savePasses((l) => l.map((y) => (y.id === x.id && y.remaining > 0 ? finishCountEdit(y, { ...y, remaining: y.remaining - 1 }, toStr(new Date())) : y))); // 직접 맞춘 횟수: 지금 이후 시작하는 일정부터 자동 차감
    setTimeout(() => { lock.current = false; setBusy(null); }, 700);
  };
  const exportData = () => { downloadText(backupFileName(keyOf(new Date())), buildBackup({ events, passes, favs })); backup.onBackedUp(); setBackupMsg("백업 파일을 저장했어요."); };
  const onPickFile = async (e) => {
    const f = e.target.files?.[0]; e.target.value = ""; // 같은 파일을 다시 골라도 동작하도록 초기화
    if (!f) return;
    const r = parseBackup(await f.text());
    if (r.ok) { setBackupMsg(""); setIncoming(r); } else setBackupMsg(r.error);
  };
  const confirmImport = () => { onRestore(incoming.data); backup.onBackedUp(); setBackupMsg(`불러왔어요 · 일정 ${incoming.counts.events}개, 이용권 ${incoming.counts.passes}개`); setIncoming(null); };
  // 컴팩트 카드 2행 구성
  //  1행: [브랜드명 · 종류] | [정지 이력] | [상태 배지]
  //  2행: [유효 기간 · D-day] | [버튼 그룹]
  const renderPass = (x) => {
    const sk = stMap[x.id], ps = pauseState(x), cp = currentPause(x), b = brandOf(x.brand);
    const badge = ps === "active" ? PASS_STATUS.paused : PASS_STATUS[sk];
    const hist = x.kind === "period" ? (sk === "waiting" ? null : pauseHistory(x) ? `정지 ${pauseHistory(x)}회` : "정지 이력 없음") : x.usedKeys?.length ? `자동 차감 ${x.usedKeys.length}회` : null;
    return (
      <div key={x.id} data-pass={x.id} data-status={sk} className="mp-pass">
        <div className="mp-pass__row">
          <span className="mp-pass__name">
            <span className="brand-dot" style={{ "--brand": b.color, "--dot-size": "8px" }} />
            <span className="mp-pass__ellipsis">{b.name} · {passTitle(x)}</span>
          </span>
          {hist && <span className="mp-pass__hist">{hist}</span>}
          <span className="mp-badge" data-tone={badge.tone}>{badge.label}</span>
        </div>
        <div className="mp-pass__row mp-pass__row--2">
          <span className="mp-pass__line">{passLine(x, sk)}</span>
          <span className="mp-pass__actions">
            {x.kind === "count" && sk === "active" && <Button variant="secondary" size="sm" className="mp-mini" disabled={busy === x.id} onClick={() => consumeOnce(x)}>1회 사용</Button>}
            {cp && sk !== "expired"
              ? <Button variant="outline" size="sm" className="mp-mini" onClick={() => savePasses((l) => l.map((y) => (y.id === x.id ? endPause(y) : y)))}>정지 해제</Button>
              : sk === "active" && x.kind === "period" && <Button variant="outline" size="sm" className="mp-mini" onClick={() => setSheet({ pass: x, preset: { pause: true } })}>기간 정지</Button>}
            {sk === "waiting" && <Button variant="outline" size="sm" className="mp-mini" onClick={() => openActivate(x)}>사용 시작일 지정</Button>}
            <Button variant="outline" size="sm" className="mp-mini" aria-label={`${b.name} ${passTitle(x)} 수정`} onClick={() => setSheet({ pass: x })}>수정</Button>
            <Button variant="danger" size="sm" className="mp-mini" aria-label={`${b.name} ${passTitle(x)} 삭제`} onClick={() => setDelPass(x.id)}>삭제</Button>
          </span>
        </div>
        {cp && sk !== "expired" && (
          <div className="mp-pass__pause">
            {ps === "active" ? "정지 기간" : "정지 예정 기간"}: {fmtDate(cp.from)} ~ {fmtDate(cp.to)}
          </div>
        )}
      </div>
    );
  };

  return (
    <Container height="fill" className="mp">
      <header className="mp__header">
        <span className="mp__spacer" />
        <h1 className="mp__title">마이페이지</h1>
        <span className="mp__spacer" />
      </header>

      <div className="mp__body" data-gap="20">
        {backup.due && (
          <div role="status" data-backup-notice className="mp-notice">
            <p className="mp-notice__text"><BellRing size={16} aria-hidden="true" />{backup.text}</p>
            <div className="mp-notice__actions">
              <Button variant="primary" size="sm" onClick={exportData}>지금 백업</Button>
              <Button variant="secondary" size="sm" onClick={backup.onSnooze}>7일 뒤에 다시</Button>
            </div>
          </div>
        )}
        <div className="mp-box mp-profile">
          <span className="mp-avatar">{guest ? "G" : (session.name || "?").slice(0, 1).toUpperCase()}</span>
          <span className="mp-profile__text">
            <span className="mp-profile__name">{guest ? "비회원(Guest)" : session.name}</span>
            <span className="mp-profile__sub">{guest ? "이 기기에만 저장돼요" : `${PROVIDER_LABEL[session.provider] ?? session.provider} 로그인`}</span>
          </span>
        </div>

        <section>
          <h4 className="mp-section-title">내 이용권</h4>
          {/* 이용권 전체 영역: 화면 높이의 60%를 넘으면 안에서 스크롤 */}
          <div data-passes-scroll className="mp-passes">
            {[["period", "기간권"], ["count", "횟수권"]].map(([kk, label]) => (
              <div key={kk}>
                <div className="mp-kind-title">{label}</div>
                <div className="mp-stack">
                  {liveList.filter((x) => x.kind === kk).length === 0 && <p className="mp-muted">등록된 {label}이 없어요.</p>}
                  {liveList.filter((x) => x.kind === kk).map(renderPass)}
                </div>
              </div>
            ))}
            {endedList.length > 0 && (
              <div>
                <Button variant="secondary" size="md" fullWidth className="mp-accordion" aria-expanded={showEnded} onClick={() => setShowEnded((v) => !v)}>
                  <span>소진된 이용권 ({endedList.length})</span>
                  <ChevronDown size={18} className="mp-accordion__chevron" data-open={showEnded || undefined} />
                </Button>
                {showEnded && <div className="mp-stack mp-stack--top">
                  <p className="mp-muted">{ENDED_PASS_NOTE}</p>
                  {endedList.map(renderPass)}
                </div>}
              </div>
            )}
          </div>
          <Button variant="secondary" size="md" fullWidth className="mp-add-pass" onClick={() => setSheet({})}><Plus size={16} />이용권 추가</Button>
          <Button variant="secondary" size="md" fullWidth className="mp-add-pass" onClick={() => setCollecting(true)}><Trophy size={16} />{COLLECTION.open}</Button>
        </section>

        <section>
          <h4 className="mp-section-title">찜한 센터</h4>
          {favBrands.length === 0 ? <p className="mp-muted">장소 선택에서 센터에 하트를 누르면 여기에 모여요.</p> : (
            <div className="mp-chips">
              {favBrands.map((b) => (
                <Button key={b.id} variant="secondary" size="sm" pill aria-label={`${b.name} 찜 해제`} onClick={() => onToggleFav(`b:${b.id}`)}>
                  <Heart size={14} className="mp-heart" />{b.name}
                </Button>
              ))}
            </div>
          )}
        </section>

        <AdSlot placement="mypage" />

        <section>
          <h4 className="mp-section-title">데이터 백업</h4>
          <p className="mp-muted">일정·이용권·찜을 파일로 저장하고, 다른 기기나 새 주소에서 불러올 수 있어요.</p>
          <div className="mp-backup">
            <Button variant="secondary" size="md" onClick={exportData}><Download size={16} />내보내기</Button>
            <Button variant="secondary" size="md" onClick={() => fileRef.current?.click()}><Upload size={16} />가져오기</Button>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden aria-label="백업 파일 선택" onChange={onPickFile} />
          </div>
          {backupMsg && <p role="status" className="mp-backup__msg">{backupMsg}</p>}
          {!guest && sync?.state !== "off" && (
            <div className="mp-sync" role="status">
              <span className={`mp-sync__text${sync.state === "error" ? " mp-sync__text--error" : ""}`}>
                {sync.state === "syncing" ? SYNC_TEXT.syncing : sync.state === "error" ? SYNC_TEXT.error : SYNC_TEXT.ok(new Date(sync.at).toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" }))}
              </span>
              {sync.state === "error" && <Button variant="ghost" size="sm" onClick={sync.retry}>{SYNC_TEXT.retry}</Button>}
              {sync.skipped > 0 && <span className="mp-sync__text mp-sync__text--error">{SYNC_TEXT.skipped(sync.skipped)}</span>}
            </div>
          )}
        </section>

        <Button variant="outline" size="lg" fullWidth onClick={signOut}>{guest ? "로그인 / 가입" : "로그아웃"}</Button>
        {!guest && <Button variant="ghost" size="md" fullWidth className="mp-withdraw" onClick={() => { setWithdrawErr(""); setWithdrawing(true); }}>{AUTH_TEXT.withdraw}</Button>}
        <LegalLinks />
      </div>

      {/* ---- 모든 모달/팝업은 공통 Sheet (하단 슬라이드업 · 풀 하이트) ---- */}
      {collecting && <CollectionSheet passes={passes} onClose={() => setCollecting(false)} />}
      {sheet && <PassSheet initial={sheet.pass} preset={sheet.preset} passes={passes} events={events} onSave={upsertPass} onDeleteRange={onDeleteRange} onClose={() => setSheet(null)} />}
      {withdrawing && (
        <ConfirmSheet label="회원 탈퇴 확인" title={AUTH_TEXT.withdrawTitle} onClose={() => setWithdrawing(false)} actions={(c) => <>
          <Button variant="secondary" onClick={c}>취소</Button>
          <Button variant="danger-solid" onClick={async () => { try { await deleteAccount(); } catch (e) { setWithdrawErr(AUTH_TEXT.withdrawFailed); } }}>{AUTH_TEXT.withdrawOk}</Button>
        </>}>
          <p className="ui-sheet__text">{AUTH_TEXT.withdrawBody}</p>
          <p className="ui-sheet__text">{AUTH_TEXT.withdrawHint}</p>
          {withdrawErr && <p role="alert" className="mp-error">{withdrawErr}</p>}
        </ConfirmSheet>
      )}
      {incoming && (
        <ConfirmSheet label="백업 가져오기 확인" title="백업을 불러올까요?" onClose={() => setIncoming(null)} actions={(c) => <>
          <Button variant="secondary" onClick={c}>취소</Button>
          <Button variant="danger-solid" onClick={confirmImport}>불러오기</Button>
        </>}>
          <p className="ui-sheet__text">
            지금 데이터(일정 {events.length}개 · 이용권 {passes.length}개)가 백업 데이터(일정 {incoming.counts.events}개 · 이용권 {incoming.counts.passes}개 · 찜 {incoming.counts.favs}개)로 바뀌어요.
            {incoming.dropped > 0 && <><br />형식이 맞지 않는 {incoming.dropped}개 항목은 제외돼요.</>}
          </p>
          <p className="ui-sheet__text">먼저 '내보내기'로 지금 데이터를 저장해 두면 안전해요.</p>
        </ConfirmSheet>
      )}
      {delPass != null && (
        <ConfirmSheet label="이용권 삭제 확인" title="이용권을 삭제하시겠습니까?" onClose={() => setDelPass(null)} actions={(c) => <>
          <Button variant="secondary" onClick={c}>취소</Button>
          <Button variant="danger-solid" onClick={() => { savePasses((l) => l.filter((y) => y.id !== delPass)); setDelPass(null); }}>확인</Button>
        </>}>
          <p className="ui-sheet__text">삭제한 이용권은 다시 복구할 수 없습니다.</p>
        </ConfirmSheet>
      )}
    </Container>
  );
}
