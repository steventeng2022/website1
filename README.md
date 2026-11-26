# Steven's Website

An open-source personal website and writing studio that runs entirely on **Cloudflare Workers + D1 + R2**. Public visitors get a portfolio, an experience timeline, a friends page, a bilingual (繁體中文 / English) blog and a floating music player. The site owner gets a private `/admin` studio to manage everything, including the **site-wide theme**.

Live site: <https://steventeng.uk> · License: [MIT](LICENSE) · 繁體中文說明在[文末](#繁體中文簡介)

## Features

**Public site**
- Home, `/portfolio` (category filters), `/experience` timeline, `/friends`, `/blog` (search, tags, pagination)
- Bilingual pages (`?lang=en`), visitor light/dark mode, reduced-motion friendly animations
- Password-protected blog posts (salted scrypt hashes, 24-hour HttpOnly unlock cookie)
- Floating music player: site-wide tracks (R2) plus tracks visitors add in their own browser, and a song-recommendation form
- Live "what I'm doing" card from Discord / Spotify presence via the public Lanyard API (no Discord token stored)
- Privacy-minded analytics: page views and visitors counted with hashed anonymous browser IDs

**Admin studio (`/admin`)**
- Posts and tags with a Markdown editor, cover and gallery uploads (browser-side compression, streamed to R2)
- Portfolio projects, About/Skills/Contact content, experience timeline, friends list
- Music library and song-request inbox, Discord status settings
- Site status: traffic, uptime, visitor and admin activity logs
- **Site themes**: switch the whole site between 7 presets (Classic, Midnight, Ocean, Forest, Sunset, Rose, Mono) and an animated retro platformer-style theme, with an optional custom accent color

## Tech stack

