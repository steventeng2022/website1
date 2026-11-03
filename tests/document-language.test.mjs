import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = await readFile(new URL("../app/document-language.tsx", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

function renderDocument(query, pathname = "/") {
  const sandbox = {
    exports: {},
    require(name) {
      if (name === "next/navigation") return { usePathname: () => pathname, useSearchParams: () => new URLSearchParams(query) };
      return require(name);
    },
  };
  vm.runInNewContext(compiled, sandbox);
  return renderToStaticMarkup(React.createElement(sandbox.exports.default, {},
    React.createElement("head", {}, React.createElement("title", {}, "Steven")),
    React.createElement("body", {}, React.createElement("main", {}, "Public content")),
  ));
}

test("English document declares its language in HTML before hydration", () => {
  const html = renderDocument("lang=en");
  assert.match(html, /<html lang="en">/);
  assert.match(html, /<head><title>Steven<\/title><\/head>/);
  assert.match(html, /<body><main>Public content<\/main><\/body>/);
});

test("Chinese remains the default and unrelated query parameters preserve English", () => {
  for (const query of ["", "tag=hardware", "lang=other"]) assert.match(renderDocument(query), /<html lang="zh-Hant-TW">/);
  assert.match(renderDocument("tag=hardware&lang=en&category=Arduino"), /<html lang="en">/);
});

test("the Chinese admin interface does not inherit a public language query", () => {
  for (const pathname of ["/admin", "/admin/posts/12"]) assert.match(renderDocument("lang=en", pathname), /<html lang="zh-Hant-TW">/);
  assert.match(renderDocument("lang=en", "/portfolio"), /<html lang="en">/);
});
