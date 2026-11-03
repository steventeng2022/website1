import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import ts from "typescript";

const source = await readFile(new URL("../app/site-uptime.tsx", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText
  .replaceAll('"react"', JSON.stringify(import.meta.resolve("react")))
  .replaceAll('"react/jsx-runtime"', JSON.stringify(import.meta.resolve("react/jsx-runtime")));
const { default: SiteUptime } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

test("uptime initial rendering stays identical across server and client clock boundaries", () => {
  const originalNow = Date.now;
  try {
    Date.now = () => Date.parse("2026-11-03T10:59:59Z");
    const server = renderToString(createElement(SiteUptime));
    Date.now = () => Date.parse("2026-11-03T11:00:02Z");
    const firstClientRender = renderToString(createElement(SiteUptime));
    assert.equal(server, firstClientRender);
    assert.equal((server.match(/<strong>—<\/strong>/g) ?? []).length, 4);
    assert.match(server, /正在載入網站上線時間/);
  } finally {
    Date.now = originalNow;
  }
});

test("uptime labels follow public English mode while defaulting to Chinese", () => {
  const english = renderToString(createElement(SiteUptime, { compact: true, en: true }));
  assert.match(english, /Loading website uptime/);
  for (const unit of ["days", "hours", "minutes", "seconds"]) assert.ok(english.includes(`<small>${unit}</small>`));
  const chinese = renderToString(createElement(SiteUptime));
  for (const unit of ["天", "小時", "分鐘", "秒"]) assert.ok(chinese.includes(`<small>${unit}</small>`));
});
