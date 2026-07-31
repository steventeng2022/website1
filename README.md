# Steven Website — Cloudflare Blog

Cloudflare Workers + D1 version of Steven's personal website. Public visitors can read published posts. The `/admin` writing studio is protected by Cloudflare Access and restricted to `steventeng2022@gmail.com`.

## 1. Create the D1 database

In Cloudflare Dashboard open **Storage & databases → D1 → Create database** and name it `steven-blog`. Copy its Database ID and replace `REPLACE_WITH_YOUR_D1_DATABASE_ID` in `wrangler.jsonc`.

The app creates the `posts` table automatically on first use.

## 2. Push this folder to GitHub

Replace the old files in `steventeng2022/website1`, then commit and push.

## 3. Connect GitHub to Cloudflare Workers

Open **Workers & Pages → Create application → Import a repository**, choose `steventeng2022/website1`, and use:

- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Root directory: `/`

If Cloudflare asks for a Node version, use Node.js 22.

## 4. Add your domain

In the deployed Worker, open **Settings → Domains & Routes → Add → Custom domain** and add `steventeng.uk`.

Remove old DNS records that pointed the domain at ChatGPT Sites if Cloudflare reports a conflict.

## 5. Protect `/admin` with Cloudflare Access

Open **Zero Trust → Access → Applications → Add an application → Self-hosted**.

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

To change the contact email, edit `app/page.tsx` and replace `hello@example.com`.