Next.js 16 (App Router) on [vinext](https://github.com/cloudflare/vinext) · React 19 · Tailwind CSS 4 · Cloudflare Workers, D1 (SQLite), R2, Images · Drizzle ORM · Cloudflare Access for admin sign-in · Node.js test runner

## Quick start

Requirements: **Node.js ≥ 22.13** and a Cloudflare account (free plan is enough).

```bash
git clone https://github.com/steventeng2022/website1.git
cd website1
npm ci
npm run dev        # local dev server at http://localhost:5173
```

Local dev uses Miniflare, so D1 and R2 work without a Cloudflare account. If the dev server refuses to start with a message about the compatibility date, update `wrangler` (`npm i -D wrangler@latest`) or temporarily lower `compatibility_date` in `wrangler.jsonc`.

Useful scripts:

```bash
npm run build      # production build
npm test           # build + rendered HTML checks
npm run lint
```

The full unit-style suite lives in `tests/` and runs with Node's built-in runner:

```bash
node --test tests/*.test.mjs
```

> `/admin` requires a Cloudflare Access login, so it is not reachable on a plain local dev server. See [Admin access](#admin-access).

## Make it yours (read before deploying)

This repository is the author's real site, so a few things are personal. Change them before you deploy your own copy:

1. **Admin email.** Hard-coded in two places; set both to your address:
   - `app/cloudflare-auth.ts` (`ADMIN_EMAIL`)
   - `worker/index.ts` (`ADMIN_EMAIL`)
2. **Cloudflare resources in `wrangler.jsonc`.** Replace `database_id`, `database_name` and the R2 `bucket_name` with your own.
3. **Content and defaults.** `db/site-content.ts` seeds the About / Skills / Contact text and contact links, and `app/layout.tsx` has the page title and description. Replace them with yours.
4. **Personal images and branding.** `public/steven-drawing.png`, `public/flower.*`, the icons and `favicon.svg` belong to the author (see [Licensing](#licensing)). Swap in your own.
5. **Analytics.** `app/layout.tsx` loads a Google Tag Manager container (`GTM-P4HZ4DZ5`) on public pages. Remove it or replace the ID with yours, and update the privacy notice in `app/public-site-status.tsx` accordingly.

## Deploy to Cloudflare

1. **Create the D1 database** (Storage & databases → D1) and put its ID in `wrangler.jsonc`. Tables are created and migrated automatically on first use; the SQL in `drizzle/` documents the schema.
2. **Create an R2 bucket** for images and audio and match its name in `wrangler.jsonc`. JPG/PNG/WebP up to 80 MB are compressed in the browser to ≤ 8 MB (up to A4 at 300 DPI); GIF up to 20 MB.
3. **Push to GitHub and connect Workers Builds** (Workers & Pages → Create → Import a repository):
   - Build command: `npm run build`
   - Deploy command: `npx wrangler deploy`
   - Node version: 22
4. **Add your domain** under the Worker's Settings → Domains & Routes.

Or deploy from your machine: `npm run build && npx wrangler deploy`.

### Admin access

`/admin` is protected by **Cloudflare Access**; the app trusts the verified email header Cloudflare adds and rejects everyone except `ADMIN_EMAIL`.

1. Zero Trust → Access → Applications → Add → Self-hosted
2. Application domain: your domain, path: `/admin*`
3. Policy: Allow → Emails → your address; login method: One-time PIN

Never expose `/admin` without this Access rule.

## Themes

Themes are defined in `app/themes.ts` (colors as CSS variables applied on `<html>`), stored in D1 (`site_theme`) and changed from **Admin → 網站主題**. The visitor light/dark toggle works with the Classic theme; every other theme fixes its own scheme. The retro platformer theme adds its own stylesheet (`app/theme-mario.css`) and a small script (`public/mario-world.js`) that is only loaded when that theme is active; all of its pixel art is original and drawn in code.

To add a theme, append an entry to `THEMES` in `app/themes.ts`. For extra styling, scope CSS to `html[data-site-theme="your-id"]`.

## Project structure

```
app/        Next.js routes, components and CSS (public pages, /admin, API routes)
db/         D1 access modules (one per feature); schema is created lazily
drizzle/    SQL migrations documenting the schema
worker/     Cloudflare Worker entry: uploads, media streaming, image resizing
public/     Static assets and the music player / theme scripts
tests/      node:test suites (rendering, admin, uploads, themes, analytics, ...)
```

## Contributing

Issues and pull requests are welcome.

- Keep changes focused and match the surrounding style (TypeScript, small modules, no new runtime dependencies without a reason)
- Run `npx tsc --noEmit` and `node --test tests/*.test.mjs` before opening a PR
- For UI changes, include screenshots in the PR description
- Do not commit secrets, real visitor data or personal content

Please report security issues privately via the contact below instead of a public issue.

## Licensing

- **Code** is released under the [MIT License](LICENSE).
- **Personal content is not covered by the MIT License**: the author's photos, drawings, logo/icons, text content, blog posts and any uploaded media remain the author's and may not be reused without permission. Replace them in your own fork.
- Third-party fonts (Geist, Press Start 2P) are used under their own open licenses via Google Fonts.
- The retro platformer theme is an original homage; it contains no Nintendo artwork, logos or audio. Do not add trademarked sprites or sounds.

## Contact

Steven: <steventeng2022@gmail.com> · Discord `steven0925`

---

## 繁體中文簡介

這是 Steven 的個人網站與寫作後台，完全運行在 **Cloudflare Workers + D1 + R2** 上，程式碼以 **MIT 授權開源**。

- **前台**：首頁、作品集、經歷時間軸、Friends、雙語 Blog（搜尋、標籤、分頁、文章密碼鎖）、浮動音樂播放器、Discord 即時狀態卡
- **後台 `/admin`**（由 Cloudflare Access 保護）：管理文章、作品、經歷、音樂、Discord 狀態、網站流量與紀錄，並可**一鍵更換整個網站的主題**
- **自行部署**：需 Node.js 22.13 以上與 Cloudflare 帳號。請先閱讀上方「Make it yours」，把管理員 Email、`wrangler.jsonc` 的資源、個人內容與圖片、GTM 換成自己的
- **授權注意**：程式碼為 MIT；作者的照片、插圖、Logo、文章與文字內容不在授權範圍內，請在你的 fork 中替換

歡迎提出 Issue 或 Pull Request。
