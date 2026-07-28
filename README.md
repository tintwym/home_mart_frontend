# Home Mart Frontend (React + TypeScript)

Static SPA that deploys to **Vercel**. It talks to the Spring Boot backend on **Render**
via same-origin rewrites (see `vercel.json`), so cookies and auth work without
cross-origin complexity.

The UI pages still use the familiar Inertia-style API (`Link`, `router`,
`usePage`, `Form`, `useForm`). At build time Vite aliases `@inertiajs/react`
to `resources/js/lib/inertia`, a thin client that fetches
`{ component, props, url }` JSON from the Spring backend.

## Local development

1. Start the Spring Boot API on port **5199** (see `home_mart_backend/README.md`).
2. In this folder:

```bash
cp .env.example .env   # leave VITE_API_URL empty; add VITE_FIREBASE_* for Google/Apple
npm install
npm run dev            # http://localhost:3000
```

Vite proxies page + API routes to `http://localhost:5199`, so the browser
stays same-origin.

## Vercel deploy

1. Import the `home_mart_frontend` folder as a Vercel project.
2. Edit `vercel.json` and replace every
   `https://YOUR-RENDER-SERVICE.onrender.com` with your real Render URL.
3. Leave `VITE_API_URL` empty (rewrites keep requests same-origin).
4. Set Firebase web config env vars (below) if using Google/Apple sign-in.
5. Deploy.

## Environment

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Optional absolute API origin. Leave empty when using Vite proxy / Vercel rewrites. |
| `VITE_APP_NAME` | Browser title prefix (default `Home Mart`). |
| `VITE_FIREBASE_API_KEY` | Firebase web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | e.g. `your-project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project id |
| `VITE_FIREBASE_APP_ID` | Firebase web app id |

Google/Apple buttons call Firebase `signInWithPopup`, then `POST /auth/firebase` with the ID token so the backend can set the usual `hm_token` cookie.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server on :3000 |
| `npm run build` | Production bundle → `dist/` |
| `npm run preview` | Serve `dist/` locally |
| `npm run types` | TypeScript check |

## Safe to zip without Laravel

This folder has no runtime dependency on the `laravel/` directory. The
Wayfinder helpers under `resources/js/routes` and `resources/js/actions` are
committed TypeScript — they are just URL builders.
