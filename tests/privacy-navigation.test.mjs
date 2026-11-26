import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = await readFile(new URL("../app/public-site-status.tsx", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

function dialogHarness() {
  let pathname = "/";
  let query = "lang=en";
  let cursor = 0;
  let dirty = false;
  let pending = [];
  let output;
  const hooks = [];
  const listeners = new Map();
  const document = { body: { style: { overflow: "clip" } }, activeElement: null,
    addEventListener: (name, listener) => listeners.set(name, listener),
    removeEventListener: name => listeners.delete(name),
  };
  class Element {
    isConnected = true;
    focusCount = 0;
    focus() { this.focusCount++; document.activeElement = this; }
    querySelectorAll() { return []; }
  }
  const opener = new Element();
  document.activeElement = opener;
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in hooks)) hooks[index] = initial;
      return [hooks[index], value => {
        if (!Object.is(hooks[index], value)) { hooks[index] = value; dirty = true; }
      }];
    },
    useRef(initial) { const index = cursor++; return hooks[index] ??= { current: initial }; },
    useEffect(effect, deps) {
      const index = cursor++;
      const previous = hooks[index];
      if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) {
        hooks[index] = { deps, cleanup: previous?.cleanup };
        pending.push(() => { hooks[index].cleanup?.(); hooks[index].cleanup = effect(); });
      }
    },
  };
  const sandbox = { exports: {}, document, HTMLElement: Element,
    require(name) {
      if (name === "react") return react;
      if (name === "next/navigation") return { usePathname: () => pathname, useSearchParams: () => new URLSearchParams(query) };
      if (name === "./site-uptime") return { default: () => null };
      return require(name);
    },
  };
  vm.runInNewContext(compiled, sandbox);
  function visit(node, callback) {
    if (Array.isArray(node)) return node.forEach(child => visit(child, callback));
    if (!node?.props) return;
    callback(node);
    visit(node.props.children, callback);
  }
  function render() {
    do {
      dirty = false;
      cursor = 0;
      pending = [];
      output = sandbox.exports.default();
      visit(output, node => { if (node.props.ref) node.props.ref.current ??= new Element(); });
      pending.forEach(effect => effect());
    } while (dirty);
  }
  function hasDialog() {
    let found = false;
    visit(output, node => { if (node.props.role === "dialog") found = true; });
    return found;
  }
  render();
  return { document, opener, listeners, hasDialog,
    open() {
      visit(output, node => { if (node.props["aria-haspopup"] === "dialog") node.props.onClick(); });
      render();
    },
    navigate(path, search = "lang=en") { pathname = path; query = search; render(); },
  };
}

test("navigation closes the privacy dialog, restores scrolling, and does not reopen on Back", () => {
  for (const [pathname, query] of [["/portfolio", "lang=en"], ["/admin", "lang=en"], ["/", "lang=zh"]]) {
    const scene = dialogHarness();
    scene.open();
    assert.equal(scene.hasDialog(), true);
    assert.equal(scene.document.body.style.overflow, "hidden");
    assert.equal(scene.listeners.size, 1);
    scene.navigate(pathname, query);
    assert.equal(scene.hasDialog(), false);
    assert.equal(scene.document.body.style.overflow, "clip");
    assert.equal(scene.listeners.size, 0);
    assert.equal(scene.opener.focusCount, 1);
    scene.navigate("/", "lang=en");
    assert.equal(scene.hasDialog(), false);
    assert.equal(scene.document.body.style.overflow, "clip");
  }
});

test("navigation does not focus an opener removed with the old page", () => {
  const scene = dialogHarness();
  scene.open();
  scene.opener.isConnected = false;
  scene.navigate("/admin");
  assert.equal(scene.opener.focusCount, 0);
  assert.equal(scene.document.body.style.overflow, "clip");
  assert.equal(scene.listeners.size, 0);
});
