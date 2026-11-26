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

test("mario theme is animated and scoped", async () => {
  const [css, themes, layout] = await Promise.all([read("app/theme-mario.css"), read("app/themes.ts"), read("app/layout.tsx")]);
  assert.match(themes, /id: "mario"/);
  assert.match(layout, /theme-mario\.css/);
  assert.match(css, /@keyframes mario-clouds/);
  assert.match(css, /@keyframes mario-coin/);
  for (const line of css.split(/[data-site-theme="mario"]?\n/).filter(l => /\{\s*$/.test(l) && !/@keyframes|^\s/.test(l))) assert.match(line, /^html\[data-site-theme="mario"\]/);
});
