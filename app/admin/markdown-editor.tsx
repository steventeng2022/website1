"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function MarkdownEditor({ defaultValue = "" }: { defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue);
  const [mode, setMode] = useState<"split" | "write" | "preview">("split");

  function insert(before: string, after = "") {
    const textarea = document.querySelector<HTMLTextAreaElement>("textarea[data-active-markdown='true']:focus")
      ?? document.querySelector<HTMLTextAreaElement>("textarea[data-active-markdown='true']");
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end) || "文字";
    const next = value.slice(0, start) + before + selected + after + value.slice(end);
    setValue(next);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  }

  return <div className="markdown-editor">
    <div className="markdown-topbar">
      <div className="markdown-tools" aria-label="Markdown 工具列">
        <button type="button" onClick={() => insert("# ", "")}>H1</button>
        <button type="button" onClick={() => insert("## ", "")}>H2</button>
        <button type="button" onClick={() => insert("**", "**")}><b>B</b></button>
        <button type="button" onClick={() => insert("*", "*")}><i>I</i></button>
        <button type="button" onClick={() => insert("[", "](https://)")}>連結</button>
        <button type="button" onClick={() => insert("- ", "")}>清單</button>
        <button type="button" onClick={() => insert("```\n", "\n```")}>程式碼</button>
      </div>
      <div className="markdown-modes">
        <button type="button" className={mode === "write" ? "active" : ""} onClick={() => setMode("write")}>編輯</button>
        <button type="button" className={mode === "split" ? "active" : ""} onClick={() => setMode("split")}>分割</button>
        <button type="button" className={mode === "preview" ? "active" : ""} onClick={() => setMode("preview")}>預覽</button>
      </div>
    </div>
    <div className={`markdown-workspace mode-${mode}`}>
      {mode !== "preview" && <div className="markdown-pane markdown-write"><span>MARKDOWN</span><textarea data-active-markdown="true" required name="content" value={value} onChange={(event) => setValue(event.target.value)} rows={20} placeholder={'# 文章標題\n\n在這裡使用 Markdown 撰寫文章……\n\n## 小標題\n\n- 第一點\n- 第二點'}/></div>}
      {mode !== "write" && <div className="markdown-pane markdown-preview"><span>即時預覽</span><div className="markdown-body"><ReactMarkdown remarkPlugins={[remarkGfm]}>{value || "*預覽會顯示在這裡*"}</ReactMarkdown></div></div>}
    </div>
    <p className="markdown-hint">支援標題、粗體、斜體、連結、清單、表格、引用與程式碼區塊。</p>
  </div>;
}
