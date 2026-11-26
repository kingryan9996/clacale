import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { stampBuildId } from "./vite.sw-plugin.js";

describe("stampBuildId", () => {
  const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "clacale-sw-"));
  it("sw.js의 __BUILD_ID__ 를 모두 바꾼다", () => {
    const f = path.join(tmp(), "sw.js");
    fs.writeFileSync(f, 'const BUILD = "__BUILD_ID__"; // __BUILD_ID__');
    expect(stampBuildId(f, "abc-123")).toBe(true);
    expect(fs.readFileSync(f, "utf8")).toBe('const BUILD = "abc-123"; // abc-123');
  });
  it("파일이 없거나 표시가 없으면 false", () => {
    expect(stampBuildId(path.join(tmp(), "nope.js"), "x")).toBe(false);
    const f = path.join(tmp(), "sw.js");
    fs.writeFileSync(f, "const BUILD = 1;");
    expect(stampBuildId(f, "x")).toBe(false);
  });
  it("실제 public/sw.js 에 표시가 들어 있다", () => {
    expect(fs.readFileSync(path.resolve("public/sw.js"), "utf8")).toContain('"__BUILD_ID__"');
  });
});
