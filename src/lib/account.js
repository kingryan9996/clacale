import { MOCK_PASSES, seed } from "@/lib/seed";
import { store } from "@/lib/store";

export const uidOf = (sess) => (sess?.type === "user" ? sess.id : "guest");

/* 로그인/게스트 진입 시 계정별 저장소를 준비: 첫 로그인 때는 게스트 데이터(일정·이용권·암장)를 이어받음 */
export function prepareAccount(sess) {
  const k = uidOf(sess);
  const mig = (name, d) => {
    let v = store.get(`clacale:${name}:${k}`, null);
    if (v === null) { v = sess.type === "user" ? store.get(`clacale:${name}:guest`, d) : d; store.set(`clacale:${name}:${k}`, v); }
    return v;
  };
  mig("events", seed);
  mig("passes", MOCK_PASSES);
  mig("gyms", []);
}
