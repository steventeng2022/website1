"use client";

import { useState } from "react";

type ExistingPassword = { id: number; label: string; created_at: number };
type NewPassword = { key: number; label: string; password: string };

export default function BlogPasswordField({ existing = [] }: { existing?: ExistingPassword[] }) {
  const [nextKey, setNextKey] = useState(2);
  const [items, setItems] = useState<NewPassword[]>([{ key: 1, label: "", password: "" }]);

  function update(key: number, field: "label" | "password", value: string) {
    setItems((current) => current.map((item) => item.key === key ? { ...item, [field]: value } : item));
  }

  function add() {
    if (items.length >= 20) return;
    setItems((current) => [...current, { key: nextKey, label: "", password: "" }]);
    setNextKey((value) => value + 1);
  }

  function remove(key: number) {
    setItems((current) => current.length === 1 ? [{ key: nextKey, label: "", password: "" }] : current.filter((item) => item.key !== key));
    if (items.length === 1) setNextKey((value) => value + 1);
  }

  const pending = items.filter((item) => item.password.length > 0).map(({ label, password }) => ({ label, password }));

  return <fieldset className="lock-field">
    <legend>文章密碼鎖（可設定多組）</legend>
    <input type="hidden" name="newBlogPasswords" value={JSON.stringify(pending)}/>
    {existing.length > 0 && <div className="existing-passwords">
      <strong>目前已設定 {existing.length} 組密碼</strong>
      <p>基於安全考量，已儲存的密碼不會顯示。勾選後儲存即可移除。</p>
      {existing.map((item, index) => <label className="remove-lock" key={item.id}>
        <input type="checkbox" name="removeBlogPasswordIds" value={item.id}/>
        <span>移除「{item.label || `密碼 ${index + 1}`}」</span>
      </label>)}
    </div>}
    <div className="new-password-list">
      <strong>新增可用密碼</strong>
      <p>每一列是一組獨立密碼；訪客輸入其中任何一組都能解鎖。</p>
      {items.map((item, index) => <div className="password-row" key={item.key}>
        <label>辨識名稱（選填）<input value={item.label} onChange={(event) => update(item.key, "label", event.target.value)} maxLength={40} placeholder={`例如：朋友 ${index + 1}`}/></label>
        <label>密碼<input value={item.password} onChange={(event) => update(item.key, "password", event.target.value)} type="password" minLength={4} maxLength={128} autoComplete="new-password" placeholder={index === 0 ? "例如：1234" : "例如：abcd"}/></label>
        <button className="secondary-button password-remove-button" type="button" onClick={() => remove(item.key)}>移除此列</button>
      </div>)}
    </div>
    <button className="visibility-button add-password-button" type="button" onClick={add} disabled={items.length >= 20}>＋ 新增另一組密碼</button>
    <small>每組 4～128 個字元，最多 20 組。密碼只會以加鹽雜湊儲存，解鎖權限保留 24 小時。</small>
  </fieldset>;
}
