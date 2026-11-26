import { LEGAL_META } from "@/constants/legal";

/* 문서의 {{키}} 를 LEGAL_META 값으로 바꾼다. 값이 비어 있으면 눈에 띄는 "[… 입력 필요]" 로 둔다 */
const LABELS = { operator: "운영자 이름", contactEmail: "문의 이메일", supabaseRegion: "서버 위치", effectiveDate: "시행일" };

export const fillMeta = (text, meta = LEGAL_META) =>
  text.replace(/\{\{(\w+)\}\}/g, (_, k) => (meta[k] ? meta[k] : `[${LABELS[k] ?? k} 입력 필요]`));

// 공개 전에 채워야 하는데 아직 비어 있는 항목 이름들
export const draftIssues = (meta = LEGAL_META) => Object.keys(LABELS).filter((k) => !meta[k]).map((k) => LABELS[k]);
