import { useState } from "react";
import { Plus, StickyNote, Trash2, X } from "lucide-react";
import { Row, fieldStyle } from "../components/AddSheet";
import Button, { BUTTON_CSS } from "../components/Button";
import Sheet, { titleStyle, topBar } from "../components/Sheet";
import { INK, font } from "../lib/constants";
import { fmtShort, toStr } from "../lib/dates";
import { store } from "../lib/store";

/* ---------- 자유게시판: 클라이머 커뮤니티 (글 목록 + 글쓰기, localStorage 저장) ---------- */
const BOARD_KEY = "clacale:board";
const seedPosts = () => [
  { id: 3, title: "이번 주말 더클라임 강남 같이 가실 분?", body: "토요일 오후 2시쯤 갈 예정이에요. 초보도 환영합니다!", author: "클라이머A", ts: Date.now() - 3 * 3600000 },
  { id: 2, title: "서울숲 클라이밍 새 루트 후기", body: "이번에 세팅된 파랑 루트가 꽤 재밌어요. 홀드 간격이 넓어서 키 작은 분들은 조금 힘들 수 있어요.", author: "볼더링러버", ts: Date.now() - 26 * 3600000 },
  { id: 1, title: "처음 시작하는 분들께 팁", body: "신발은 처음에 너무 작게 사지 않는 게 좋아요. 대여 신발로 몇 번 가 보고 고르세요.", author: "초크가루", ts: Date.now() - 4 * 86400000 },
];
const timeLabel = (ts) => fmtShort(toStr(new Date(ts)));

export default function Board({ session }) {
  const me = session.type === "guest" ? "비회원" : session.name;
  const [posts, setPosts] = useState(() => store.get(BOARD_KEY, null) ?? seedPosts());
  const [openId, setOpenId] = useState(null); // 펼친 글
  const [writing, setWriting] = useState(false);
  const savePosts = (fn) => setPosts((p) => { const n = fn(p); store.set(BOARD_KEY, n); return n; });
  const sorted = [...posts].sort((a, b) => b.ts - a.ts);

  return (
    <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column", background: "#F3F4F2", color: INK, fontFamily: font }}>
      <style>{BUTTON_CSS}</style>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 16px 8px", flexShrink: 0 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>자유게시판</h1>
        <Button variant="brand" size="sm" onClick={() => setWriting(true)}><Plus size={16} />글쓰기</Button>
      </header>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        {sorted.length === 0 && <p style={{ margin: 0, padding: "24px 0", textAlign: "center", fontSize: 14, color: "rgba(0,0,0,.4)", background: "#fff", borderRadius: 16 }}>아직 글이 없어요. 첫 글을 남겨 보세요.</p>}
        {sorted.map((p) => {
          const open = openId === p.id;
          return (
            <article key={p.id} data-post={p.id} style={{ background: "#fff", borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,.08)", overflow: "hidden" }}>
              <Button variant="ghost" size="none" aria-expanded={open} onClick={() => setOpenId(open ? null : p.id)}
                style={{ display: "block", width: "100%", textAlign: "left", padding: 14, borderRadius: 0 }}>
                <span style={{ display: "block", fontWeight: 700 }}>{p.title}</span>
                <span style={{ display: "block", marginTop: 2, fontSize: 12, color: "rgba(0,0,0,.45)" }}>{p.author} · {timeLabel(p.ts)}</span>
                <span style={{ display: "block", marginTop: 8, fontSize: 14, lineHeight: 1.5, color: "rgba(0,0,0,.65)", whiteSpace: "pre-wrap", ...(open ? null : { overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }) }}>{p.body}</span>
              </Button>
              {open && p.author === me && (
                <div style={{ display: "flex", justifyContent: "flex-end", padding: "0 14px 12px" }}>
                  <Button variant="danger" size="sm" aria-label={`${p.title} 삭제`} onClick={() => { savePosts((l) => l.filter((x) => x.id !== p.id)); setOpenId(null); }}><Trash2 size={14} />삭제</Button>
                </div>
              )}
            </article>
          );
        })}
      </div>
      {writing && <WriteSheet author={me} onClose={() => setWriting(false)} onSubmit={(post) => savePosts((l) => [post, ...l])} />}
    </div>
  );
}

function WriteSheet({ author, onClose, onSubmit }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const valid = title.trim() && body.trim();
  return (
    <Sheet onClose={onClose}>
      {(close) => (
        <>
          <div style={topBar}>
            <Button variant="ghost" size="icon" onClick={close} aria-label="닫기"><X size={22} /></Button>
            <h3 style={titleStyle}>글쓰기</h3>
            <Button variant="ghost" size="none" disabled={!valid} style={{ padding: "4px 4px", fontSize: 15, fontWeight: 700, color: "#EA580C" }}
              onClick={() => { onSubmit({ id: Date.now(), title: title.trim(), body: body.trim(), author, ts: Date.now() }); close(); }}>등록</Button>
          </div>
          <div style={{ padding: "0 16px 24px", display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" }}>
            <Row icon={StickyNote} label="제목">
              <input aria-label="제목" value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} placeholder="제목을 입력하세요" style={fieldStyle} />
            </Row>
            <Row icon={StickyNote} label="내용">
              <textarea aria-label="내용" rows={6} value={body} maxLength={1000} onChange={(e) => setBody(e.target.value)} placeholder="클라이머들과 나누고 싶은 이야기를 적어 보세요" style={{ ...fieldStyle, resize: "none" }} />
            </Row>
            <p style={{ margin: 0, fontSize: 12, color: "rgba(0,0,0,.45)" }}>작성자: {author} · 이 기기에만 저장돼요.</p>
          </div>
        </>
      )}
    </Sheet>
  );
}
