import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = await readFile(new URL("../app/site-motion.tsx", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

function browser({ path = "/", allowed = true } = {}) {
  const makeEvents = () => {
    const listeners = new Map();
    return { listeners, addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: name => listeners.delete(name), fire: (name, event = {}) => listeners.get(name)?.(event) };
  };
  const document = { ...makeEvents(), hidden: false, querySelector: () => null, documentElement: { toggleAttribute() {}, removeAttribute() {} } };
  const media = { ...makeEvents(), matches: allowed };
  const window = { ...makeEvents(), matchMedia: () => media };
  const frames = new Map();
  let nextFrame = 0;
  let cleanup;
  class Surface {
    attributes = new Map();
    properties = new Map();
    style = { setProperty: (key, value) => this.properties.set(key, value), removeProperty: key => this.properties.delete(key) };
    classList = { contains: name => name === "character-stage" };
    closest() { return this; }
    contains(node) { return node === this; }
    getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 200 }; }
    setAttribute(key, value) { this.attributes.set(key, value); }
    removeAttribute(key) { this.attributes.delete(key); }
  }
  const sandbox = {
    exports: {}, document, window, Element: Surface, Node: Surface,
    requestAnimationFrame: fn => { frames.set(++nextFrame, fn); return nextFrame; },
    cancelAnimationFrame: id => frames.delete(id),
    require(name) {
      if (name === "react") return { useEffect: effect => { cleanup = effect(); } };
      if (name === "next/navigation") return { usePathname: () => path, useSearchParams: () => new URLSearchParams() };
      throw new Error(`Unexpected import ${name}`);
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(compiled, sandbox);
  sandbox.exports.default();
  const surface = new Surface();
  return { document, window, media, frames, surface, cleanup: () => cleanup?.(), move: (x, y, pointerType = "mouse") => document.fire("pointermove", { target: surface, clientX: x, clientY: y, pointerType }), paint: () => { const ready = [...frames.values()]; frames.clear(); ready.forEach(fn => fn()); } };
}

test("3D pointer updates coalesce to one frame and do not run while idle", () => {
  const scene = browser();
  scene.move(0, 0);
  scene.move(150, -10);
  assert.equal(scene.frames.size, 1);
  scene.paint();
  assert.equal(scene.surface.properties.get("--tilt-x"), "3.50deg");
  assert.equal(scene.surface.properties.get("--tilt-y"), "3.50deg");
  assert.equal(scene.frames.size, 0);
  scene.cleanup();
});

test("touch, reduced-motion, and admin routes do not schedule 3D updates", () => {
  const touch = browser();
  touch.move(20, 20, "touch");
  assert.equal(touch.frames.size, 0);
  touch.cleanup();
  const reduced = browser({ allowed: false });
  reduced.move(20, 20);
  assert.equal(reduced.frames.size, 0);
  reduced.cleanup();
  const admin = browser({ path: "/admin" });
  assert.equal(admin.document.listeners.size, 0);
  assert.equal(admin.window.listeners.size, 0);
});

test("scrolling, backgrounding, and unmount cancel pending work and reset depth", () => {
  const scene = browser();
  scene.move(15, 50);
  scene.window.fire("scroll");
  assert.equal(scene.frames.size, 0);
  assert.equal(scene.surface.attributes.size, 0);
  scene.move(60, 25);
  scene.paint();
  assert.ok(scene.surface.properties.size > 0);
  scene.document.hidden = true;
  scene.document.fire("visibilitychange");
  assert.equal(scene.surface.properties.size, 0);
  scene.cleanup();
  assert.equal(scene.document.listeners.size, 0);
  assert.equal(scene.window.listeners.size, 0);
  assert.equal(scene.media.listeners.size, 0);
});
