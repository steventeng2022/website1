import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import * as jsxRuntime from "react/jsx-runtime";
import ts from "typescript";

// Exercise the actual components across rerenders, with controllable DOM refs.
async function component(file, props, globals = {}) {
  const slots = [];
  let cursor = 0;
  const hooks = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], value => { slots[index] = typeof value === "function" ? value(slots[index]) : value; }];
    },
    useRef(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
  };
  const source = await readFile(new URL(file, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const sandbox = {
    exports: {},
    requestAnimationFrame: callback => callback(),
    document: { querySelector() { throw new Error("An editor must never query another editor's DOM"); } },
    require(name) {
      if (name === "react") return hooks;
      if (name === "react/jsx-runtime") return jsxRuntime;
      if (name === "react-markdown" || name === "remark-gfm") return { default: () => null };
      throw new Error(`Unexpected import: ${name}`);
    },
    ...globals,
  };
  vm.createContext(sandbox);
  vm.runInContext(compiled, sandbox);
  return () => { cursor = 0; return sandbox.exports.default(props); };
}

function nodes(element) {
  if (!element || typeof element !== "object") return [];
  if (Array.isArray(element)) return element.flatMap(nodes);
  return [element, ...nodes(element.props?.children)];
}
function text(element) {
  if (typeof element === "string") return element;
  if (!element || typeof element !== "object") return "";
  if (Array.isArray(element)) return element.map(text).join("");
  return text(element.props?.children);
}
function button(tree, label) {
  const found = nodes(tree).find(node => node.type === "button" && text(node) === label);
  assert.ok(found, `button ${label} exists`);
  return found;
}
function payload(tree) {
  const form = new FormData();
  for (const { type, props } of nodes(tree)) {
    if ((type === "input" || type === "textarea") && props.name && !props.disabled) {
      form.append(props.name, props.value ?? props.defaultValue ?? "");
    }
  }
  return form;
}

test("blog body remains in the form payload when switching between write, split, and preview", async () => {
  const render = await component("../app/admin/markdown-editor.tsx", { defaultValue: "Original" });
  let tree = render();
  nodes(tree).find(node => node.type === "textarea").props.onChange({ target: { value: "# Edited\n\nBody & details" } });
  tree = render();
  for (const mode of ["預覽", "編輯", "分割", "預覽"]) {
    button(tree, mode).props.onClick();
    tree = render();
    assert.deepEqual(payload(tree).getAll("content"), ["# Edited\n\nBody & details"], mode);
    if (mode === "預覽") {
      assert.equal(nodes(tree).some(node => node.type === "textarea"), false);
      assert.equal(button(tree, "B").props.disabled, true);
    }
  }
});

test("formatting uses the selected editor's own cursor and restores its focus", async () => {
  const first = await component("../app/admin/markdown-editor.tsx", { defaultValue: "New draft" });
  const second = await component("../app/admin/markdown-editor.tsx", { defaultValue: "Second article" });
  const firstTree = first();
  const secondTree = second();
  let firstFocused = false;
  let secondFocused = false;
  let selection;
  nodes(firstTree).find(node => node.type === "textarea").props.ref.current = {
    selectionStart: 0, selectionEnd: 3, focus() { firstFocused = true; }, setSelectionRange() {},
  };
  nodes(secondTree).find(node => node.type === "textarea").props.ref.current = {
    selectionStart: 7, selectionEnd: 14,
    focus() { secondFocused = true; }, setSelectionRange(start, end) { selection = [start, end]; },
  };
  button(secondTree, "B").props.onClick();
  assert.equal(payload(first()).get("content"), "New draft");
  assert.equal(payload(second()).get("content"), "Second **article**");
  assert.equal(firstFocused, false);
  assert.equal(secondFocused, true);
  assert.deepEqual(selection, [9, 16]);
});

test("successful article save returns to the blog section with its confirmation", async () => {
  const redirects = [];
  const timers = [];
  const submissions = [];
  const render = await component("../app/admin/post-save-form.tsx", { mode: "update", children: null }, {
    FormData,
    fetch: async (url, options) => {
      submissions.push({ url, mode: options.body.get("saveMode") });
      return { ok: true, json: async () => ({ ok: true, message: "Saved" }) };
    },
    window: { setTimeout(callback) { timers.push(callback); }, location: { assign(url) { redirects.push(url); } } },
  });
  await render().props.onSubmit({ preventDefault() {}, currentTarget: undefined });
  assert.deepEqual(submissions, [{ url: "/admin/post-save", mode: "update" }]);
  assert.equal(render().props["aria-busy"], true);
  timers.forEach(callback => callback());
  assert.deepEqual(redirects, ["/admin?section=blog&saved=post"]);
});
