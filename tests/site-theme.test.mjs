import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("admin can switch the whole-site theme", async () => {
  const [layout, page, actions, database, themes, docLang] = await Promise.all([
    read("app/layout.tsx"), read("app/admin/page.tsx"), read("app/admin/actions.ts"), read("db/theme.ts"), read("app/themes.ts"), read("app/document-language.tsx"),
  ]);
  assert.match(layout, /themeStyle\(themeSettings\.theme, themeSettings\.accent\)/);
  assert.match(layout, /siteTheme=\{siteTheme\.id\}/);
  assert.match(docLang, /data-site-theme=/);
  assert.match(page, /id: "theme"/);
  assert.match(page, /action=\{updateThemeAction\}/);
  assert.match(actions, /revalidatePath\("\/", "layout"\)/);
  assert.match(actions, /requireAdmin|auditedAdmin\("?´æ?ç¶²ç?ä¸»é?"/);
  assert.match(database, /CREATE TABLE IF NOT EXISTS site_theme/);
  assert.match(themes, /midnight/);
});
