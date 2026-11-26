import { Fragment, useState } from "react";
import { Plus, StickyNote, Trash2, X } from "lucide-react";
import AdSlot from "@/components/AdSlot";
import { ADS } from "@/constants/ads";
import { Button, Field, Input, Sheet, SheetBody, SheetHeader } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { BOARD_KEY, seedPosts } from "@/constants/board";
import { fmtShort, toStr } from "@/lib/dates";
import { newId } from "@/lib/id";
import { store } from "@/lib/store";
import "@/pages/Board.css";

/* ---------- 자유게시판: 클라이머 커뮤니티 (글 목록 + 글쓰기, localStorage 저장) ---------- */
const timeLabel = (ts) => fmtShort(toStr(new Date(ts)));

export default function Board() {
  const { session } = useAuth();
  const me = session.type === "guest" ? "비회원" : session.name;
  const [posts, setPosts] = useState(() => store.get(BOARD_KEY, null) ?? seedPosts());
  const [openId, setOpenId] = useState(null); // 펼친 글
  const [writing, setWriting] = useState(false);
  const savePosts = (fn) => setPosts((p) => { const n = fn(p); store.set(BOARD_KEY, n); return n; });
  const sorted = [...posts].sort((a, b) => b.ts - a.ts);

  return (
    <div className="board">
      <header className="board__header">
        <h1 className="board__title">자유게시판</h1>
        <Button variant="primary" size="sm" onClick={() => setWriting(true)}><Plus size={16} />글쓰기</Button>
      </header>
      <div className="board__list">
        {sorted.length === 0 && <p className="board__empty">아직 글이 없어요. 첫 글을 남겨 보세요.</p>}
        {sorted.map((p, i) => {
          const open = openId === p.id;
          return (
            <Fragment key={p.id}>
            <article data-post={p.id} className="board__post">
              <Button variant="ghost" size="bare" className="board__post-btn" aria-expanded={open} onClick={() => setOpenId(open ? null : p.id)}>
                <span className="board__post-title">{p.title}</span>
                <span className="board__post-meta">{p.author} · {timeLabel(p.ts)}</span>
                <span className="board__post-body" data-open={open || undefined}>{p.body}</span>
              </Button>
              {open && p.author === me && (
                <div className="board__post-actions">
                  <Button variant="danger" size="sm" aria-label={`${p.title} 삭제`} onClick={() => { savePosts((l) => l.filter((x) => x.id !== p.id)); setOpenId(null); }}><Trash2 size={14} />삭제</Button>
                </div>
              )}
            </article>
            {(i + 1) % ADS.placements.board.every === 0 && <AdSlot placement="board" />}
            </Fragment>
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
          <SheetHeader
            left={<Button variant="ghost" size="icon" onClick={close} aria-label="닫기"><X size={22} /></Button>}
            title="글쓰기"
            right={<Button variant="ghost" size="bare" className="board__submit" disabled={!valid}
              onClick={() => { onSubmit({ id: newId(), title: title.trim(), body: body.trim(), author, ts: Date.now() }); close(); }}>등록</Button>}
          />
          <SheetBody>
            <Field icon={StickyNote} label="제목" htmlFor="board-title">
              <Input id="board-title" aria-label="제목" value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} placeholder="제목을 입력하세요" />
            </Field>
            <Field icon={StickyNote} label="내용" htmlFor="board-body">
              <Input as="textarea" id="board-body" aria-label="내용" rows={6} value={body} maxLength={1000} onChange={(e) => setBody(e.target.value)} placeholder="클라이머들과 나누고 싶은 이야기를 적어 보세요" />
            </Field>
            <p className="board__hint">작성자: {author} · 이 기기에만 저장돼요.</p>
          </SheetBody>
        </>
      )}
    </Sheet>
  );
}
