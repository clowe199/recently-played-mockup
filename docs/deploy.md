# Deploy

Pick a target. They all work — the project is a stock Next.js 15 app with no
exotic build steps.

## Vercel

The path of least resistance. Vercel made Next.js.

1. Push your fork to GitHub.
2. Go to <https://vercel.com/new> and import the repo.
3. Accept the defaults and click Deploy.

If you've wired up real data, add your env vars (e.g. `DATABASE_URL`,
`CRON_SECRET`, `LASTFM_API_KEY`) under **Settings → Environment Variables**
before the first deploy.

Custom domain: **Settings → Domains**. Vercel will issue and rotate the
TLS cert for free.

---

## Railway

Good fit if you also need Postgres on the same provider — it's one click in
the Railway dashboard.

1. <https://railway.app/new> → **Deploy from GitHub** → your fork.
2. Railway auto-detects Next.js. Accept the defaults.
3. Add env vars under **Variables**.
4. (Optional) Add a Postgres plugin and Railway will set `DATABASE_URL`
   automatically.

Custom domain: **Settings → Networking → Generate Domain**, then add your
own under **Custom Domain**.

---

## Fly.io

If you want it close to your users geographically and you're comfortable
with a `fly.toml`.

```bash
brew install flyctl
fly auth signup
cd recently-played-mockup
fly launch
```

`fly launch` writes a `fly.toml` for you and offers to deploy. The Next.js
buildpack is auto-detected. Set env vars with `fly secrets set
DATABASE_URL=...`.

---

## Docker

If you're hosting somewhere with no idea about Node and you just want a
container:

```dockerfile
# Dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS run
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
docker build -t recently-played .
docker run -p 3000:3000 --env-file .env recently-played
```

---

## Bare-metal Node (a VPS, a Pi, your gaming desktop)

```bash
git clone https://github.com/clowe199/recently-played-mockup
cd recently-played-mockup
npm install
npm run build
npm run start  # listens on $PORT or 3000
```

Run it under a process manager so it survives reboots. `systemd` works,
`pm2` works, `tmux` will technically work and we don't judge.

`systemd` example (`/etc/systemd/system/music.service`):

```ini
[Unit]
Description=Recently Played mockup
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/home/youruser/recently-played-mockup
Environment=PORT=3000
Environment=NODE_ENV=production
EnvironmentFile=/home/youruser/recently-played-mockup/.env
ExecStart=/usr/bin/npm run start
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now music
```

Front it with Caddy or nginx for TLS.

---

## A note on environment variables

The mockup itself needs zero env vars to run. The moment you wire up real
data (a database, an API key, a shared secret), you'll start needing them.
[`.env.example`](../.env.example) is the canonical list — copy it to `.env`
locally, and replicate the values in your deploy's secret store.

Never commit `.env`. It's already in `.gitignore`. Don't undo that.

---

## Custom domain

Wherever you deploy, the domain setup is roughly:

1. Add an `A` (or `CNAME`) DNS record pointing your domain at the deploy.
2. Add the domain in your provider's dashboard.
3. Wait for TLS to provision (seconds to a few minutes).

The `/music` path is what you'll be sharing. `your-domain.com/music` is the
URL the README keeps mentioning — that's the public-facing artifact.

---

## You're live

Go play a song so the timestamps look real and share the link.
