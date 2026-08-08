# Steven Website — Cloudflare Blog

Cloudflare Workers + D1 version of Steven's personal website. Public visitors can browse the dedicated `/portfolio`, experience timeline, and published posts. The `/admin` writing studio is protected by Cloudflare Access and restricted to `steventeng2022@gmail.com`.

## Blog password locks

Each published post can optionally be password protected from the admin editor. Passwords are salted and hashed with PBKDF2-SHA-256 before storage. A successful unlock is kept in an HttpOnly, Secure, SameSite cookie for 24 hours and is invalidated automatically when the post password changes.

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
