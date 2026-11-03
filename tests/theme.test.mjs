import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = await readFile(new URL("../app/theme.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function themeBrowser({ stored = null, dark = false, blocked = false } = {}) {
  const root = { dataset: {}, style: {} };
  const events = [];
  const storage = {
    getItem() { if (blocked) throw new Error("Storage blocked"); return stored; },
    setItem(key, value) { if (blocked) throw new Error("Storage blocked"); stored = value; },
  };
  const sandbox = {
    exports: {}, document: { documentElement: root }, localStorage: storage,
    Event: class { constructor(type) { this.type = type; } },
    window: { localStorage: storage, matchMedia: () => ({ matches: dark }), dispatchEvent: (event) => events.push(event.type) },
  };
  vm.createContext(sandbox);
  vm.runInContext(compiled, sandbox);
  vm.runInContext(sandbox.exports.themeInitScript, sandbox);
  return { root, events, api: sandbox.exports, saved: () => stored };
}

test("theme bootstrap uses the system before a visitor chooses", () => {
  for (const dark of [true, false]) {
    const { root } = themeBrowser({ dark });
    assert.equal(root.dataset.theme, dark ? "dark" : "light");
    assert.equal(root.style.colorScheme, root.dataset.theme);
    assert.equal(root.dataset.themePreference, "system");
  }
});

test("a saved theme overrides the operating system before paint", () => {
  const { root } = themeBrowser({ stored: "light", dark: true });
  assert.equal(root.dataset.theme, "light");
  assert.equal(root.dataset.themePreference, "light");
});

test("invalid or blocked storage still resolves a valid system theme", () => {
  for (const options of [{ stored: "unexpected", dark: true }, { blocked: true, dark: true }]) {
    const { root } = themeBrowser(options);
    assert.equal(root.dataset.theme, "dark");
    assert.equal(root.dataset.themePreference, "system");
  }
});

test("choosing a theme persists it and notifies all controls", () => {
  const { root, events, api, saved } = themeBrowser();
  api.chooseTheme("dark");
  assert.equal(saved(), "dark");
  assert.equal(root.dataset.theme, "dark");
  assert.equal(root.dataset.themePreference, "dark");
  assert.equal(root.style.colorScheme, "dark");
  assert.deepEqual(events, ["steven:themechange"]);
});

test("a choice still works for this visit when persistence is unavailable", () => {
  const { root, api } = themeBrowser({ blocked: true, dark: true });
  api.chooseTheme("light");
  assert.equal(root.dataset.theme, "light");
  assert.equal(root.dataset.themePreference, "light");
  assert.equal(api.getServerThemeSnapshot(), "light");
});
