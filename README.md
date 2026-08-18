# Steven Website — Cloudflare Blog

## v34 — Discord 即時狀態

- 首頁新增「現在正在做什麼」狀態卡，每 30 秒更新
- 顯示順序：Discord 自訂狀態 → Spotify → 一般活動 → 後台預設文字
- 後台「Discord 狀態」可設定 User ID、中英文預設狀態及活動顯示選項
- 帳號離線、沒有活動或 Presence API 無法讀取時，自動顯示預設文字
- 使用公開 Presence 服務，不需要也不應保存 Discord token

第一次使用時，請在 Discord 開啟開發者模式並複製自己的 User ID，再於後台貼上。帳號需加入 Lanyard Discord server，Presence API 才能讀取公開狀態。

## v30

- 後台新增「網站狀態」分頁：總瀏覽、今日瀏覽、匿名獨立訪客、目前在線與 Blog 閱讀量
- 顯示最近 7 天流量、熱門頁面及最近 50 筆管理員操作紀錄
- 網站上線時間會以天、時、分、秒即時更新
- 訪客統計只使用隨機匿名瀏覽器代碼的 SHA-256 雜湊，不保存 IP

Cloudflare Workers + D1 version of Steven's personal website. Public visitors can browse the dedicated `/portfolio`, experience timeline, and published posts. The `/admin` writing studio is protected by Cloudflare Access and restricted to `steventeng2022@gmail.com`.

## Blog password locks

Each published post can optionally be password protected from the admin editor. Passwords are salted and hashed with Cloudflare-compatible scrypt before storage, while old PBKDF2 hashes remain readable. A successful unlock is kept in an HttpOnly, Secure, SameSite cookie for 24 hours and is invalidated automatically when the post password changes.

## Floating music player

The global bottom-left player supports site-wide tracks managed in `/admin` plus device-local tracks added by each visitor. Admin audio is stored in R2 with metadata in D1 and appears for everyone; visitor tracks stay in that visitor's browser. The player also includes a song recommendation form whose submissions appear in the admin inbox. No third-party demo music is included; upload only audio you own or have permission to use.

## Portfolio

The homepage shows featured projects beneath About Me, while `/portfolio` presents the complete collection with category filters. Projects appear as one horizontal rectangle per row: image on the left, title and description on the right, and tags in the bottom-right corner. The whole card opens the first available destination in this order: live link, GitHub link, then related Blog post. Each project can include a bilingual description, cover image, technology tags, completion date, live link, GitHub link, and a related Blog post. Sign in to `/admin` to add, edit, delete, feature, or reorder projects. Existing projects are upgraded automatically without deleting their content.

## 1. Create the D1 database

In Cloudflare Dashboard open **Storage & databases → D1 → Create database** and name it `steven-blog`. Copy its Database ID and replace `REPLACE_WITH_YOUR_D1_DATABASE_ID` in `wrangler.jsonc`.

The app creates the `posts` table automatically on first use.

## 2. Create image storage

In Cloudflare Dashboard open **Storage & databases → R2 object storage → Create bucket** and name it `steven-blog-images`.

The `BUCKET` binding is already included in `wrangler.jsonc`. The Blog editor accepts a cover photo and a multi-photo gallery. JPG, PNG and WebP source files can be up to 80 MB and are compressed in the browser to an 8 MB upload while retaining up to A4 at 300 DPI (2480×3508 px). GIF files can be up to 20 MB. Uploads use a raw Worker request that streams directly into R2, so they do not pass through the app router's multipart parser. Photos are stored in R2 and will not disappear after a GitHub deployment.

## 3. Push this folder to GitHub

Replace the old files in `steventeng2022/website1`, then commit and push.

## 4. Connect GitHub to Cloudflare Workers

Open **Workers & Pages → Create application → Import a repository**, choose `steventeng2022/website1`, and use:

- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Root directory: `/`

If Cloudflare asks for a Node version, use Node.js 22.

## 5. Add your domain

In the deployed Worker, open **Settings → Domains & Routes → Add → Custom domain** and add `steventeng.uk`.

Remove old DNS records that pointed the domain at ChatGPT Sites if Cloudflare reports a conflict.

## 6. Protect `/admin` with Cloudflare Access

Open **Zero Trust → Access → Applications → Add an application → Self-hosted**. Protect `/admin/*` so the editor and its image-upload endpoint receive the same verified identity.

- Application domain: `steventeng.uk`
- Path: `/admin*`
- Policy action: Allow
- Include: Emails → `steventeng2022@gmail.com`
- Login method: One-time PIN

Cloudflare Access adds the verified email header checked by the server. Do not expose `/admin` without this Access rule.

## Local verification

```bash
npm install
npm run build
```

The public contact details are `steventeng2022@gmail.com` and Discord `steven0925`.
