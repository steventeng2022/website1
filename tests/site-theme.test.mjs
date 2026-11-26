import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("admin can switch the whole-site theme", async () => {
  const [layout, page, actions, database, themes] = await Promise.all([
    read("app/layout.tsx"), read("app/admin/page.tsx"), read("app/admin/actions.ts"), read("db/theme.ts"), read("app/themes.ts"),
  ]);
  assert.match(layout, /themeStyle\(themeSettings\.theme, themeSettings\.accent\)/);
  assert.match(layout, /data-site-theme=/);
  assert.match(page, /id: "theme"/);
  assert.match(page, /action=\{updateThemeAction\}/);
  assert.match(actions, /revalidatePath\("\/", "layout"\)/);
  assert.match(actions, /requireAdmin|auditedAdmin\("更換網站主題"/);
  assert.match(database, /CREATE TABLE IF NOT EXISTS site_theme/);
  assert.match(themes, /midnight/);
});

test("mario theme is animated, scoped, and has a runner with easter eggs", async () => {
  const [css, themes, layout, js] = await Promise.all([read("app/theme-mario.css"), read("app/themes.ts"), read("app/layout.tsx"), read("public/mario-world.js")]);
  assert.match(themes, /id: "mario"/);
  assert.match(layout, /theme-mario\.css/);
  assert.match(layout, /siteTheme\.id === "mario" && <script src="\/mario-world\.js/);
  assert.match(css, /@keyframes mario-clouds/);
  assert.match(css, /@keyframes mario-coin/);
  for (const line of css.split(/\r?\n/).filter(l => /\{\s*$/.test(l) && !/^(\s|@keyframes|@media|\.mw-)/.test(l))) assert.match(line, /^html\[data-site-theme="mario"\]/);
  // runner behaviour: autopilot, stomping, coins, flag, Konami star, reduced-motion
  for (const needle of [/function autopilot/, /stomp|P\.vy < 0 && P\.y > c\.h/, /KONAMI/, /fireworks/, /coinShower/, /prefers-reduced-motion/, /isOn\(\)/, /sessionStorage/]) assert.match(js, needle);
  assert.doesNotMatch(js, /\.(mp3|ogg|wav)/);
});
