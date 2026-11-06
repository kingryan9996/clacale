/* ---------- 저장소: localStorage가 막힌 환경(미리보기)에서는 오류 없이 메모리로 대체 ---------- */
const mem = {};

export const store = {
  get(k, d) { try { const v = window.localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return k in mem ? mem[k] : d; } },
  set(k, v) { try { window.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { mem[k] = v; } },
};
