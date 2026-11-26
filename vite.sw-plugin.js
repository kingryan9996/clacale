/* 빌드할 때 dist/sw.js 안의 __BUILD_ID__ 를 매번 다른 값으로 바꿔 줍니다.
   (값이 같으면 브라우저가 "새 버전"을 알아채지 못하므로 필수) */
import fs from "node:fs";
import path from "node:path";

export function stampBuildId(file, id) {
  if (!fs.existsSync(file)) return false;
  const src = fs.readFileSync(file, "utf8");
  if (!src.includes("__BUILD_ID__")) return false;
  fs.writeFileSync(file, src.replaceAll("__BUILD_ID__", id));
  return true;
}

export default function swBuildId() {
  let outDir = "dist";
  return {
    name: "clacale-sw-build-id",
    apply: "build",
    enforce: "post",
    configResolved(c) { outDir = path.resolve(c.root, c.build.outDir); },
    closeBundle() {
      const sha = (process.env.VERCEL_GIT_COMMIT_SHA || "local").slice(0, 7);
      const id = `${sha}-${Date.now().toString(36)}`;
      if (!stampBuildId(path.join(outDir, "sw.js"), id)) console.warn("[sw] dist/sw.js 에 빌드 번호를 넣지 못했습니다");
    },
  };
}
